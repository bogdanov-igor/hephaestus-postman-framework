/**
 * Hephaestus Plugin — PII / Secret Redactor
 *
 * Scans the response for credential- and PII-shaped values, reports WHERE they
 * were found, and registers the offending field names with the engine so its
 * own summary masks them.
 *
 * Two things it deliberately does NOT do:
 *   - it never prints a matched value, only a masked preview, because a leak
 *     detector that echoes the leak into CI logs has made the problem worse;
 *   - it does not fail the run by default. Most APIs legitimately return
 *     emails, and a plugin that cries wolf gets uninstalled by Friday.
 *
 * The redaction half works because plugins run immediately before
 * logger.summary: appending to `ctx.config.secrets` still reaches the logger,
 * which masks any body field or query param whose KEY contains one of those
 * substrings.
 *
 * Installation:
 *   1. Collection variable `hephaestus.plugin.pii` = this file's text.
 *   2. Collection Pre-request:
 *      pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *          { name: 'pii-redactor', post: 'hephaestus.plugin.pii' }
 *      ]));
 *
 * Config (override):
 *   piiSoft       boolean   true = warn only, false = fail the run   (default true)
 *   piiRedact     boolean   feed found keys into config.secrets      (default true)
 *   piiIgnore     string[]  key substrings to skip (allow-list)      (default [])
 *   piiKinds      string[]  subset of detector names to run          (default all)
 *   piiMaxDepth   number    recursion depth guard                    (default 12)
 */

(function piiRedactor(ctx) {
    'use strict';

    var cfg      = ctx.config;
    var soft     = cfg.piiSoft !== false;
    var redact   = cfg.piiRedact !== false;
    var ignore   = Array.isArray(cfg.piiIgnore) ? cfg.piiIgnore : [];
    var maxDepth = typeof cfg.piiMaxDepth === 'number' ? cfg.piiMaxDepth : 12;

    // Ordered most-severe first: a value that looks like a private key should
    // not be reported as "email" because the email pattern happened to match.
    var DETECTORS = [
        { kind: 'private-key', re: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/ },
        { kind: 'aws-key',     re: /\bAKIA[0-9A-Z]{16}\b/ },
        { kind: 'jwt',         re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/ },
        { kind: 'bearer',      re: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/i },
        { kind: 'card',        re: /\b(?:\d[ -]*?){13,19}\b/ },
        { kind: 'email',       re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ }
    ];

    var kinds = Array.isArray(cfg.piiKinds) && cfg.piiKinds.length ? cfg.piiKinds : null;
    var active = DETECTORS.filter(function(d) { return !kinds || kinds.indexOf(d.kind) !== -1; });
    if (active.length === 0) return;

    // Luhn — without it every 13+ digit id (orders, timestamps concatenated,
    // phone numbers) reports as a payment card and the finding becomes noise.
    function luhnOk(digits) {
        if (digits.length < 13 || digits.length > 19) return false;
        var sum = 0, alt = false, i;
        for (i = digits.length - 1; i >= 0; i--) {
            var n = digits.charCodeAt(i) - 48;
            if (alt) { n *= 2; if (n > 9) n -= 9; }
            sum += n;
            alt = !alt;
        }
        return sum % 10 === 0;
    }

    function classify(value) {
        var i, d;
        for (i = 0; i < active.length; i++) {
            d = active[i];
            if (!d.re.test(value)) continue;
            if (d.kind === 'card' && !luhnOk(value.replace(/[^0-9]/g, ''))) continue;
            return d.kind;
        }
        return null;
    }

    function mask(value) {
        var s = String(value);
        if (s.length <= 8) return '***';
        return s.slice(0, 3) + '***' + s.slice(-2) + ' (' + s.length + ' chars)';
    }

    function ignored(key) {
        var k = String(key).toLowerCase();
        return ignore.some(function(word) { return k.indexOf(String(word).toLowerCase()) !== -1; });
    }

    var findings = [];
    var seenKeys = {};

    function record(path, key, kind, value) {
        findings.push({ path: path, kind: kind, preview: mask(value) });
        if (key) seenKeys[key] = true;
    }

    function walk(node, path, depth) {
        if (depth > maxDepth || node === null || node === undefined) return;

        if (Array.isArray(node)) {
            // Cap array traversal: a 10k-row response would otherwise report the
            // same finding 10k times and stall the sandbox.
            node.slice(0, 50).forEach(function(item, i) {
                walk(item, path + '[' + i + ']', depth + 1);
            });
            return;
        }

        if (typeof node === 'object') {
            Object.keys(node).forEach(function(key) {
                if (ignored(key)) return;
                walk(node[key], path ? path + '.' + key : key, depth + 1);
            });
            return;
        }

        if (typeof node !== 'string' && typeof node !== 'number') return;

        var value = String(node);
        if (value.length < 6) return;

        var kind = classify(value);
        if (kind) {
            var key = path.split('.').pop().replace(/\[\d+\]$/, '');
            record(path, key, kind, value);
        }
    }

    if (ctx.response.parsed !== null && typeof ctx.response.parsed === 'object') {
        walk(ctx.response.parsed, '', 0);
    } else {
        // Unparseable body (HTML error page, plain text) — still worth scanning,
        // but there is no field name to report, only a kind.
        var raw = String(ctx.response.raw || '');
        active.forEach(function(d) {
            var m = raw.match(new RegExp(d.re.source, d.re.flags.indexOf('g') === -1 ? d.re.flags + 'g' : d.re.flags));
            if (!m) return;
            if (d.kind === 'card') m = m.filter(function(v) { return luhnOk(v.replace(/[^0-9]/g, '')); });
            if (m.length) record('<raw body>', null, d.kind, m[0]);
        });
    }

    if (findings.length === 0) return;

    // Dedupe by kind for the headline; the per-path detail follows.
    var byKind = {};
    findings.forEach(function(f) { byKind[f.kind] = (byKind[f.kind] || 0) + 1; });
    var headline = Object.keys(byKind).map(function(k) { return k + '×' + byKind[k]; }).join(', ');

    var lines = ['🔒 [pii-redactor] ' + findings.length + ' sensitive value(s): ' + headline];
    findings.slice(0, 10).forEach(function(f) {
        lines.push('   ↳ ' + f.kind + '  ' + (f.path || '<root>') + '  → ' + f.preview);
    });
    if (findings.length > 10) lines.push('   ↳ ... +' + (findings.length - 10) + ' more');
    console.warn(lines.join('\n'));

    if (redact) {
        var keys = Object.keys(seenKeys);
        if (keys.length > 0) {
            ctx.config.secrets = (ctx.config.secrets || []).concat(keys);
        }
    }

    ctx._meta.errors.push('pii-redactor: ' + findings.length + ' sensitive value(s) in response — ' + headline);

    if (!soft) {
        pm.test('🔒 [pii-redactor] no sensitive values in response', function() {
            pm.expect(findings.length, headline).to.equal(0);
        });
    }
}(ctx));
