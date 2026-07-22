'use strict';
/**
 * Hephaestus — sparkline helpers  v4.0.1
 *
 * Shared by `trends` (terminal) and `report` (HTML) so both render a run history
 * the same way. Kept as a tiny module because trends.js runs at top level and
 * calls process.exit(), which makes it unsafe to require.
 */

const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const MID   = SPARK[Math.floor((SPARK.length - 1) / 2)]; // flat bar for a degenerate series
const GAP   = '·';                                       // a run with no numeric value

// Unicode sparkline — ALWAYS one glyph per input point, so the bar count matches
// the run count. A non-finite point (a run missing the metric, a half-written
// history line) renders as a gap glyph rather than silently vanishing, which
// used to shorten the bar and desync it from the run count. An all-equal series
// (including a single value) renders as flat mid bars.
function sparkline(values) {
    if (!values.length) return '';
    // Min/max over the FINITE points only. Folded rather than Math.min(...values)
    // so a very long history cannot blow the argument/stack limit.
    let min = Infinity, max = -Infinity, anyFinite = false;
    for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (typeof v === 'number' && isFinite(v)) {
            anyFinite = true;
            if (v < min) min = v;
            if (v > max) max = v;
        }
    }
    if (!anyFinite) return values.map(function() { return GAP; }).join('');
    const range = max - min;
    return values.map(function(v) {
        if (typeof v !== 'number' || !isFinite(v)) return GAP;
        if (range === 0) return MID;
        return SPARK[Math.round((v - min) / range * (SPARK.length - 1))];
    }).join('');
}

// Change between the last two points; 0 when there is nothing to compare against.
function deltaOf(values) {
    if (values.length < 2) return 0;
    return values[values.length - 1] - values[values.length - 2];
}

// Parse a run-history JSONL file. Malformed lines are skipped rather than fatal —
// a half-written line from an interrupted run must not blank the whole view.
function parseHistory(text) {
    const runs = [];
    String(text || '').split('\n').forEach(function(line) {
        const s = line.trim();
        if (!s) return;
        try {
            const r = JSON.parse(s);
            if (r && typeof r === 'object') runs.push(r);
        } catch (e) { /* skip */ }
    });
    return runs;
}

module.exports = { sparkline, deltaOf, parseHistory, SPARK, MID };
