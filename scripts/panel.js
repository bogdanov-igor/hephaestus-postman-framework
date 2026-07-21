#!/usr/bin/env node
'use strict';
/**
 * Hephaestus — local Dev Panel
 *
 * A tiny localhost server (zero dependencies, node:http) that puts the things you
 * look at while testing in one place: run history with pass-rate/p95 trend
 * sparklines, a snapshot diff viewer (strict/non-strict/structural), the defaults
 * config with live JSON-Schema validation, an override-block builder, and the
 * local docs. No hosting, no external service, no telemetry — it reads files from
 * this repo and serves one self-contained page.
 *
 * Usage:
 *   node bin/hephaestus.js panel [-c <collection.json>] [--port N] [--history <file>]
 *
 *   -c <file>        Collection JSON to read snapshots from (optional)
 *   --port N         Port (default 7373)
 *   --history <file> Run history JSONL (default .hephaestus/history.jsonl)
 *
 * SECURITY POSTURE (a local server that can WRITE deserves an explicit one):
 *   • binds 127.0.0.1 only — never reachable from the network;
 *   • every file path is fixed at startup from argv, and the one request-addressable
 *     area (the docs pages) is a FIXED map where the request string is only a lookup
 *     key — no request input is ever joined into a path, so there is no traversal;
 *   • the page is served with X-Frame-Options: DENY + a strict CSP (frame-ancestors
 *     'none'), so a foreign page cannot frame this write-capable UI;
 *   • Host header must be loopback → blocks DNS-rebinding;
 *   • writes require Content-Type: application/json and a same-origin (or absent)
 *     Origin, and no CORS headers are ever sent → a foreign page cannot POST here;
 *   • the only writable target is the defaults file, and the body must parse as JSON.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const jsonDiff       = require('./lib/json-diff.js');
const schemaValidate = require('./lib/schema-validate.js');
const spark          = require('./lib/sparkline.js');
const gen            = require('./generate-test.js');   // buildOverride + renderScript

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PORT    = 7373;

// The typed config contract. Not shipped in the npm package (docs/ is dev-only),
// so the defaults editor validates against it when present and falls back to a
// plain JSON-syntax check when it is not — never a hard failure.
const SCHEMA_FILE = path.join(ROOT, 'docs/override.schema.json');
function loadSchema() {
    try { return JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8')); } catch (e) { return null; }
}
// cwd-relative, matching where `summary.js --history` WRITES it — resolving this
// against the package root instead would make the panel look in the wrong place
// (and show "no runs") whenever it is run from a project directory.
const DEFAULT_HISTORY = path.resolve('.hephaestus/history.jsonl');
const DEFAULTS_FILE   = path.join(ROOT, 'setup/defaults.json');
const MAX_BODY        = 512 * 1024; // defaults.json is small; cap the write body (BYTES)
const HISTORY_LIMIT   = 200;        // the page shows the tail; don't ship the whole log

// Doc pages the panel may serve, as a FIXED map: the request string is only ever a
// lookup key, never used to build a filesystem path — so there is still no traversal.
const DOC_PAGES = {
    'index.html':            { file: path.join(ROOT, 'docs/index.html'),            label: 'docs home' },
    'config-reference.html': { file: path.join(ROOT, 'docs/config-reference.html'), label: 'config reference' },
    'features.html':         { file: path.join(ROOT, 'docs/features.html'),         label: 'features' },
    'quickstart.html':       { file: path.join(ROOT, 'docs/quickstart.html'),       label: 'quickstart' },
    'snapshot-viewer.html':  { file: path.join(ROOT, 'docs/snapshot-viewer.html'),  label: 'snapshot viewer' }
};

// The published package does not ship docs/ (it is 200KB+ of HTML), so the panel
// links to whichever pages actually exist on disk and, when none do, points at
// the online docs instead of advertising five links that all 404.
const ONLINE_DOCS = 'https://github.com/bogdanov-igor/hephaestus-postman-framework/tree/main/docs';
function availableDocs() {
    return Object.keys(DOC_PAGES).filter(function (k) {
        try { return fs.existsSync(DOC_PAGES[k].file); } catch (e) { return false; }
    });
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

function parseArgs(argv) {
    const a = { port: DEFAULT_PORT, collection: null, history: DEFAULT_HISTORY };
    for (let i = 0; i < argv.length; i++) {
        const t = argv[i];
        if (t === '--port') { const n = parseInt(argv[++i], 10); if (Number.isInteger(n) && n >= 0 && n <= 65535) a.port = n; }
        else if (t === '-c' || t === '--collection') a.collection = argv[++i] || null;
        else if (t === '--history') a.history = argv[++i] || DEFAULT_HISTORY;
    }
    return a;
}

// JSONL → runs. Malformed lines are skipped, never fatal (a half-written line
// from an interrupted run must not blank the whole panel).
function parseHistory(text) {
    const runs = [];
    String(text || '').split('\n').forEach(function(line) {
        const s = line.trim();
        if (!s) return;
        try {
            const r = JSON.parse(s);
            if (r && typeof r === 'object') runs.push(r);
        } catch (e) { /* skip malformed */ }
    });
    return runs;
}

// Pull the snapshot store out of a Postman collection's variables.
function extractSnapshots(collection) {
    const vars = (collection && collection.variable) || [];
    const entry = vars.filter(function(v) { return v && v.key === 'hephaestus.snapshots'; })[0];
    if (!entry || !entry.value) return {};
    try {
        const parsed = JSON.parse(entry.value);
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) { return {}; }
}

// Only loopback Hosts are served → a rebound DNS name cannot reach the panel.
function isLoopbackHost(hostHeader, port) {
    if (!hostHeader) return false;
    const h = String(hostHeader).trim().toLowerCase();
    const hosts = ['127.0.0.1', 'localhost', '[::1]'];
    const allowed = hosts.map(function(x) { return x + ':' + port; });
    // On port 80 a browser omits the port from Host entirely, so accept the bare form too.
    if (port === 80) hosts.forEach(function(x) { allowed.push(x); });
    return allowed.indexOf(h) !== -1;
}

// A write is accepted only from our own page: JSON content-type (a cross-origin
// simple form POST cannot set it without a preflight we never approve) and an
// Origin that is either absent (same-origin fetch/curl) or one of ours.
function isWriteAllowed(headers, port) {
    const ct = String(headers['content-type'] || '').toLowerCase();
    if (ct.indexOf('application/json') !== 0) return false;
    const origin = headers['origin'];
    if (!origin) return true;
    const ok = ['http://127.0.0.1:' + port, 'http://localhost:' + port, 'http://[::1]:' + port];
    return ok.indexOf(String(origin).toLowerCase()) !== -1;
}

// ── Server ────────────────────────────────────────────────────────────────────

function readJsonFile(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}

function createPanelServer(opts) {
    const port        = opts.port;
    const historyFile = opts.history;
    const collection  = opts.collection;      // absolute or cwd-relative path, fixed at startup
    const defaultsFile = opts.defaultsFile || DEFAULTS_FILE;

    function sendJson(res, code, obj) {
        const body = JSON.stringify(obj);
        res.writeHead(code, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(body);
    }

    const server = http.createServer(function(req, res) {
        // Compare against the port actually bound, not the requested one — with
        // --port 0 (or any ephemeral bind) they differ and every request would 403.
        const addr = server.address();
        const boundPort = (addr && addr.port) || port;

        // Loopback-only, both by bind address and by Host (anti DNS-rebinding).
        if (!isLoopbackHost(req.headers.host, boundPort)) {
            return sendJson(res, 403, { error: 'forbidden host' });
        }
        const url = String(req.url || '/').split('?')[0];

        if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
            const html = renderPage();
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
                // A write-capable page must not be frameable (clickjacking).
                'X-Frame-Options': 'DENY',
                'Content-Security-Policy':
                    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; " +
                    "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
            });
            return res.end(html);
        }

        // Local docs: the request string is only a key into the fixed DOC_PAGES map,
        // never joined into a path — so this adds no traversal surface.
        if (req.method === 'GET' && url.indexOf('/docs/') === 0) {
            const entry = DOC_PAGES[url.slice('/docs/'.length)];
            if (!entry) return sendJson(res, 404, { error: 'unknown doc page' });
            let html;
            try { html = fs.readFileSync(entry.file, 'utf8'); } catch (e) {
                return sendJson(res, 404, { error: 'doc page not found on disk' });
            }
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            });
            return res.end(html);
        }

        if (req.method === 'GET' && url === '/api/history') {
            let text = '';
            try { text = fs.readFileSync(historyFile, 'utf8'); } catch (e) { text = ''; }
            const runs = parseHistory(text);
            // Ship only the tail the page renders — the history file is append-only
            // and unbounded, and the client shows the most recent runs anyway.
            return sendJson(res, 200, {
                file: historyFile,
                total: runs.length,
                runs: runs.slice(-HISTORY_LIMIT)
            });
        }

        if (req.method === 'GET' && url === '/api/snapshots') {
            if (!collection) return sendJson(res, 200, { collection: null, snapshots: {} });
            const col = readJsonFile(collection);
            if (!col) return sendJson(res, 200, { collection: collection, snapshots: {}, error: 'unreadable collection' });
            return sendJson(res, 200, { collection: collection, snapshots: extractSnapshots(col) });
        }

        if (req.method === 'GET' && url === '/api/defaults') {
            const obj = readJsonFile(defaultsFile);
            return sendJson(res, 200, { file: defaultsFile, defaults: obj });
        }

        if (req.method === 'POST' && url === '/api/defaults') {
            if (!isWriteAllowed(req.headers, boundPort)) {
                return sendJson(res, 403, { error: 'write rejected: needs application/json from this panel' });
            }
            // Collect raw Buffers and decode ONCE: `body += chunk` would decode each
            // socket read on its own and mangle any multi-byte character that straddles
            // a chunk boundary (silently writing U+FFFD into the user's config). Sizing
            // is on bytes for the same reason — a string length would count UTF-16 units.
            const chunks = [];
            let size = 0;
            let tooBig = false;
            req.on('data', function(chunk) {
                if (tooBig) return;
                size += chunk.length;
                if (size > MAX_BODY) { tooBig = true; sendJson(res, 413, { error: 'body too large' }); req.destroy(); return; }
                chunks.push(chunk);
            });
            req.on('end', function() {
                if (tooBig) return;
                const body = Buffer.concat(chunks).toString('utf8');
                let parsed;
                try { parsed = JSON.parse(body); } catch (e) {
                    return sendJson(res, 400, { error: 'invalid JSON: ' + e.message });
                }
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    return sendJson(res, 400, { error: 'defaults must be a JSON object' });
                }
                try {
                    fs.writeFileSync(defaultsFile, JSON.stringify(parsed, null, 2) + '\n');
                } catch (e) {
                    return sendJson(res, 500, { error: 'write failed: ' + e.message });
                }
                return sendJson(res, 200, { ok: true, file: defaultsFile });
            });
            return;
        }

        // ── Trends: pass-rate + p95 sparklines from the run history ──────────────
        if (req.method === 'GET' && url === '/api/trends') {
            let text = '';
            try { text = fs.readFileSync(historyFile, 'utf8'); } catch (e) { text = ''; }
            const runs = parseHistory(text).slice(-HISTORY_LIMIT);
            const nums = function(k) {
                return runs.map(function(r) { const n = Number(r[k]); return isFinite(n) ? n : null; });
            };
            const series = function(values, unit, goodIsUp) {
                const finite = values.filter(function(v) { return typeof v === 'number' && isFinite(v); });
                const last = finite.length ? finite[finite.length - 1] : null;
                const d    = spark.deltaOf(finite);
                return { spark: spark.sparkline(values), last: last, delta: Math.round(d * 100) / 100,
                         good: last === null ? null : (goodIsUp ? d >= 0 : d <= 0), unit: unit };
            };
            return sendJson(res, 200, {
                runs: runs.length,
                passRate: series(nums('passRate'), '%', true),
                p95:      series(nums('p95'), 'ms', false),
            });
        }

        // ── Structural / strict / non-strict diff of two JSON payloads ───────────
        if (req.method === 'POST' && url === '/api/diff') {
            return readJsonBody(req, res, function(body) {
                const mode = ['strict', 'non-strict', 'structural'].indexOf(body.mode) !== -1 ? body.mode : 'structural';
                let entries;
                try { entries = jsonDiff.diff(body.baseline, body.current, mode); }
                catch (e) { return sendJson(res, 400, { error: 'diff failed: ' + e.message }); }
                return sendJson(res, 200, { mode: mode, entries: entries, summary: jsonDiff.summarize(entries) });
            });
        }

        // ── Validate an edited defaults object against the config schema ──────────
        if (req.method === 'POST' && url === '/api/validate') {
            return readJsonBody(req, res, function(body) {
                const schema = loadSchema();
                if (!schema) return sendJson(res, 200, { schema: false, valid: true, errors: [], unchecked: [] });
                const r = schemaValidate.validate(body, schema);
                return sendJson(res, 200, {
                    schema: true, valid: r.valid,
                    errors: r.errors.map(function(e) { return { path: e.path || '(root)', message: e.message }; }),
                    unchecked: r.unchecked.map(function(e) { return { path: e.path || '(root)', message: e.message }; }),
                });
            });
        }

        // ── Override constructor: form answers → a paste-able override block ──────
        if (req.method === 'POST' && url === '/api/build') {
            return readJsonBody(req, res, function(body) {
                const plane = body.plane === 'pre' ? 'pre' : 'post';
                let override, script;
                try {
                    override = gen.buildOverride(Object.assign({}, body, { plane: plane }));
                    script   = gen.renderScript(override, plane);
                } catch (e) { return sendJson(res, 400, { error: 'build failed: ' + e.message }); }
                return sendJson(res, 200, { plane: plane, override: override, script: script });
            });
        }

        return sendJson(res, 404, { error: 'not found' });
    });

    return server;
}

// Collect a JSON request body with the same byte-capped, decode-once handling as
// the defaults writer, then hand the parsed object to `done`. Rejects a
// non-application/json content type so a cross-origin form POST cannot reach here.
function readJsonBody(req, res, done) {
    const sendJson = function(code, obj) {
        res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(JSON.stringify(obj));
    };
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    if (ct.indexOf('application/json') !== 0) return sendJson(415, { error: 'expected application/json' });
    const chunks = [];
    let size = 0, tooBig = false;
    req.on('data', function(chunk) {
        if (tooBig) return;
        size += chunk.length;
        if (size > MAX_BODY) { tooBig = true; sendJson(413, { error: 'body too large' }); req.destroy(); return; }
        chunks.push(chunk);
    });
    req.on('end', function() {
        if (tooBig) return;
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch (e) { return sendJson(400, { error: 'invalid JSON: ' + e.message }); }
        done(parsed);
    });
}

// ── The page (self-contained: no CDN, no external asset) ──────────────────────

// Only list docs that are present. On a full checkout that is all five; on an
// installed package (no docs/ shipped) it is none, and we point at the online
// copy rather than render links that 404.
function docsLinks() {
    const have = availableDocs();
    if (!have.length) {
        return '<div class="empty">Documentation is not bundled with this install. ' +
            'Read it online: <a href="' + ONLINE_DOCS + '" target="_blank" rel="noopener">github.com/…/docs</a></div>';
    }
    const items = have.map(function (k) {
        return '<li><a href="/docs/' + k + '">' + DOC_PAGES[k].label + '</a></li>';
    }).join('');
    return '<ul style="padding-left:18px;font-size:.86rem">' + items + '</ul>' +
        '<div class="empty">Served read-only from this repo\'s docs/ folder.</div>';
}

function renderPage() {
    const CSS = [
        ':root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--tx:#c9d1d9;--mu:#8b949e;--ac:#e25822;--gr:#3fb950;--rd:#f85149;--yl:#d29922}',
        '*{box-sizing:border-box;margin:0;padding:0}',
        'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--tx);padding:24px;line-height:1.5}',
        'h1{font-size:1.2rem;margin-bottom:4px}h1 span{color:var(--ac)}',
        '.sub{color:var(--mu);font-size:.8rem;margin-bottom:20px}',
        '.tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin-bottom:18px;flex-wrap:wrap}',
        '.tab{padding:8px 14px;cursor:pointer;color:var(--mu);border-bottom:2px solid transparent;font-size:.86rem}',
        '.tab.on{color:var(--tx);border-bottom-color:var(--ac)}',
        '.panel{display:none}.panel.on{display:block}',
        'table{width:100%;border-collapse:collapse;font-size:.82rem}',
        'th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--bd);vertical-align:top}',
        'th{color:var(--mu);font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.04em}',
        '.card{background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:14px;margin-bottom:12px;overflow-x:auto}',
        'pre{font-family:"SF Mono",Menlo,monospace;font-size:.76rem;white-space:pre-wrap;word-break:break-word}',
        'textarea{width:100%;min-height:340px;background:#0d1117;color:var(--tx);border:1px solid var(--bd);border-radius:6px;padding:12px;font-family:"SF Mono",Menlo,monospace;font-size:.78rem}',
        'button{background:var(--ac);color:#fff;border:0;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:.82rem;margin-top:10px}',
        'button:disabled{opacity:.5;cursor:default}',
        'button.ghost{background:transparent;border:1px solid var(--bd);color:var(--tx)}',
        '.msg{margin-left:10px;font-size:.8rem}.ok{color:var(--gr)}.err{color:var(--rd)}.warnc{color:var(--yl)}',
        '.empty{color:var(--mu);font-size:.84rem;padding:10px 0}',
        'a{color:var(--ac)}.k{color:var(--mu)}',
        '.trend{display:flex;align-items:center;gap:14px;padding:6px 0;font-size:.86rem}',
        '.trend .lbl{width:90px;color:var(--mu)}',
        '.spark{font-family:"SF Mono",Menlo,monospace;font-size:1.15rem;letter-spacing:1px;color:var(--ac)}',
        '.now{font-weight:700}.delta{font-size:.8rem}',
        'select,input[type=text]{background:#0d1117;color:var(--tx);border:1px solid var(--bd);border-radius:6px;padding:6px 8px;font-size:.8rem}',
        '.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}',
        '.d-add{color:var(--gr)}.d-rem{color:var(--rd)}.d-type{color:var(--yl)}.d-chg{color:var(--tx)}.d-len{color:var(--ac)}',
        '.diffpath{font-family:"SF Mono",Menlo,monospace;font-size:.78rem}',
        '.fld{display:block;font-size:.78rem;color:var(--mu);margin:8px 0 3px}',
    ].join('');

    const CLIENT = [
        'function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}',
        'function post(u,b){return fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){return r.json();});}',
        // tab switching
        'document.querySelectorAll(".tab").forEach(function(t){t.onclick=function(){',
        'document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("on")});',
        'document.querySelectorAll(".panel").forEach(function(x){x.classList.remove("on")});',
        't.classList.add("on");document.getElementById(t.dataset.p).classList.add("on");};});',

        // ── trends + history ──
        'fetch("/api/trends").then(function(r){return r.json()}).then(function(d){',
        'var el=document.getElementById("trends");if(!d||!d.runs){el.innerHTML="";return;}',
        'function line(lbl,s){var col=s.good==null?"var(--mu)":(s.good?"var(--gr)":"var(--rd)");var sign=s.delta>0?"+":"";',
        'return \'<div class="trend"><span class="lbl">\'+lbl+\'</span><span class="spark">\'+esc(s.spark)+\'</span>\'+',
        '\'<span class="now">\'+esc(s.last)+esc(s.unit)+\'</span><span class="delta" style="color:\'+col+\'">\'+sign+esc(s.delta)+esc(s.unit)+\'</span></div>\';}',
        'el.innerHTML=\'<div class="k" style="margin-bottom:6px">\'+d.runs+\' run(s)</div>\'+line("Pass rate",d.passRate)+line("p95",d.p95);});',
        'fetch("/api/history").then(function(r){return r.json()}).then(function(d){',
        'var el=document.getElementById("hist");',
        'if(!d.runs||!d.runs.length){el.innerHTML=\'<div class="empty">No runs yet. Produce some with: <code>hephaestus summary results.json --history</code></div>\';return;}',
        'var shown=d.runs.slice(-50).reverse();',
        'var rows=shown.map(function(r){return "<tr><td>"+esc(r.ts)+"</td><td>"+esc(r.passRate)+"%</td><td>"+esc(r.p95)+" ms</td><td>"+esc(r.total)+"</td><td>"+esc(r.failed)+"</td><td>"+esc(r.requests)+"</td></tr>";}).join("");',
        'el.innerHTML="<table><tr><th>When</th><th>Pass</th><th>p95</th><th>Asserts</th><th>Failed</th><th>Requests</th></tr>"+rows+"</table>";});',

        // ── snapshots + diff ──
        'var SNAPS={};',
        'fetch("/api/snapshots").then(function(r){return r.json()}).then(function(d){',
        'var el=document.getElementById("snaps");SNAPS=d.snapshots||{};var keys=Object.keys(SNAPS);',
        'if(!d.collection){el.innerHTML=\'<div class="empty">Start the panel with <code>-c &lt;collection.json&gt;</code> to browse snapshots.</div>\';return;}',
        'if(!keys.length){el.innerHTML=\'<div class="empty">No snapshots stored in \'+esc(d.collection)+\'</div>\';return;}',
        // diff controls
        'var opts=keys.map(function(k){return \'<option value="\'+esc(k)+\'">\'+esc(k)+\'</option>\';}).join("");',
        'var ctl=\'<div class="row"><span class="k">Diff</span><select id="dbase">\'+opts+\'</select><span class="k">vs</span><select id="dcur">\'+opts+\'</select>\'+',
        '\'<select id="dmode"><option value="structural">structural</option><option value="non-strict">non-strict</option><option value="strict">strict</option></select>\'+',
        '\'<button id="dodiff">Compare</button></div><div id="diffout"></div>\';',
        'var list=keys.map(function(k){return \'<div class="card"><b>\'+esc(k)+\'</b><pre>\'+esc(JSON.stringify(SNAPS[k],null,2))+\'</pre></div>\';}).join("");',
        'el.innerHTML=ctl+list;',
        'if(keys.length>1)document.getElementById("dcur").selectedIndex=1;',
        'document.getElementById("dodiff").onclick=function(){',
        'var b=SNAPS[document.getElementById("dbase").value],c=SNAPS[document.getElementById("dcur").value];',
        'var mode=document.getElementById("dmode").value;var out=document.getElementById("diffout");',
        'function data(s){return s&&s.data!==undefined?s.data:s;}',
        'post("/api/diff",{baseline:data(b),current:data(c),mode:mode}).then(function(r){',
        'if(r.error){out.innerHTML=\'<div class="err">\'+esc(r.error)+\'</div>\';return;}',
        'if(!r.entries.length){out.innerHTML=\'<div class="ok" style="padding:8px 0">No differences in \'+esc(mode)+\' mode ✓</div>\';return;}',
        'var cls={added:"d-add",removed:"d-rem",type:"d-type",changed:"d-chg",length:"d-len"};',
        'var rows=r.entries.map(function(e){return \'<tr><td class="diffpath">\'+esc(e.path||"(root)")+\'</td><td class="\'+(cls[e.kind]||"")+\'">\'+esc(e.kind)+\'</td><td><pre>\'+esc(e.baseline)+\'</pre></td><td><pre>\'+esc(e.current)+\'</pre></td></tr>\';}).join("");',
        'out.innerHTML=\'<table><tr><th>Path</th><th>Change</th><th>Baseline</th><th>Current</th></tr>\'+rows+\'</table>\';});};});',

        // ── defaults + schema validation ──
        'var vT=null;',
        'function validate(){var txt=document.getElementById("dtext").value;var vm=document.getElementById("vmsg");',
        'var obj;try{obj=JSON.parse(txt);}catch(e){vm.innerHTML=\'<span class="err">Invalid JSON: \'+esc(e.message)+\'</span>\';return;}',
        'post("/api/validate",obj).then(function(r){',
        'if(!r.schema){vm.innerHTML=\'<span class="k">Valid JSON (schema not bundled — syntax only)</span>\';return;}',
        'if(r.valid){var note=r.unchecked.length?\' <span class="warnc">(\'+r.unchecked.length+\' unchecked)</span>\':"";vm.innerHTML=\'<span class="ok">Valid against schema ✓</span>\'+note;return;}',
        'vm.innerHTML=\'<span class="err">\'+r.errors.length+\' schema error(s):</span><ul style="margin:4px 0 0 16px">\'+r.errors.map(function(e){return "<li><code>"+esc(e.path)+"</code> — "+esc(e.message)+"</li>";}).join("")+"</ul>";});}',
        'fetch("/api/defaults").then(function(r){return r.json()}).then(function(d){',
        'document.getElementById("dfile").textContent=d.file;',
        'document.getElementById("dtext").value=d.defaults?JSON.stringify(d.defaults,null,2):"";validate();});',
        'document.getElementById("dtext").addEventListener("input",function(){clearTimeout(vT);vT=setTimeout(validate,300);});',
        'document.getElementById("dsave").onclick=function(){',
        'var btn=this,msg=document.getElementById("dmsg");msg.textContent="";msg.className="msg";',
        'var txt=document.getElementById("dtext").value;var obj;',
        'try{obj=JSON.parse(txt);}catch(e){msg.textContent="Invalid JSON: "+e.message;msg.className="msg err";return;}',
        'btn.disabled=true;',
        'post("/api/validate",obj).then(function(v){',
        'if(v.schema&&!v.valid){btn.disabled=false;msg.textContent="Fix "+v.errors.length+" schema error(s) first";msg.className="msg err";return;}',
        'fetch("/api/defaults",{method:"POST",headers:{"Content-Type":"application/json"},body:txt})',
        '.then(function(r){return r.json()}).then(function(d){btn.disabled=false;',
        'if(d.ok){msg.textContent="Saved ✓";msg.className="msg ok";}else{msg.textContent=d.error||"failed";msg.className="msg err";}});})',
        '.catch(function(e){btn.disabled=false;msg.textContent=String(e);msg.className="msg err";});};',

        // ── override constructor ──
        'function addKey(){var d=document.createElement("div");d.className="row";d.innerHTML=\'<input type="text" class="kpath" placeholder="data.id" style="width:200px"> <button class="ghost rm" type="button">remove</button>\';',
        'd.querySelector(".rm").onclick=function(){d.remove();};document.getElementById("keys").appendChild(d);}',
        'function addShape(){var d=document.createElement("div");d.className="row";d.innerHTML=\'<input type="text" class="spath" placeholder="data.items" style="width:160px"> <select class="stype"><option>string</option><option>number</option><option>boolean</option><option>object</option><option>array</option><option>null</option><option>any</option><option>absent</option></select> <button class="ghost rm" type="button">remove</button>\';',
        'd.querySelector(".rm").onclick=function(){d.remove();};document.getElementById("shape").appendChild(d);}',
        'document.getElementById("addkey").onclick=addKey;document.getElementById("addshape").onclick=addShape;',
        'document.getElementById("dobuild").onclick=function(){',
        'var a={plane:document.getElementById("bplane").value,locale:document.getElementById("blocale").value};',
        'var st=document.getElementById("bstatus").value.trim();if(st)a.expectedStatus=parseInt(st,10);',
        'a.keysToFind=Array.prototype.map.call(document.querySelectorAll("#keys .kpath"),function(i){return {path:i.value.trim()};}).filter(function(k){return k.path;});',
        'var shape={};document.querySelectorAll("#shape .row").forEach(function(row){var p=row.querySelector(".spath").value.trim();if(p)shape[p]=row.querySelector(".stype").value;});a.assertShape=shape;',
        'if(document.getElementById("bsnap").checked)a.snapshot={enabled:true,mode:document.getElementById("bsnapmode").value};',
        'post("/api/build",a).then(function(r){var o=document.getElementById("buildout");',
        'if(r.error){o.innerHTML=\'<div class="err">\'+esc(r.error)+\'</div>\';return;}',
        'o.innerHTML=\'<pre>\'+esc(r.script)+\'</pre><button class="ghost" id="cp">Copy</button>\';',
        'document.getElementById("cp").onclick=function(){navigator.clipboard&&navigator.clipboard.writeText(r.script);this.textContent="Copied";};});};',
    ].join('\n');

    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Hephaestus — Dev Panel</title><style>' + CSS + '</style></head><body>' +
        '<h1>⚒️ <span>Hephaestus</span> Dev Panel</h1>' +
        '<div class="sub">Local only (127.0.0.1) · reads this repo · nothing leaves your machine</div>' +
        '<div class="tabs">' +
        '<div class="tab on" data-p="history">Run history</div>' +
        '<div class="tab" data-p="snapshots">Snapshots</div>' +
        '<div class="tab" data-p="defaults">Defaults</div>' +
        '<div class="tab" data-p="build">Build override</div>' +
        '<div class="tab" data-p="docs">Docs</div>' +
        '</div>' +
        '<div id="history" class="panel on"><div class="card"><div id="trends"></div></div><div class="card"><div id="hist">Loading…</div></div></div>' +
        '<div id="snapshots" class="panel"><div class="card"><div id="snaps">Loading…</div></div></div>' +
        '<div id="defaults" class="panel"><div class="card"><div class="k" id="dfile"></div>' +
        '<textarea id="dtext" spellcheck="false"></textarea>' +
        '<div id="vmsg" style="font-size:.8rem;margin-top:8px"></div>' +
        '<div><button id="dsave">Save defaults</button><span class="msg" id="dmsg"></span></div></div></div>' +
        '<div id="build" class="panel"><div class="card">' +
        '<div class="row"><span class="k">Plane</span><select id="bplane"><option value="post">test (post)</option><option value="pre">prerequest (pre)</option></select>' +
        '<span class="k">Locale</span><select id="blocale"><option value="">—</option><option value="en">en</option><option value="ru">ru</option></select>' +
        '<span class="k">Expected status</span><input type="text" id="bstatus" placeholder="200" style="width:70px"></div>' +
        '<span class="fld">keysToFind</span><div id="keys"></div><button class="ghost" type="button" id="addkey">+ path</button>' +
        '<span class="fld">assertShape</span><div id="shape"></div><button class="ghost" type="button" id="addshape">+ field</button>' +
        '<div class="row" style="margin-top:12px"><label><input type="checkbox" id="bsnap"> snapshot</label>' +
        '<select id="bsnapmode"><option>non-strict</option><option>strict</option><option>structural</option></select></div>' +
        '<div><button id="dobuild">Build</button></div><div id="buildout" style="margin-top:12px"></div>' +
        '</div></div>' +
        '<div id="docs" class="panel"><div class="card">' + docsLinks() + '</div></div>' +
        '<script>' + CLIENT + '</script></body></html>';
}

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
    const args = parseArgs(process.argv.slice(2));
    const server = createPanelServer(args);
    server.listen(args.port, '127.0.0.1', function() {
        const p = server.address().port;
        process.stdout.write('\n⚒️  Hephaestus Dev Panel → http://127.0.0.1:' + p + '\n');
        process.stdout.write('   history:    ' + args.history + '\n');
        process.stdout.write('   collection: ' + (args.collection || '(none — pass -c <collection.json> for snapshots)') + '\n');
        process.stdout.write('   defaults:   ' + DEFAULTS_FILE + '\n\n   Ctrl+C to stop.\n\n');
    });
    server.on('error', function(e) {
        process.stderr.write('panel: ' + (e && e.code === 'EADDRINUSE'
            ? 'port ' + args.port + ' is already in use (try --port N)'
            : (e && e.message ? e.message : e)) + '\n');
        process.exitCode = 1;
    });
    process.on('SIGINT', function() { server.close(function() { process.exit(0); }); });
}

if (require.main === module) main();

module.exports = { parseArgs, parseHistory, extractSnapshots, isLoopbackHost, isWriteAllowed, createPanelServer, availableDocs, docsLinks, DOC_PAGES, ONLINE_DOCS };
