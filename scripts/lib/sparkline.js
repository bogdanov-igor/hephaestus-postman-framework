'use strict';
/**
 * Hephaestus — sparkline helpers  v4.0.0
 *
 * Shared by `trends` (terminal) and `report` (HTML) so both render a run history
 * the same way. Kept as a tiny module because trends.js runs at top level and
 * calls process.exit(), which makes it unsafe to require.
 */

const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const MID   = SPARK[Math.floor((SPARK.length - 1) / 2)]; // flat bar for a degenerate series

// Unicode sparkline. An all-equal series (including a single value) renders as a
// flat mid bar instead of dividing by a zero range.
function sparkline(values) {
    if (!values.length) return '';
    // Fold min/max rather than Math.min.apply(...values) so a very long history
    // cannot blow the argument/stack limit with a RangeError.
    let min = values[0], max = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] < min) min = values[i];
        if (values[i] > max) max = values[i];
    }
    const range = max - min;
    return values.map(function(v) {
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
