#!/usr/bin/env node
/**
 * Hephaestus — OpenAPI / Swagger → Collection  v4.0.0
 *
 * Reads an OpenAPI 3.x or Swagger 2.0 spec (JSON, or a common subset of YAML —
 * zero dependencies) and generates a Hephaestus-style Postman collection: one
 * request per operation, grouped by tag, with a Test-script `override` that
 * pre-fills expectedStatus (from the documented 2xx responses) and schema (the
 * JSON response schema, with $ref inlined).
 *
 * Usage:
 *   node scripts/openapi-import.js <openapi.yaml|json> [-o collection.json] [--name "..."]
 *
 * --negative also generates negative tests, but only for the cases the spec lets
 * us actually trigger: withheld auth, a substituted id, an emptied required body,
 * a dropped required query parameter. See negativeCases() for why 405 is absent.
 *
 * YAML support is a pragmatic subset (block mappings/sequences incl. same-indent,
 * block scalars |/>, inline [a,b] / {a:b}); anchors/aliases and multi-doc are not
 * supported — for those, convert to JSON first.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Minimal YAML/JSON parser (zero-dep) ────────────────────────────────────────

function unquote(s) {
    s = s.trim();
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) return s.slice(1, -1);
    return s;
}

// Strip a trailing ` #…` comment from a VALUE (whole-line comments are dropped earlier).
function stripComment(s) {
    if (s[0] === '"' || s[0] === "'") {
        const end = s.indexOf(s[0], 1);
        return end !== -1 ? s.slice(0, end + 1) : s;
    }
    const h = s.indexOf(' #');
    return (h !== -1 ? s.slice(0, h) : s).trim();
}

function scalar(s) {
    s = s.trim();
    if (s === '' || s === '~' || s === 'null') return null;
    if (s === 'true')  return true;
    if (s === 'false') return false;
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) return s.slice(1, -1);
    if (s[0] === '[' || s[0] === '{') return parseFlow(s);
    if (/^-?\d+$/.test(s))      return parseInt(s, 10);
    if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
    return s;
}

function flowSplit(s) {
    const out = []; let depth = 0, inS = false, inD = false, cur = '';
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        if (!inS && !inD) {
            if (ch === '[' || ch === '{') depth++;
            else if (ch === ']' || ch === '}') depth--;
            else if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
        }
        cur += ch;
    }
    if (cur.trim() !== '') out.push(cur);
    return out;
}

function parseFlow(s) {
    s = s.trim();
    if (s[0] === '[') {
        const inner = s.slice(1, -1).trim();
        return inner === '' ? [] : flowSplit(inner).map(function(x) { return scalar(x); });
    }
    if (s[0] === '{') {
        const inner = s.slice(1, -1).trim();
        const obj = {};
        if (inner !== '') flowSplit(inner).forEach(function(pair) {
            const ci = pair.indexOf(':');
            if (ci === -1) return;
            obj[String(scalar(pair.slice(0, ci)))] = scalar(pair.slice(ci + 1));
        });
        return obj;
    }
    return scalar(s);
}

// Find the key/value colon in a mapping line, skipping colons inside quotes/flow.
function splitColon(t) {
    let inS = false, inD = false, depth = 0;
    for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        else if (!inS && !inD) {
            if (ch === '[' || ch === '{') depth++;
            else if (ch === ']' || ch === '}') depth--;
            else if (ch === ':' && depth === 0 && (i + 1 >= t.length || t[i + 1] === ' ')) return i;
        }
    }
    return -1;
}

function parseYaml(src) {
    const lines = src.replace(/^﻿/, '').split(/\r?\n/).map(function(l) { return l.replace(/\t/g, '  '); });
    let i = 0;
    const indentOf = function(l) { return l.match(/^ */)[0].length; };
    const isBlank  = function(l) { const t = l.trim(); return t === '' || t[0] === '#'; };
    function skipBlank() { while (i < lines.length && isBlank(lines[i])) i++; }

    function parseBlockScalar(parentIndent, folded) {
        const out = []; let base = null;
        while (i < lines.length) {
            if (lines[i].trim() === '') { out.push(''); i++; continue; }
            const ind = indentOf(lines[i]);
            if (ind <= parentIndent) break;
            if (base === null) base = ind;
            out.push(lines[i].slice(base));
            i++;
        }
        while (out.length && out[out.length - 1] === '') out.pop();
        return folded ? out.join(' ').trim() : out.join('\n');
    }

    function parse(indent) {
        skipBlank();
        if (i >= lines.length) return null;
        const t = lines[i].trim();
        return (t === '-' || t.slice(0, 2) === '- ') ? parseArray(indent) : parseObject(indent);
    }

    function parseObject(indent) {
        const obj = {};
        while (true) {
            skipBlank();
            if (i >= lines.length) break;
            const ind = indentOf(lines[i]);
            if (ind < indent || ind > indent) break;
            const t  = lines[i].trim();
            const ci = splitColon(t);
            if (ci === -1) break;
            const key    = unquote(t.slice(0, ci).trim());
            let   valStr = t.slice(ci + 1).trim();
            i++;
            if (/^[|>][+-]?$/.test(valStr)) {
                obj[key] = parseBlockScalar(ind, valStr[0] === '>');
            } else if (valStr === '') {
                skipBlank();
                if (i < lines.length) {
                    const childInd = indentOf(lines[i]);
                    const childT   = lines[i].trim();
                    const isSeq    = childT === '-' || childT.slice(0, 2) === '- ';
                    if (isSeq && childInd === ind)      obj[key] = parseArray(ind);       // same-indent list
                    else if (childInd > ind)            obj[key] = parse(childInd);
                    else                                obj[key] = null;
                } else obj[key] = null;
            } else {
                obj[key] = scalar(stripComment(valStr));
            }
        }
        return obj;
    }

    function parseArray(indent) {
        const arr = [];
        while (true) {
            skipBlank();
            if (i >= lines.length) break;
            const line = lines[i];
            const ind  = indentOf(line);
            if (ind < indent || ind > indent) break;
            const t = line.trim();
            if (!(t === '-' || t.slice(0, 2) === '- ')) break;
            const rest = t === '-' ? '' : t.slice(2).trim();
            i++;
            if (rest === '') {
                skipBlank();
                arr.push((i < lines.length && indentOf(lines[i]) > ind) ? parse(indentOf(lines[i])) : null);
            } else if (splitColon(rest) !== -1) {
                // "- key: value" → object whose keys sit at the column where `rest` starts
                const dashPos = line.indexOf('-', ind);
                const keyCol  = line.indexOf(rest[0], dashPos + 1);
                lines.splice(i, 0, ' '.repeat(keyCol) + rest);
                arr.push(parseObject(keyCol));
            } else {
                arr.push(scalar(stripComment(rest)));
            }
        }
        return arr;
    }

    skipBlank();
    return i < lines.length ? parse(indentOf(lines[i])) : {};
}

function parseSpec(src) {
    const t = src.replace(/^﻿/, '').trim();
    if (t[0] === '{') {
        try { return JSON.parse(t); } catch (e) { return parseYaml(src); }   // maybe flow-YAML
    }
    return parseYaml(src);
}

// ─── $ref resolution (inline) ───────────────────────────────────────────────────

let refWarnings = 0;
function resolveRefs(node, root, seen) {
    seen = seen || [];
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(function(n) { return resolveRefs(n, root, seen); });
    if (typeof node.$ref === 'string') {
        const ref = node.$ref;
        if (ref[0] !== '#') { refWarnings++; console.warn('⚠️  external/relative $ref left unresolved: ' + ref); return node; }
        if (seen.indexOf(ref) !== -1) return {};                              // cycle guard
        let target = root;
        const parts = ref.slice(2).split('/');
        for (let k = 0; k < parts.length && target !== undefined; k++) {
            let key = parts[k].replace(/~1/g, '/').replace(/~0/g, '~');
            try { key = decodeURIComponent(key); } catch (e) { /* keep raw */ }
            target = target[key];
        }
        if (target === undefined) { refWarnings++; console.warn('⚠️  unresolved $ref (missing): ' + ref); return {}; }
        return resolveRefs(target, root, seen.concat(ref));
    }
    const out = {};
    Object.keys(node).forEach(function(k) { out[k] = resolveRefs(node[k], root, seen); });
    return out;
}

// ─── OpenAPI → collection ───────────────────────────────────────────────────────

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

function is2xx(code) { return /^2(\d\d|xx)$/i.test(code); }

function successStatuses(responses) {
    const codes = Object.keys(responses || {}).filter(function(c) { return /^2\d\d$/.test(c); }).map(Number);
    return codes.length ? codes : [200];
}

function responseSchema(responses) {
    const okKey = Object.keys(responses).find(is2xx);
    if (!okKey) return null;
    const r = responses[okKey] || {};
    if (r.content) {
        // OpenAPI 3: prefer application/json; skip non-JSON media types
        const jsonKey = Object.keys(r.content).find(function(m) { return /json/i.test(m); });
        return jsonKey ? (r.content[jsonKey].schema || null) : null;
    }
    return r.schema || null;   // Swagger 2
}

function expandServerVars(server) {
    let url = (server && server.url) || '';
    const vars = (server && server.variables) || {};
    return url.replace(/\{(\w+)\}/g, function(m, v) {
        return (vars[v] && vars[v].default !== undefined) ? String(vars[v].default) : m;
    });
}

function toPostmanPath(p) { return p.replace(/\{([^}]+)\}/g, ':$1'); }

function queryParams(params) {
    return (params || [])
        .filter(function(pr) { return pr && pr.in === 'query'; })
        .map(function(pr) { return { key: pr.name, value: '', description: (pr.required ? '(required) ' : '') + (pr.description || '') }; });
}

function scriptExec(overrideObj, evalTarget) {
    return [
        'const override = ' + JSON.stringify(overrideObj, null, 4) + ';',
        '',
        'eval(pm.collectionVariables.get("' + evalTarget + '"));'
    ];
}

// ─── Negative cases ───────────────────────────────────────────────────────────
//
// Only cases the spec gives us enough to actually TRIGGER are generated. A spec
// declaring a 400 does not say what makes the request invalid, so "expect 400"
// on the happy-path request would be a test that fails against a correct API.
// The four below are triggered by something we control: withholding auth,
// substituting an id, emptying a required body, dropping a required parameter.
//
// 405 is deliberately absent — plenty of correct APIs answer an undeclared
// method with 404, so those tests would fail on working servers.

const BOGUS_ID = 'hephaestus-no-such-id';

// Prefer what the spec declares; fall back to the conventional codes. The caller
// marks fallbacks in the description so nobody mistakes a guess for a contract.
function declaredOr(responses, wanted, fallback) {
    const declared = Object.keys(responses || {})
        .filter(function(c) { return wanted.indexOf(Number(c)) !== -1; })
        .map(Number);
    return declared.length ? { statuses: declared, declared: true } : { statuses: fallback, declared: false };
}

function requiredQueryParams(params) {
    return (params || []).filter(function(pr) { return pr && pr.in === 'query' && pr.required; });
}

function requiredBodySchema(op) {
    if (op.requestBody && op.requestBody.required) {
        const content = op.requestBody.content || {};
        const jsonKey = Object.keys(content).find(function(m) { return /json/i.test(m); });
        return jsonKey ? (content[jsonKey].schema || {}) : null;   // Swagger 2 body params are not covered
    }
    return null;
}

function hasSecurity(op, spec) {
    const sec = op.security !== undefined ? op.security : spec.security;
    return Array.isArray(sec) && sec.length > 0 && !(sec.length === 1 && Object.keys(sec[0] || {}).length === 0);
}

// Returns [{ suffix, why, expect, declared, mutate(url, req, pre) }]
function negativeCases(op, p, spec) {
    const responses = op.responses || {};
    const cases     = [];

    if (hasSecurity(op, spec)) {
        const e = declaredOr(responses, [401, 403], [401, 403]);
        cases.push({
            suffix: 'no auth', why: 'Sent without credentials.',
            expect: e.statuses, declared: e.declared,
            pre: { auth: { enabled: false } },
        });
    }

    if (/\{[^}]+\}/.test(p)) {
        const e = declaredOr(responses, [404], [404]);
        cases.push({
            suffix: 'unknown id', why: 'Path parameter replaced with an id that does not exist.',
            expect: e.statuses, declared: e.declared,
            pathValue: BOGUS_ID,
        });
    }

    if (requiredBodySchema(op)) {
        const e = declaredOr(responses, [400, 422], [400, 422]);
        cases.push({
            suffix: 'empty body', why: 'Required request body sent as {}.',
            expect: e.statuses, declared: e.declared,
            body: '{}',
        });
    }

    const reqQ = requiredQueryParams(op.parameters);
    if (reqQ.length) {
        const e = declaredOr(responses, [400, 422], [400, 422]);
        cases.push({
            suffix: 'missing ' + reqQ[0].name, why: 'Required query parameter "' + reqQ[0].name + '" omitted.',
            expect: e.statuses, declared: e.declared,
            dropQuery: reqQ[0].name,
        });
    }

    return cases;
}

function buildNegativeItem(base, method, p, c, query) {
    // A negative test must differ from the happy path by exactly ONE thing, or it
    // stops testing what it claims to. Withholding auth on an operation whose
    // required query parameters were also dropped can just as well answer 400.
    const rawPath = c.pathValue ? p.replace(/\{[^}]+\}/g, c.pathValue) : toPostmanPath(p);
    const keptQ   = (query || []).filter(function(x) { return x.key !== c.dropQuery; });

    const url = {
        raw:  '{{baseUrl}}' + rawPath,
        host: ['{{baseUrl}}'],
        path: rawPath.replace(/^\//, '').split('/'),
    };
    if (keptQ.length) {
        url.query = keptQ;
        url.raw  += '?' + keptQ.map(function(x) { return x.key + '='; }).join('&');
    }

    const override = { expectedStatus: c.expect };
    const note = c.declared
        ? 'Expected status is declared in the spec.'
        : 'The spec does not declare a status for this case — ' + c.expect.join('/') + ' is the conventional answer. Adjust if your API differs.';

    const request = {
        method: method.toUpperCase(),
        header: c.body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
        url: url,
        description: c.why + '\n\n' + note,
    };
    if (c.body) request.body = { mode: 'raw', raw: c.body, options: { raw: { language: 'json' } } };

    return {
        name: base + ' — ' + c.suffix,
        request: request,
        event: [
            { listen: 'prerequest', script: { type: 'text/javascript', exec: scriptExec(c.pre || {}, 'hephaestus.v3.pre') } },
            { listen: 'test',       script: { type: 'text/javascript', exec: scriptExec(override, 'hephaestus.v3.post') } },
        ],
    };
}

function buildCollection(spec, name, opts) {
    const info    = spec.info || {};
    const servers = spec.servers || (spec.host ? [{ url: ((spec.schemes && spec.schemes[0]) || 'https') + '://' + spec.host + (spec.basePath || '') }] : []);
    const baseUrl = servers[0] ? expandServerVars(servers[0]) : '';

    const negative = !!(opts && opts.negative);
    const folders  = {};
    let total    = 0;
    let negTotal = 0;

    Object.keys(spec.paths || {}).forEach(function(p) {
        const pathItem = spec.paths[p] || {};
        METHODS.forEach(function(method) {
            const opRaw = pathItem[method];
            if (!opRaw) return;
            const op = resolveRefs(opRaw, spec);   // resolve response/param $refs too

            const tag   = (op.tags && op.tags[0]) || 'default';
            const name_ = op.summary || op.operationId || (method.toUpperCase() + ' ' + p);

            const override = { expectedStatus: successStatuses(op.responses) };
            const schema = responseSchema(op.responses || {});
            if (schema) override.schema = { enabled: true, definition: schema };

            const url = { raw: '{{baseUrl}}' + toPostmanPath(p), host: ['{{baseUrl}}'], path: toPostmanPath(p).replace(/^\//, '').split('/') };
            const q = queryParams(op.parameters);
            if (q.length) { url.query = q; url.raw += '?' + q.map(function(x) { return x.key + '='; }).join('&'); }

            (folders[tag] = folders[tag] || []).push({
                name: name_,
                request: { method: method.toUpperCase(), header: [], url: url, description: op.description || '' },
                event: [
                    { listen: 'prerequest', script: { type: 'text/javascript', exec: scriptExec({}, 'hephaestus.v3.pre') } },
                    { listen: 'test',       script: { type: 'text/javascript', exec: scriptExec(override, 'hephaestus.v3.post') } }
                ]
            });
            total++;

            if (negative) {
                negativeCases(op, p, spec).forEach(function(c) {
                    // Kept in their own folder so a run can be filtered to either
                    // half (newman --folder) without renaming anything.
                    const negTag = tag + ' — negative';
                    (folders[negTag] = folders[negTag] || []).push(buildNegativeItem(name_, method, p, c, q));
                    negTotal++;
                });
            }
        });
    });

    const collection = {
        info: {
            name: name || info.title || 'Imported API',
            description: (info.description || '') + '\n\nGenerated by Hephaestus from OpenAPI/Swagger.',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: Object.keys(folders).map(function(tag) { return { name: tag, item: folders[tag] }; }),
        variable: [
            { key: 'baseUrl', value: baseUrl },
            { key: 'hephaestus.defaults', value: JSON.stringify({ baseUrl: baseUrl, defaultProtocol: 'https', contentType: 'json' }) },
            { key: 'hephaestus.v3.pre',  value: '// Запустите 🔧 engine-update для загрузки движка' },
            { key: 'hephaestus.v3.post', value: '// Запустите 🔧 engine-update для загрузки движка' }
        ]
    };
    return { collection: collection, total: total, negative: negTotal };
}

// ─── Exports (reused by scripts/coverage.js — zero-dep spec parsing) ────────────

module.exports = { parseSpec: parseSpec, resolveRefs: resolveRefs, buildCollection: buildCollection };

// ─── Run (CLI) ─────────────────────────────────────────────────────────────────

if (require.main === module) {
    // value-aware arg parsing
    const argv = process.argv.slice(2);
    const VALUE_FLAGS = ['-o', '--name'];
    const consumed = {};
    let inputFile = null, outArg = null, nameArg = null;
    const negative = argv.indexOf('--negative') !== -1;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '-o')      { outArg  = argv[i + 1]; consumed[i] = consumed[i + 1] = true; i++; continue; }
        if (a === '--name')  { nameArg = argv[i + 1]; consumed[i] = consumed[i + 1] = true; i++; continue; }
        if (a[0] === '-')    { consumed[i] = true; continue; }
    }
    for (let i = 0; i < argv.length; i++) {
        if (!consumed[i]) { inputFile = argv[i]; break; }
    }

    if (!inputFile) {
        console.error('Usage: node scripts/openapi-import.js <openapi.yaml|json> [-o collection.json] [--name "..."] [--negative]');
        process.exit(1);
    }
    if (VALUE_FLAGS.some(function(f) { return argv.indexOf(f) !== -1 && argv.indexOf(f) === argv.length - 1; })) {
        console.error('❌ ' + VALUE_FLAGS.filter(function(f) { return argv.indexOf(f) === argv.length - 1; }).join(', ') + ' requires a value.');
        process.exit(1);
    }

    const raw = fs.readFileSync(path.resolve(inputFile), 'utf8');   // ENOENT here is a clear message
    let spec;
    try {
        spec = parseSpec(raw);
    } catch (e) {
        const looksJson = raw.replace(/^﻿/, '').trim()[0] === '{';
        console.error('❌ Cannot parse spec: ' + e.message + (looksJson ? '' : '\n   (YAML support is a subset — try converting to JSON first.)'));
        process.exit(1);
    }

    if (!spec || typeof spec !== 'object' || !spec.paths || Object.keys(spec.paths).length === 0) {
        console.error('❌ No paths found in spec (is this a valid OpenAPI/Swagger document?).');
        process.exit(1);
    }

    let result;
    try {
        result = buildCollection(spec, nameArg, { negative: negative });
    } catch (e) {
        console.error('❌ Failed to build collection: ' + e.message);
        process.exit(1);
    }

    if (result.total === 0) {
        console.error('❌ No operations found (paths exist but contain no HTTP methods).');
        process.exit(1);
    }

    const outFile = outArg
        ? path.resolve(outArg)
        : path.resolve(inputFile.replace(/\.(ya?ml|json)$/i, '') + '.postman_collection.json');

    fs.writeFileSync(outFile, JSON.stringify(result.collection, null, 2) + '\n');

    console.log('🧬 Imported ' + result.total + ' request(s) in ' + result.collection.item.length + ' folder(s) from ' +
        (spec.openapi ? 'OpenAPI ' + spec.openapi : spec.swagger ? 'Swagger ' + spec.swagger : 'spec') + '.' +
        (refWarnings ? '  (' + refWarnings + ' $ref warning(s))' : ''));
    if (negative) {
        console.log(result.negative > 0
            ? '   + ' + result.negative + ' negative test(s): withheld auth, unknown ids, empty bodies, dropped parameters.'
            : '   + 0 negative tests — this spec declares no security, path parameters, required bodies or required query parameters.');
    }
    console.log('→ ' + path.relative(process.cwd(), outFile));
    console.log('   Next: import into Postman, set hephaestus.defaults, run 🔧 engine-update.');
    process.exit(0);
}
