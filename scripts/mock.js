#!/usr/bin/env node
/**
 * Hephaestus — Local Mock Server  v3.9.0
 *
 * Replays saved Hephaestus snapshots as a zero-dependency HTTP server, so a
 * frontend (or any client) can develop offline against the recorded API.
 * Incoming requests are matched by METHOD + PATH against the collection's
 * requests; the matched snapshot's status, body and content type are replayed.
 *
 * Usage:
 *   node scripts/mock.js <collection.json> [-p <port>] [--filter <substr>] [--no-cors] [--quiet]
 *   hephaestus mock       <collection.json> [-p <port>] [--filter <substr>] [--no-cors] [--quiet]
 *
 * Snapshots live in the collection's `hephaestus.snapshots` variable
 * (key: {collection}::{request}::{status}::{format}). A request's path comes
 * from its collection item; when a request has several snapshots, a 2xx / json
 * one is preferred. Dynamic path segments ({{id}}, :id) match literally.
 *
 * The pure helpers (buildRoutes / matchRoute / serialize / urlPath) are exported
 * for unit testing; the HTTP server starts only when the file is run directly.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');

const VERSION = '3.9.0';

const STATUS_TEXT = {
    200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
    301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
    405: 'Method Not Allowed', 409: 'Conflict', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
    500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout'
};

// ─── Pure helpers (exported + unit-tested) ────────────────────────────────────

// Collapse duplicate slashes and drop a trailing slash (root stays '/').
function normalizePath(p) {
    if (!p) return '/';
    p = String(p).replace(/\/{2,}/g, '/');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
}

// Extract the request path from a Postman URL (string or {raw, path[]}),
// stripping protocol/host/query so matching is host-agnostic ({{baseUrl}} etc.).
function urlPath(url) {
    if (url && Array.isArray(url.path) && url.path.length) {
        return normalizePath('/' + url.path.map(function (s) { return String(s); }).join('/'));
    }
    var raw = typeof url === 'string' ? url : (url && url.raw) || '';
    raw = raw.split('?')[0].split('#')[0].replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    var slash = raw.indexOf('/');
    return normalizePath(slash === -1 ? '/' : raw.slice(slash));
}

// Render a snapshot into an HTTP body + content type.
function serialize(snap) {
    var format = (snap && snap.format) || 'json';
    var data   = snap ? snap.data : undefined;
    // Only 'text' is served raw; json/xml (xml snapshots store parsed JSON) are
    // JSON-encoded, so a top-level string / number / null round-trips as valid JSON
    // instead of being emitted bare under an application/json content type.
    var isText = format === 'text';
    var body   = isText
        ? String(data === undefined || data === null ? '' : data)
        : JSON.stringify(data === undefined ? null : data, null, 2);
    var contentType = isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8';
    // Clamp to a valid HTTP status so one odd snapshot can't make writeHead throw.
    var code = parseInt(snap && snap.statusCode, 10);
    if (!(code >= 100 && code <= 599)) code = 200;
    return { body: body, contentType: contentType, statusCode: code };
}

// Snapshot preference key: 2xx before other statuses, json before other formats,
// then lower status code. Lower tuple wins.
function snapScore(snap) {
    var code   = (snap && snap.statusCode) || 0;
    var is2xx  = (code >= 200 && code < 300) ? 0 : 1;
    var isJson = (snap && snap.format) === 'json' ? 0 : 1;
    return [is2xx, isJson, code];
}

function betterSnap(a, b) {
    var sa = snapScore(a), sb = snapScore(b);
    for (var i = 0; i < sa.length; i++) {
        if (sa[i] !== sb[i]) return sa[i] < sb[i];
    }
    return false;
}

function walkRequests(items, fn) {
    if (!Array.isArray(items)) return;
    items.forEach(function (item) {
        if (item && item.item) { walkRequests(item.item, fn); return; }   // folder
        if (item && item.request) fn(item);
    });
}

// Build the route table from a parsed collection.
// Returns { routes, orphans, requestCount, snapshotCount }.
// Throws if hephaestus.snapshots is present but not valid JSON.
function buildRoutes(collection, filter) {
    var variables = (collection && collection.variable) || [];
    var snapVar   = variables.filter(function (v) { return v && v.key === 'hephaestus.snapshots'; })[0];

    var snapshots = {};
    if (snapVar && snapVar.value) {
        snapshots = typeof snapVar.value === 'string' ? JSON.parse(snapVar.value) : snapVar.value;
    }
    // A valid-JSON but non-object value ("null", "[]", a number) must not crash Object.keys.
    if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) snapshots = {};

    var keys = Object.keys(snapshots).filter(function (k) {
        return !filter || k.indexOf(filter) !== -1;
    });

    // requestName -> best snapshot
    var byRequest = {};
    keys.forEach(function (key) {
        var requestName = key.split('::')[1] || '';
        if (!requestName) return;
        var snap = snapshots[key];
        if (!byRequest[requestName] || betterSnap(snap, byRequest[requestName])) {
            byRequest[requestName] = snap;
        }
    });

    var routes     = {};   // "METHOD /path" -> route
    var matched    = {};
    var collisions = [];   // distinct requests that resolve to the same METHOD+path
    walkRequests(collection && collection.item, function (item) {
        var snap = byRequest[item.name];
        if (!snap) return;
        var method = String((item.request && item.request.method) || 'GET').toUpperCase();
        var p      = urlPath(item.request && item.request.url);
        var ser    = serialize(snap);
        var key    = method + ' ' + p;
        if (routes[key]) collisions.push({ route: key, dropped: routes[key].requestName, kept: item.name });
        routes[key] = {
            method: method, path: p, requestName: item.name,
            statusCode: ser.statusCode, contentType: ser.contentType, body: ser.body
        };
        matched[item.name] = true;
    });

    var orphans = Object.keys(byRequest).filter(function (n) { return !matched[n]; });
    return { routes: routes, orphans: orphans, collisions: collisions, requestCount: Object.keys(byRequest).length, snapshotCount: keys.length };
}

function matchRoute(routes, method, pathname) {
    return routes[String(method).toUpperCase() + ' ' + normalizePath(pathname)] || null;
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

function createServer(routes, opts) {
    opts = opts || {};
    var cors   = opts.cors !== false;
    var onHit  = typeof opts.onRequest === 'function' ? opts.onRequest : function () {};

    return http.createServer(function (req, res) {
        var pathname   = (req.url || '/').split('?')[0];
        var normalized = normalizePath(pathname);
        var corsHeaders = cors ? {
            'Access-Control-Allow-Origin':  '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        } : {};

        try {
            // CORS preflight — answer without needing a snapshot.
            if (cors && req.method === 'OPTIONS') {
                res.writeHead(204, corsHeaders);
                res.end();
                onHit(req.method, normalized, 204, 'cors');
                return;
            }

            var route = matchRoute(routes, req.method, normalized);
            if (!route) {
                var missBody = JSON.stringify({
                    error: 'No snapshot for ' + req.method + ' ' + normalized,
                    hint:  'Record it first, or check the method/path.'
                }, null, 2);
                res.writeHead(404, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'X-Hephaestus-Mock': 'miss' }, corsHeaders));
                res.end(missBody);
                onHit(req.method, normalized, 404, 'miss');
                return;
            }

            res.writeHead(route.statusCode, Object.assign({ 'Content-Type': route.contentType, 'X-Hephaestus-Mock': 'hit' }, corsHeaders));
            res.end(route.body);
            onHit(req.method, normalized, route.statusCode, 'hit');
        } catch (e) {
            // One odd request must never take down the whole server.
            try {
                res.writeHead(500, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'X-Hephaestus-Mock': 'error' }, corsHeaders));
                res.end(JSON.stringify({ error: 'mock server error', detail: e && e.message ? e.message : String(e) }));
            } catch (e2) { try { res.end(); } catch (e3) { /* socket already gone */ } }
            onHit(req.method, normalized, 500, 'error');
        }
    });
}

// ─── Exports (for tests) ──────────────────────────────────────────────────────

module.exports = {
    normalizePath: normalizePath,
    urlPath: urlPath,
    serialize: serialize,
    snapScore: snapScore,
    betterSnap: betterSnap,
    buildRoutes: buildRoutes,
    matchRoute: matchRoute,
    createServer: createServer
};

// ─── CLI (only when run directly) ─────────────────────────────────────────────

if (require.main === module) {
    var args     = process.argv.slice(2);
    var wantHelp = args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1;
    var noColor  = args.indexOf('--no-color') !== -1;
    var quiet    = args.indexOf('--quiet') !== -1;
    var cors     = args.indexOf('--no-cors') === -1;
    var inputFile = args.filter(function (a) { return a.charAt(0) !== '-'; })[0];

    var pIdx = args.indexOf('-p'); if (pIdx === -1) pIdx = args.indexOf('--port');
    var port = pIdx !== -1 && args[pIdx + 1] ? parseInt(args[pIdx + 1], 10) : 3000;

    var fIdx   = args.indexOf('--filter');
    var filter = fIdx !== -1 ? args[fIdx + 1] : null;

    var C = {
        dim:   function (s) { return noColor ? s : '\x1b[2m'  + s + '\x1b[0m'; },
        bold:  function (s) { return noColor ? s : '\x1b[1m'  + s + '\x1b[0m'; },
        green: function (s) { return noColor ? s : '\x1b[32m' + s + '\x1b[0m'; },
        red:   function (s) { return noColor ? s : '\x1b[31m' + s + '\x1b[0m'; },
        cyan:  function (s) { return noColor ? s : '\x1b[36m' + s + '\x1b[0m'; }
    };

    if (wantHelp || !inputFile) {
        console.log([
            '',
            '⚒️  Hephaestus Mock  v' + VERSION,
            '',
            'Replay saved snapshots as a local HTTP API — develop offline against a recorded backend.',
            '',
            'Usage: hephaestus mock <collection.json> [options]',
            '',
            'Options:',
            '  -p, --port <n>    Port to listen on (default: 3000)',
            '  --filter <substr> Only mount snapshots whose key contains <substr>',
            '  --no-cors         Do not send permissive CORS headers',
            '  --quiet           Do not log each served request',
            '  --no-color        Disable ANSI colours',
            '  --help, -h        This help',
            ''
        ].join('\n'));
        process.exit(wantHelp ? 0 : 1);
    }

    var collection;
    try {
        collection = JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf8'));
    } catch (e) {
        console.error(C.red('❌ Cannot read/parse collection: ') + e.message);
        process.exit(1);
    }

    var built;
    try {
        built = buildRoutes(collection, filter);
    } catch (e) {
        console.error(C.red('❌ hephaestus.snapshots is not valid JSON: ') + e.message);
        process.exit(1);
    }

    var routeKeys = Object.keys(built.routes);
    if (routeKeys.length === 0) {
        console.error(C.red('⚠️  No mountable snapshots found') + (filter ? ' matching "' + filter + '"' : '') +
            '. Record snapshots first (snapshot.enabled + a run), then export the collection.');
        if (built.requestCount > 0 && built.orphans.length) {
            console.error(C.dim('   ' + built.orphans.length + ' snapshot request name(s) had no matching request in the collection.'));
        }
        process.exit(1);
    }

    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        console.error(C.red('❌ Invalid port: ') + (pIdx !== -1 ? args[pIdx + 1] : port) + C.dim('  (expected an integer 0–65535)'));
        process.exit(1);
    }

    var server = createServer(built.routes, {
        cors: cors,
        onRequest: function (method, p, code, kind) {
            if (quiet) return;
            var mark = kind === 'miss' ? C.red('✗') : C.green('✓');
            console.log('  ' + mark + ' ' + C.bold(method) + ' ' + p + C.dim('  → ' + code));
        }
    });

    server.on('error', function (e) {
        if (e && e.code === 'EADDRINUSE') {
            console.error(C.red('❌ Port ' + port + ' is already in use.') + ' Pass a free one, e.g. ' + C.cyan('-p ' + (port + 1)) + '.');
        } else {
            console.error(C.red('❌ Server error: ') + (e && e.message ? e.message : e));
        }
        process.exit(1);
    });

    server.listen(port, '127.0.0.1', function () {
        var base = 'http://127.0.0.1:' + port;
        console.log('');
        console.log(C.bold('  ⚒️  Hephaestus Mock  ') + C.dim('v' + VERSION));
        console.log(C.dim('  ' + '─'.repeat(58)));
        console.log('  ' + C.green('▶') + ' listening on ' + C.cyan(base) + C.dim('   (Ctrl-C to stop)'));
        console.log(C.dim('  ' + built.snapshotCount + ' snapshot(s) → ' + routeKeys.length + ' route(s)' +
            (cors ? ', CORS on' : ', CORS off')) );
        console.log('');
        routeKeys.sort().forEach(function (k) {
            var r = built.routes[k];
            console.log('  ' + C.dim('•') + ' ' + C.bold(r.method) + ' ' + r.path +
                C.dim('  → ' + r.statusCode + ' ' + (STATUS_TEXT[r.statusCode] || '')) +
                C.dim('   [' + r.requestName + ']'));
        });
        if (built.collisions.length) {
            console.log('');
            built.collisions.forEach(function (col) {
                console.log(C.dim('  ⚠ collision: "' + col.dropped + '" hidden by "' + col.kept + '" at ' + col.route));
            });
        }
        if (built.orphans.length) {
            console.log('');
            console.log(C.dim('  ⚠ ' + built.orphans.length + ' snapshot request name(s) not found in the collection: ' + built.orphans.join(', ')));
        }
        console.log('');
    });

    process.on('SIGINT',  function () { server.close(function () { process.exit(0); }); });
    process.on('SIGTERM', function () { server.close(function () { process.exit(0); }); });
}
