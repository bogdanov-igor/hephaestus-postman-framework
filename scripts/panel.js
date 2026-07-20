#!/usr/bin/env node
'use strict';
/**
 * Hephaestus — local Dev Panel
 *
 * A tiny localhost server (zero dependencies, node:http) that puts the things you
 * look at while testing in one place: local run history, saved snapshots, the
 * defaults config, and the local docs. No hosting, no external service, no
 * telemetry — it reads files from this repo and serves one self-contained page.
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
 *   • every file path is fixed at startup from argv — no path comes from a
 *     request, so there is no directory traversal surface;
 *   • Host header must be loopback → blocks DNS-rebinding;
 *   • writes require Content-Type: application/json and a same-origin (or absent)
 *     Origin, and no CORS headers are ever sent → a foreign page cannot POST here;
 *   • the only writable target is the defaults file, and the body must parse as JSON.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PORT    = 7373;
const DEFAULT_HISTORY = path.join(ROOT, '.hephaestus/history.jsonl');
const DEFAULTS_FILE   = path.join(ROOT, 'setup/defaults.json');
const MAX_BODY        = 512 * 1024; // defaults.json is small; cap the write body

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
    const h = String(hostHeader).toLowerCase();
    const allowed = ['127.0.0.1:' + port, 'localhost:' + port, '[::1]:' + port];
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
                'X-Content-Type-Options': 'nosniff'
            });
            return res.end(html);
        }

        if (req.method === 'GET' && url === '/api/history') {
            let text = '';
            try { text = fs.readFileSync(historyFile, 'utf8'); } catch (e) { text = ''; }
            const runs = parseHistory(text);
            return sendJson(res, 200, { file: historyFile, runs: runs });
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
            let body = '';
            let tooBig = false;
            req.on('data', function(chunk) {
                if (tooBig) return;
                body += chunk;
                if (body.length > MAX_BODY) { tooBig = true; sendJson(res, 413, { error: 'body too large' }); req.destroy(); }
            });
            req.on('end', function() {
                if (tooBig) return;
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

        return sendJson(res, 404, { error: 'not found' });
    });

    return server;
}

// ── The page (self-contained: no CDN, no external asset) ──────────────────────

function renderPage() {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>Hephaestus — Dev Panel</title><style>' +
':root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--tx:#c9d1d9;--mu:#8b949e;--ac:#e25822;--gr:#3fb950;--rd:#f85149}' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--tx);padding:24px;line-height:1.5}' +
'h1{font-size:1.2rem;margin-bottom:4px}h1 span{color:var(--ac)}' +
'.sub{color:var(--mu);font-size:.8rem;margin-bottom:20px}' +
'.tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin-bottom:18px;flex-wrap:wrap}' +
'.tab{padding:8px 14px;cursor:pointer;color:var(--mu);border-bottom:2px solid transparent;font-size:.86rem}' +
'.tab.on{color:var(--tx);border-bottom-color:var(--ac)}' +
'.panel{display:none}.panel.on{display:block}' +
'table{width:100%;border-collapse:collapse;font-size:.82rem}' +
'th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--bd)}' +
'th{color:var(--mu);font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.04em}' +
'.card{background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:14px;margin-bottom:12px;overflow-x:auto}' +
'pre{font-family:"SF Mono",Menlo,monospace;font-size:.76rem;white-space:pre-wrap;word-break:break-word}' +
'textarea{width:100%;min-height:340px;background:#0d1117;color:var(--tx);border:1px solid var(--bd);border-radius:6px;padding:12px;font-family:"SF Mono",Menlo,monospace;font-size:.78rem}' +
'button{background:var(--ac);color:#fff;border:0;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:.82rem;margin-top:10px}' +
'button:disabled{opacity:.5;cursor:default}' +
'.msg{margin-left:10px;font-size:.8rem}.ok{color:var(--gr)}.err{color:var(--rd)}' +
'.empty{color:var(--mu);font-size:.84rem;padding:10px 0}' +
'a{color:var(--ac)}.k{color:var(--mu)}' +
'</style></head><body>' +
'<h1>⚒️ <span>Hephaestus</span> Dev Panel</h1>' +
'<div class="sub">Local only (127.0.0.1) · reads this repo · nothing leaves your machine</div>' +
'<div class="tabs">' +
'<div class="tab on" data-p="history">Run history</div>' +
'<div class="tab" data-p="snapshots">Snapshots</div>' +
'<div class="tab" data-p="defaults">Defaults</div>' +
'<div class="tab" data-p="docs">Docs</div>' +
'</div>' +
'<div id="history" class="panel on"><div class="card"><div id="hist">Loading…</div></div></div>' +
'<div id="snapshots" class="panel"><div class="card"><div id="snaps">Loading…</div></div></div>' +
'<div id="defaults" class="panel"><div class="card"><div class="k" id="dfile"></div>' +
'<textarea id="dtext" spellcheck="false"></textarea>' +
'<div><button id="dsave">Save defaults</button><span class="msg" id="dmsg"></span></div></div></div>' +
'<div id="docs" class="panel"><div class="card"><ul style="padding-left:18px;font-size:.86rem">' +
'<li><a href="/docs/index.html">docs/index.html</a> — local docs home</li>' +
'<li><a href="/docs/config-reference.html">config reference</a></li>' +
'<li><a href="/docs/features.html">features</a></li>' +
'<li><a href="/docs/quickstart.html">quickstart</a></li>' +
'<li><a href="/docs/snapshot-viewer.html">snapshot viewer</a></li>' +
'</ul><div class="empty">Links open the files on disk — serve them with your editor/browser if the panel is not hosting them.</div>' +
'</div></div>' +
'<script>' +
'function esc(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}' +
'document.querySelectorAll(".tab").forEach(function(t){t.onclick=function(){' +
'document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("on")});' +
'document.querySelectorAll(".panel").forEach(function(x){x.classList.remove("on")});' +
't.classList.add("on");document.getElementById(t.dataset.p).classList.add("on");};});' +
'fetch("/api/history").then(function(r){return r.json()}).then(function(d){' +
'var el=document.getElementById("hist");' +
'if(!d.runs||!d.runs.length){el.innerHTML=\'<div class="empty">No runs yet. Produce some with: <code>hephaestus summary results.json --history</code></div>\';return;}' +
'var rows=d.runs.slice(-50).reverse().map(function(r){return "<tr><td>"+esc(r.ts||"")+"</td><td>"+esc(r.passRate)+"%</td><td>"+esc(r.p95)+" ms</td><td>"+esc(r.total)+"</td><td>"+esc(r.failed)+"</td><td>"+esc(r.requests)+"</td></tr>";}).join("");' +
'el.innerHTML="<table><tr><th>When</th><th>Pass</th><th>p95</th><th>Asserts</th><th>Failed</th><th>Requests</th></tr>"+rows+"</table>";});' +
'fetch("/api/snapshots").then(function(r){return r.json()}).then(function(d){' +
'var el=document.getElementById("snaps");var keys=Object.keys(d.snapshots||{});' +
'if(!d.collection){el.innerHTML=\'<div class="empty">Start the panel with <code>-c &lt;collection.json&gt;</code> to browse snapshots.</div>\';return;}' +
'if(!keys.length){el.innerHTML=\'<div class="empty">No snapshots stored in \'+esc(d.collection)+\'</div>\';return;}' +
'el.innerHTML=keys.map(function(k){return "<div class=\\"card\\"><b>"+esc(k)+"</b><pre>"+esc(JSON.stringify(d.snapshots[k],null,2))+"</pre></div>";}).join("");});' +
'fetch("/api/defaults").then(function(r){return r.json()}).then(function(d){' +
'document.getElementById("dfile").textContent=d.file;' +
'document.getElementById("dtext").value=d.defaults?JSON.stringify(d.defaults,null,2):"";});' +
'document.getElementById("dsave").onclick=function(){' +
'var btn=this,msg=document.getElementById("dmsg");msg.textContent="";msg.className="msg";' +
'var txt=document.getElementById("dtext").value;' +
'try{JSON.parse(txt);}catch(e){msg.textContent="Invalid JSON: "+e.message;msg.className="msg err";return;}' +
'btn.disabled=true;' +
'fetch("/api/defaults",{method:"POST",headers:{"Content-Type":"application/json"},body:txt})' +
'.then(function(r){return r.json()}).then(function(d){btn.disabled=false;' +
'if(d.ok){msg.textContent="Saved ✓";msg.className="msg ok";}else{msg.textContent=d.error||"failed";msg.className="msg err";}})' +
'.catch(function(e){btn.disabled=false;msg.textContent=String(e);msg.className="msg err";});};' +
'</script></body></html>';
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

module.exports = { parseArgs, parseHistory, extractSnapshots, isLoopbackHost, isWriteAllowed, createPanelServer };
