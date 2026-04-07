#!/usr/bin/env node
/**
 * Hephaestus — API Docs Generator  v3.7.0
 *
 * Generates Markdown API documentation from a Postman collection.
 * Your tests ARE your docs.
 *
 * Usage:
 *   node scripts/docs.js <collection.json> [-o output.md] [--no-toc]
 *
 * Options:
 *   -o <file>   Output Markdown file (default: stdout)
 *   --no-toc    Omit table of contents
 *   --json      Output raw structured data as JSON (for tooling)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith('-'));
const outputArg = args[args.indexOf('-o') + 1];
const noToc     = args.includes('--no-toc');
const jsonMode  = args.includes('--json');

if (!inputFile) {
    console.error('Usage: node scripts/docs.js <collection.json> [-o output.md] [--no-toc] [--json]');
    process.exit(1);
}

const raw        = fs.readFileSync(path.resolve(inputFile), 'utf8');
const collection = JSON.parse(raw);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_BADGE = {
    GET:    '![GET](https://img.shields.io/badge/GET-61affe?style=flat-square)',
    POST:   '![POST](https://img.shields.io/badge/POST-49cc90?style=flat-square)',
    PUT:    '![PUT](https://img.shields.io/badge/PUT-fca130?style=flat-square)',
    PATCH:  '![PATCH](https://img.shields.io/badge/PATCH-50e3c2?style=flat-square)',
    DELETE: '![DELETE](https://img.shields.io/badge/DELETE-f93e3e?style=flat-square)',
};

function methodBadge(method) {
    const m = (method || 'GET').toUpperCase();
    return METHOD_BADGE[m] || ('`' + m + '`');
}

function extractUrl(request) {
    if (!request || !request.url) return '—';
    if (typeof request.url === 'string') return request.url;
    return request.url.raw || request.url.path && '/' + request.url.path.join('/') || '—';
}

function extractScript(item, listen) {
    const events = item.event || [];
    const ev = events.find(function(e) { return e.listen === listen; });
    if (!ev || !ev.script) return null;
    const exec = ev.script.exec;
    return Array.isArray(exec) ? exec.join('\n') : exec;
}

function extractOverride(script) {
    if (!script) return null;
    // Extract const override = { ... } block (multi-line tolerant)
    const match = script.match(/const\s+override\s*=\s*(\{[\s\S]*?\});/);
    if (!match) return null;
    try {
        // Use Function to evaluate (safe — our own script format)
        // eslint-disable-next-line no-new-func
        return new Function('return (' + match[1] + ')')();
    } catch(e) { return null; }
}

function descriptionText(desc) {
    if (!desc) return null;
    if (typeof desc === 'string') return desc.trim();
    if (typeof desc === 'object' && desc.content) return desc.content.trim();
    return null;
}

function slug(str) {
    return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function shapeTable(assertShape) {
    if (!assertShape || typeof assertShape !== 'object') return null;
    const rows = Object.keys(assertShape).map(function(k) {
        return '| `' + k + '` | `' + assertShape[k] + '` |';
    });
    return '| Field | Type |\n|---|---|\n' + rows.join('\n');
}

function assertionsTable(assertions) {
    if (!assertions || typeof assertions !== 'object') return null;
    const rows = Object.keys(assertions).map(function(k) {
        const ops = assertions[k];
        const opStr = Object.keys(ops).map(function(op) { return op + ': ' + JSON.stringify(ops[op]); }).join(', ');
        return '| `' + k + '` | ' + opStr + ' |';
    });
    return '| Field | Rules |\n|---|---|\n' + rows.join('\n');
}

// ─── Walk collection items recursively ───────────────────────────────────────

function walkItems(items, folderPath) {
    const result = [];
    if (!Array.isArray(items)) return result;

    items.forEach(function(item) {
        // Folder (has nested item)
        if (Array.isArray(item.item)) {
            const fp = folderPath ? folderPath + ' / ' + item.name : item.name;
            const sub = walkItems(item.item, fp);
            result.push({
                type:    'folder',
                name:    item.name,
                path:    fp,
                desc:    descriptionText(item.description),
                items:   sub,
            });
        } else {
            // Request
            const req  = item.request || {};
            const post = extractScript(item, 'test');
            const pre  = extractScript(item, 'prerequest');
            const ov   = extractOverride(post);

            result.push({
                type:         'request',
                folder:       folderPath || '(root)',
                name:         item.name,
                method:       (req.method || 'GET').toUpperCase(),
                url:          extractUrl(req),
                desc:         descriptionText(req.description || item.description),
                expectedStatus: ov && ov.expectedStatus ? ov.expectedStatus : null,
                auth:         ov && ov.auth ? ov.auth : null,
                assertShape:  ov && ov.assertShape ? ov.assertShape : null,
                assertions:   ov && ov.assertions ? ov.assertions : null,
                assertOrder:  ov && ov.assertOrder ? ov.assertOrder : null,
                assertEach:   ov && ov.assertEach ? ov.assertEach : null,
                snapshot:     ov && ov.snapshot && ov.snapshot.enabled ? ov.snapshot : null,
                hasHephaestus: !!(post && post.includes('hephaestus.v3.post')),
                hasPre:       !!(pre && pre.includes('hephaestus.v3.pre')),
            });
        }
    });

    return result;
}

// ─── Flatten for summary table ────────────────────────────────────────────────

function flatRequests(items) {
    const flat = [];
    function walk(arr) {
        arr.forEach(function(i) {
            if (i.type === 'folder') walk(i.items);
            else flat.push(i);
        });
    }
    walk(items);
    return flat;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderRequest(req, level) {
    const h = '#'.repeat(level);
    const lines = [];

    // Heading
    lines.push(h + ' ' + methodBadge(req.method) + ' ' + req.name);
    lines.push('');

    // URL
    lines.push('```');
    lines.push(req.method + ' ' + req.url);
    lines.push('```');
    lines.push('');

    // Description
    if (req.desc) {
        lines.push(req.desc);
        lines.push('');
    }

    // Meta table
    const metaRows = [];
    if (req.expectedStatus !== null) {
        const statuses = Array.isArray(req.expectedStatus) ? req.expectedStatus.join(', ') : req.expectedStatus;
        metaRows.push('| Expected status | ' + statuses + ' |');
    }
    if (req.auth && req.auth.enabled) {
        metaRows.push('| Auth | `' + req.auth.type + '` |');
    }
    if (req.snapshot) {
        metaRows.push('| Snapshot | `' + (req.snapshot.mode || 'non-strict') + '` |');
    }
    if (req.hasHephaestus) {
        metaRows.push('| Hephaestus | ✅ |');
    }
    if (metaRows.length > 0) {
        lines.push('| Property | Value |');
        lines.push('|---|---|');
        metaRows.forEach(function(r) { lines.push(r); });
        lines.push('');
    }

    // assertShape
    if (req.assertShape) {
        lines.push('**Response shape**');
        lines.push('');
        lines.push(shapeTable(req.assertShape));
        lines.push('');
    }

    // assertions
    if (req.assertions) {
        lines.push('**Assertion rules**');
        lines.push('');
        lines.push(assertionsTable(req.assertions));
        lines.push('');
    }

    // assertOrder
    if (req.assertOrder) {
        const ao = req.assertOrder;
        lines.push('**Sort order:** `' + ao.path + '` by `' + ao.by + '` ' + (ao.direction || 'asc'));
        lines.push('');
    }

    return lines.join('\n');
}

function renderFolder(folder, level, tocLines) {
    const h = '#'.repeat(level);
    const lines = [];

    lines.push(h + ' ' + folder.name);
    lines.push('');

    if (tocLines) {
        tocLines.push('  '.repeat(level - 2) + '- [' + folder.name + '](#' + slug(folder.name) + ')');
    }

    if (folder.desc) {
        lines.push(folder.desc);
        lines.push('');
    }

    folder.items.forEach(function(item) {
        if (item.type === 'folder') {
            lines.push(renderFolder(item, level + 1, tocLines));
        } else {
            if (tocLines) {
                tocLines.push('  '.repeat(level - 1) + '- [' + item.name + '](#' + slug(item.name) + ')');
            }
            lines.push(renderRequest(item, level + 1));
        }
    });

    return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const info  = collection.info || {};
const name  = info.name || path.basename(inputFile, '.json');
const items = walkItems(collection.item || [], '');
const flat  = flatRequests(items);

if (jsonMode) {
    process.stdout.write(JSON.stringify(flat, null, 2) + '\n');
    process.exit(0);
}

// Build ToC
const tocLines = [];
const sections = [];

if (!noToc) {
    tocLines.push('## Table of Contents');
    tocLines.push('');
}

items.forEach(function(item) {
    if (item.type === 'folder') {
        sections.push(renderFolder(item, 2, noToc ? null : tocLines));
    } else {
        if (!noToc) {
            tocLines.push('- [' + item.name + '](#' + slug(item.name) + ')');
        }
        sections.push(renderRequest(item, 2));
    }
});

// Stats
const migrated  = flat.filter(function(r) { return r.hasHephaestus; }).length;
const withShape = flat.filter(function(r) { return r.assertShape; }).length;
const withSnap  = flat.filter(function(r) { return r.snapshot; }).length;

const now = new Date().toISOString().slice(0, 10);

const header = [
    '# ' + name,
    '',
    '> Auto-generated by [Hephaestus](https://github.com/bogdanov-igor/hephaestus-postman-framework) v3.7.0 · ' + now,
    '',
    '| Stat | Value |',
    '|---|---|',
    '| Total requests | ' + flat.length + ' |',
    '| Hephaestus-enabled | ' + migrated + ' |',
    '| With assertShape | ' + withShape + ' |',
    '| With snapshot | ' + withSnap + ' |',
    '',
].join('\n');

const md = [header].concat(noToc ? [] : [tocLines.join('\n'), '']).concat(sections).join('\n\n');

if (outputArg) {
    fs.writeFileSync(path.resolve(outputArg), md, 'utf8');
    const relOut = path.relative(process.cwd(), path.resolve(outputArg));
    console.log('✅ Docs generated → ' + relOut);
    console.log('   ' + flat.length + ' requests, ' + migrated + ' Hephaestus-enabled');
} else {
    process.stdout.write(md + '\n');
}
