// ════════════════════════════════════════════════════════════
// SHARED MODULE: retry-after — parse an HTTP `Retry-After` header to milliseconds
//
// Single source of truth for turning a server's `Retry-After` value into a
// wait in ms. Bundled into the post-request engine plane by `npm run build:emit`
// (esbuild inline) AND require-able from Node so scripts/test.js can unit-test
// the parse directly (the golden harness can't drive a setNextRequest retry loop).
//
// RFC 7231 §7.1.3 — `Retry-After` is either:
//   • delta-seconds  — a non-negative integer count of seconds ("120")
//   • an HTTP-date   — an absolute time ("Wed, 21 Oct 2015 07:28:00 GMT")
//
// `nowMs` is passed in (not read via Date.now()) so the function is pure and
// deterministically testable. Returns:
//   • a wait in ms (>= 0) when the header is a valid delta-seconds or a date
//   • 0 for a date already in the past (retry immediately)
//   • null when the header is absent, empty, or unparseable (caller decides)
// ════════════════════════════════════════════════════════════
export function parseRetryAfterMs(value, nowMs) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    if (s === '') return null;

    // delta-seconds: a bare non-negative integer number of seconds.
    if (/^\d+$/.test(s)) {
        return parseInt(s, 10) * 1000;
    }

    // HTTP-date. An IMF-fixdate always carries alphabetic tokens (day name, month
    // name, "GMT"); requiring a letter rejects numeric junk that Date.parse would
    // otherwise coerce into a bogus date ("-5", "12.5", "1e3").
    if (!/[A-Za-z]/.test(s)) return null;
    const when = Date.parse(s);
    if (isNaN(when)) return null;
    const diff = when - nowMs;
    return diff > 0 ? diff : 0;
}
