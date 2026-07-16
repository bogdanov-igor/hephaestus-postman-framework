#!/usr/bin/env node
/**
 * Hephaestus — OpenAPI / Swagger → Collection  v3.9.0
 *
 * Reads an OpenAPI 3.x or Swagger 2.0 spec (JSON or a common subset of YAML,
 * zero dependencies) and generates a Hephaestus-style Postman collection:
 * one request per operation, grouped by tag, with a Test-script `override` that
 * pre-fills expectedStatus (from the documented 2xx responses) and schema (the
 * JSON response schema, with $ref inlined).
 *
 * Usage:
 *   node scripts/openapi-import.js <openapi.yaml|json> [-o collection.json] [--name "..."]
 *
 * YAML support is a pragmatic subset (block mappings/sequences, scalars, inline
 * [a,b] / {a:b}); if a spec fails to parse, convert it to JSON first.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const inputFile  = args.find(function(a) { return !a.startsWith('-'); });
const oIdx       = args.indexOf('-o');
const outArg     = oIdx !== -1 ? args[oIdx + 1] : null;
const nIdx       = args.indexOf('--name');
const nameArg    = nIdx !== -1 ? args[nIdx + 1] : null;

if (!inputFile) {
    console.error('Usage: node scripts/openapi-import.js <openapi.yaml|json> [-o collection.json] [--name "..."]');
    process.exit(1);
}

// ─── Minimal YAML/JSON parser (zero-dep) ────────────────────────────────────────

function stripInlineComment(line) {
    // remove ' #...' when not inside quotes (best-effort)
    let inS = false, inD = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        else if (ch === '#' && !inS && !inD && (i === 0 || line[i - 1] === ' ')) return line.slice(0, i).replace(/\s+$/, '');
    }
    return line.replace(/\s+$/, '');
}

function scalar(s) {
    s = s.trim();
    if (s === '' || s === '~' || s === 'null') return null;
    if (s === 'true')  return true;
    if (s === 'false') return false;
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
        return s.slice(1, -1);
    }
    if (s[0] === '[' || s[0] === '{') return parseFlow(s);
    if (/^-?\d+$/.test(s))        return parseInt(s, 10);
    if (/^-?\d*\.\d+$/.test(s))   return parseFloat(s);
    return s;
}

// Split a flow string by a delimiter at depth 0, respecting [] {} "" ''
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
        if (inner === '') return [];
        return flowSplit(inner).map(function(x) { return scalar(x); });
    }
    if (s[0] === '{') {
        const inner = s.slice(1, -1).trim();
        const obj = {};
        if (inner === '') return obj;
        flowSplit(inner).forEach(function(pair) {
            const ci = pair.indexOf(':');
            if (ci === -1) return;
            obj[scalar(pair.slice(0, ci)).toString()] = scalar(pair.slice(ci + 1));
        });
        return obj;
    }
    return scalar(s);
}

function parseYaml(src) {
    const lines = src.split(/\r?\n/)
        .map(function(l) { return l.replace(/\t/g, '  '); })
        .map(stripInlineComment)
        .filter(function(l) { return l.trim() !== ''; });

    let idx = 0;
    const indentOf = function(l) { return l.match(/^ */)[0].length; };

    function parse(indent) {
        const t = lines[idx].trim();
        return (t === '-' || t.slice(0, 2) === '- ') ? parseArray(indent) : parseObject(indent);
    }

    function parseObject(indent) {
        const obj = {};
        while (idx < lines.length) {
            const line = lines[idx];
            const ind  = indentOf(line);
            if (ind < indent) break;
            if (ind > indent) { idx++; continue; }               // stray deeper line — skip
            const t = line.trim();
            const ci = t.indexOf(':');
            if (ci === -1) { idx++; continue; }
            let key = t.slice(0, ci).trim();
            if ((key[0] === '"' && key.slice(-1) === '"') || (key[0] === "'" && key.slice(-1) === "'")) key = key.slice(1, -1);
            const valStr = t.slice(ci + 1).trim();
            idx++;
            if (valStr === '') {
                obj[key] = (idx < lines.length && indentOf(lines[idx]) > ind) ? parse(indentOf(lines[idx])) : null;
            } else {
                obj[key] = scalar(valStr);
            }
        }
        return obj;
    }

    function parseArray(indent) {
        const arr = [];
        while (idx < lines.length) {
            const line = lines[idx];
            const ind  = indentOf(line);
            if (ind < indent) break;
            if (ind > indent) { idx++; continue; }
            const t = line.trim();
            if (!(t === '-' || t.slice(0, 2) === '- ')) break;
            const rest = t === '-' ? '' : t.slice(2).trim();
            idx++;
            if (rest === '') {
                arr.push((idx < lines.length && indentOf(lines[idx]) > ind) ? parse(indentOf(lines[idx])) : null);
            } else if (/^[^:{[]+:(\s|$)/.test(rest)) {
                // "- key: value" → object whose keys sit at ind+2; re-feed this line.
                lines.splice(idx, 0, ' '.repeat(ind + 2) + rest);
                arr.push(parseObject(ind + 2));
            } else {
                arr.push(scalar(rest));
            }
        }
        return arr;
    }

    return lines.length ? parse(indentOf(lines[0])) : {};
}

function parseSpec(src) {
    const t = src.replace(/^﻿/, '').trim();
    if (t[0] === '{') return JSON.parse(t);   // JSON spec — robust path
    return parseYaml(src);
}

// ─── $ref resolution (inline) ───────────────────────────────────────────────────

function resolveRefs(node, root, seen) {
    seen = seen || [];
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(function(n) { return resolveRefs(n, root, seen); });
    if (typeof node.$ref === 'string' && node.$ref[0] === '#') {
        if (seen.indexOf(node.$ref) !== -1) return {};             // cycle guard
        const target = node.$ref.slice(2).split('/').reduce(function(acc, k) {
            return acc ? acc[decodeURIComponent(k.replace(/~1/g, '/').replace(/~0/g, '~'))] : undefined;
        }, root);
        return target === undefined ? {} : resolveRefs(target, root, seen.concat(node.$ref));
    }
    const out = {};
    Object.keys(node).forEach(function(k) { out[k] = resolveRefs(node[k], root, seen); });
    return out;
}

// ─── OpenAPI → collection ───────────────────────────────────────────────────────

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function successStatuses(responses) {
    const codes = Object.keys(responses || {})
        .filter(function(c) { return /^2\d\d$/.test(c); })
        .map(Number);
    return codes.length ? codes : [200];
}

function responseSchema(op, root) {
    const responses = op.responses || {};
    const okKey = Object.keys(responses).find(function(c) { return /^2\d\d$/.test(c); });
    if (!okKey) return null;
    const r = responses[okKey];
    // OpenAPI 3: content['application/json'].schema ; Swagger 2: r.schema
    let schema = null;
    if (r && r.content) {
        const json = r.content['application/json'] || r.content[Object.keys(r.content)[0]];
        schema = json && json.schema;
    } else if (r && r.schema) {
        schema = r.schema;
    }
    return schema ? resolveRefs(schema, root) : null;
}

function toPostmanPath(p) {
    return p.replace(/\{([^}]+)\}/g, ':$1'); // {id} → :id
}

function scriptExec(overrideObj, evalTarget) {
    return [
        'const override = ' + JSON.stringify(overrideObj, null, 4) + ';',
        '',
        'eval(pm.collectionVariables.get("' + evalTarget + '"));'
    ];
}

function buildCollection(spec, name) {
    const info    = spec.info || {};
    const servers = spec.servers || (spec.host ? [{ url: (spec.schemes && spec.schemes[0] || 'https') + '://' + spec.host + (spec.basePath || '') }] : []);
    const baseUrl = (servers[0] && servers[0].url) || '';

    const folders = {}; // tag -> items[]

    Object.keys(spec.paths || {}).forEach(function(p) {
        const pathItem = spec.paths[p] || {};
        METHODS.forEach(function(method) {
            const op = pathItem[method];
            if (!op) return;

            const tag  = (op.tags && op.tags[0]) || 'default';
            const name_ = op.summary || op.operationId || (method.toUpperCase() + ' ' + p);

            const override = { expectedStatus: successStatuses(op.responses) };
            const schema = responseSchema(op, spec);
            if (schema) override.schema = { enabled: true, definition: schema };

            const item = {
                name: name_,
                request: {
                    method: method.toUpperCase(),
                    header: [],
                    url: { raw: '{{baseUrl}}' + toPostmanPath(p), host: ['{{baseUrl}}'], path: toPostmanPath(p).replace(/^\//, '').split('/') },
                    description: op.description || ''
                },
                event: [
                    { listen: 'prerequest', script: { type: 'text/javascript', exec: scriptExec({}, 'hephaestus.v3.pre') } },
                    { listen: 'test',       script: { type: 'text/javascript', exec: scriptExec(override, 'hephaestus.v3.post') } }
                ]
            };
            (folders[tag] = folders[tag] || []).push(item);
        });
    });

    const items = Object.keys(folders).map(function(tag) {
        return { name: tag, item: folders[tag] };
    });

    return {
        info: {
            name: name || info.title || 'Imported API',
            description: (info.description || '') + '\n\nGenerated by Hephaestus from OpenAPI/Swagger.',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: items,
        variable: [
            { key: 'baseUrl', value: baseUrl },
            { key: 'hephaestus.defaults', value: JSON.stringify({ baseUrl: baseUrl, defaultProtocol: 'https', contentType: 'json' }) },
            { key: 'hephaestus.v3.pre',  value: '// Запустите 🔧 engine-update для загрузки движка' },
            { key: 'hephaestus.v3.post', value: '// Запустите 🔧 engine-update для загрузки движка' }
        ]
    };
}

// ─── Run ─────────────────────────────────────────────────────────────────────

let spec;
try {
    spec = parseSpec(fs.readFileSync(path.resolve(inputFile), 'utf8'));
} catch (e) {
    console.error('❌ Cannot parse spec: ' + e.message + '\n   (YAML support is a subset — try converting to JSON.)');
    process.exit(1);
}

if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
    console.error('❌ No paths found in spec (is this a valid OpenAPI/Swagger document?).');
    process.exit(1);
}

const collection = buildCollection(spec, nameArg);
const totalReqs  = collection.item.reduce(function(s, f) { return s + f.item.length; }, 0);

const outFile = outArg
    ? path.resolve(outArg)
    : path.resolve(inputFile.replace(/\.(ya?ml|json)$/i, '') + '.postman_collection.json');

fs.writeFileSync(outFile, JSON.stringify(collection, null, 2) + '\n');

console.log('🧬 Imported ' + totalReqs + ' request(s) in ' + collection.item.length + ' folder(s) from ' + (spec.openapi ? 'OpenAPI ' + spec.openapi : spec.swagger ? 'Swagger ' + spec.swagger : 'spec') + '.');
console.log('→ ' + path.relative(process.cwd(), outFile));
console.log('   Next: import into Postman, set hephaestus.defaults, run 🔧 engine-update.');
process.exit(0);
