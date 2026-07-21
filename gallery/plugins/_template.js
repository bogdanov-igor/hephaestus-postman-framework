/**
 * Hephaestus Plugin — Template
 *
 * Copy this file, rename it, delete everything you do not need.
 *
 * ── EXECUTION MODEL ─────────────────────────────────────────────
 * A plugin is NOT a set of hooks. The engine has exactly one plugin
 * extension point: `plugins.run(ctx)`, which `eval`s your code inside
 * the post-request IIFE. Your file therefore runs ONCE per request,
 * near the end of the pipeline:
 *
 *   configMerge → iterationData → normalizeResponse → [retryOnStatus?]
 *     → metrics → extractor → assertions → assertEach → assertShape
 *     → graphql → assertOrder → assertUnique → assertHeaders
 *     → snapshot → schema → securityAudit → ►YOUR PLUGIN◄
 *     → logger.summary
 *
 * Two consequences worth designing around:
 *   1. Every assertion result is already in `ctx._meta.results` — you can
 *      read the verdict of the whole run, not just the raw response.
 *   2. `logger.summary` has NOT run yet — mutating `ctx.config` here still
 *      changes how the engine prints its own summary (see `secrets` below).
 *
 * If the response never arrived (retryOnStatus fired) the pipeline stops
 * before plugins — your code simply does not run that iteration.
 *
 * ── INSTALLATION ────────────────────────────────────────────────
 *   1. Collection variable `hephaestus.plugin.<name>` = this file's text.
 *   2. Collection Pre-request script registers it by VARIABLE NAME:
 *
 *      pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *          { name: 'my-plugin', post: 'hephaestus.plugin.my' }
 *      ]));
 *
 *      The descriptor key is `post` and its value is the NAME of the
 *      variable holding the code — not the code itself.
 *   3. Configure via the request's `override` object; keys land in ctx.config.
 */

(function myPlugin(ctx) {
    'use strict';

    // ── ctx.config ──────────────────────────────────────────────
    // Merged engine config + this request's `override`. Put your own
    // keys in `override` and read them here. Namespace them so they
    // cannot collide with engine options.
    var enabled = ctx.config.myPluginEnabled !== false; // opt-out, default on
    if (!enabled) return;

    // ── ctx.request ─────────────────────────────────────────────
    // { method, name, url } — `name` is the Postman request name, which is
    // the only stable per-request identity available in the sandbox.
    var label = ctx.request.name + ' [' + ctx.request.method + ']';

    // ── ctx.response ────────────────────────────────────────────
    // code        — HTTP status (number)
    // time        — response time in ms
    // size        — response size in bytes
    // raw         — response body as text, always present
    // parsed      — body parsed to an object, or null if unparseable
    // contentType — lowercased mime type, no charset
    // format      — 'json' | 'xml' | 'text' | 'unknown'
    // Prefer `parsed` and fall back to `raw`: a 204 or an HTML error page
    // leaves `parsed` null, and that is the case that breaks naive plugins.
    var body = ctx.response.parsed;

    // ── ctx.api ─────────────────────────────────────────────────
    // Path accessors over the PARSED body. Supports dots, [0] and [*]:
    //   get(path)          → value at path, or undefined
    //   find(path, fn?)    → array at path, optionally filtered
    //   all(path, fn?)     → explicit synonym of find
    //   count(path)        → array length at path, 0 if absent
    //   save(path, target) → extract and persist; target is
    //                        { name, scope: 'collection'|'environment'|'local' }
    // NOTE: ctx.api carries ONLY these five functions. Status and timing
    // live on ctx.response, not here.
    var firstId = ctx.api.get('data.items[0].id');

    // ── ctx.iteration ───────────────────────────────────────────
    // { index, count, data, get(key) } — Newman --iteration-data.
    // index is 0-based, so the final iteration is index === count - 1.
    // Use that to emit a report exactly once at the end of a data-driven run.
    var isLastIteration = ctx.iteration.index === ctx.iteration.count - 1;

    // ── ctx._meta ───────────────────────────────────────────────
    // version     — engine version string
    // processedAt — ISO timestamp of this response
    // errors      — string[]; push here to surface a soft problem in the summary
    // results     — every module's verdict, populated BEFORE your plugin runs:
    //     found:    [{ name, path, ok, skipped? }]
    //     saved:    [{ name, scope, ok }]
    //     counts:   [{ alias, length, expected, ok }]
    //     headers:  [{ name, value?, ok, status? }]
    //     snapshot: { status: 'recorded'|'missing'|'saved'|'match'|'diff', key, diff? } | null
    //     schema:   { valid, errors } | null
    //     security: { findings, ok } | null
    // The flag is `ok`, not `passed`, and absent modules stay null — always
    // guard before reading.
    var results = ctx._meta.results;
    var failedChecks = results.found.filter(function(f) { return !f.ok; }).length;

    // ── _override ───────────────────────────────────────────────
    // The raw per-request override object, before merging. Read it when you
    // need to distinguish "explicitly set to the default" from "not set".
    // Available as a bare identifier, not a property of ctx.

    // ── pm ──────────────────────────────────────────────────────
    // The full Postman SDK. The parts that matter for plugins:
    //   pm.test(name, fn)              — add a test to the run's verdict
    //   pm.expect(value)               — chai assertions
    //   pm.collectionVariables         — the only state that survives across
    //                                    requests; use it to accumulate
    //   pm.environment / pm.variables  — env and local scopes
    //   pm.sendRequest(opts, cb)       — fire-and-forget HTTP (notifiers)
    //   pm.info.requestName / iteration
    //   console.log / warn / error     — Newman captures these

    // Fail the run:
    pm.test('🔌 [my-plugin] ' + label, function() {
        pm.expect(ctx.response.code).to.be.below(500);
    });

    // Warn without failing — shows up in the engine summary:
    if (failedChecks > 0) {
        ctx._meta.errors.push('my-plugin: ' + failedChecks + ' extraction(s) failed');
    }

    // Mutate the engine's own redaction list. `secrets` is a list of KEY-NAME
    // substrings; the logger masks any body field or query param whose key
    // contains one. Appending here works only because plugins run before
    // logger.summary.
    ctx.config.secrets = (ctx.config.secrets || []).concat(['sessionId']);

    // Accumulate across requests. Collection variables are strings, so
    // JSON round-trip, and always cap the buffer — Postman keeps these
    // between runs and an uncapped array grows until the sandbox chokes.
    var BUF = 'hephaestus.plugin.myBuffer';
    var buf = [];
    try { buf = JSON.parse(pm.collectionVariables.get(BUF) || '[]'); } catch (e) { buf = []; }
    buf.push({ n: ctx.request.name, t: ctx.response.time });
    if (buf.length > 200) buf = buf.slice(-200);
    pm.collectionVariables.set(BUF, JSON.stringify(buf));

    if (isLastIteration) {
        console.log('🔌 [my-plugin] collected ' + buf.length + ' samples, first id: ' + firstId);
    }

    // Anything you throw is caught by the engine, reported as a failing test
    // named after your plugin, and the remaining plugins still run. You do not
    // need a top-level try/catch — but you DO need one around pm.sendRequest
    // callbacks and JSON.parse of external data, since those escape it.
    void body;
}(ctx));
