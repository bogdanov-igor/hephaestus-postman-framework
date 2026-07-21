/**
 * Hephaestus Plugin — Timing Histogram
 *
 * Accumulates response times across a run and prints an ASCII histogram plus
 * p50 / p90 / p95 / max.
 *
 * Why percentiles and not an average: one 4-second outlier hides inside a mean
 * but shows up immediately in p95, and it is the outlier that wakes people up.
 *
 * Installation:
 *   1. Collection variable `hephaestus.plugin.histogram` = this file's text.
 *   2. Collection Pre-request:
 *      pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *          { name: 'timing-histogram', post: 'hephaestus.plugin.histogram' }
 *      ]));
 *   3. Samples live in a collection variable and therefore SURVIVE between
 *      runs. Clear them at the start of each run, in the same Pre-request:
 *      if (!pm.info.iteration) pm.collectionVariables.unset('hephaestus.plugin.timings');
 *
 * Config (override):
 *   histogramPrint    boolean  force the report on this request   (default false)
 *   histogramBuckets  number[] upper edges in ms                  (default below)
 *   histogramMax      number   ring-buffer cap                    (default 500)
 *   histogramVar      string   collection variable for samples
 *
 * Reporting: automatic on the final iteration of a data-driven run
 * (index === count - 1 with count > 1). For a single-pass collection set
 * `histogramPrint: true` in the override of the LAST request.
 */

(function timingHistogram(ctx) {
    'use strict';

    var cfg     = ctx.config;
    var VAR     = cfg.histogramVar || 'hephaestus.plugin.timings';
    var MAX     = typeof cfg.histogramMax === 'number' ? cfg.histogramMax : 500;
    var buckets = Array.isArray(cfg.histogramBuckets) && cfg.histogramBuckets.length
        ? cfg.histogramBuckets.slice().sort(function(a, b) { return a - b; })
        : [100, 250, 500, 1000, 2000, 5000];

    var samples = [];
    try {
        samples = JSON.parse(pm.collectionVariables.get(VAR) || '[]');
        if (!Array.isArray(samples)) samples = [];
    } catch (e) {
        samples = []; // corrupted buffer must not kill the run
    }

    samples.push({ n: ctx.request.name, t: ctx.response.time, c: ctx.response.code });
    if (samples.length > MAX) samples = samples.slice(-MAX);

    try {
        pm.collectionVariables.set(VAR, JSON.stringify(samples));
    } catch (e) {
        ctx._meta.errors.push('timing-histogram: cannot persist samples — ' + e.message);
        return;
    }

    var lastIteration = ctx.iteration.count > 1 && ctx.iteration.index === ctx.iteration.count - 1;
    if (cfg.histogramPrint !== true && !lastIteration) return;
    if (samples.length === 0) return;

    var times = samples.map(function(s) { return s.t; }).sort(function(a, b) { return a - b; });

    // Nearest-rank percentile: no interpolation, so every reported value is a
    // response that actually happened.
    function pct(p) {
        var rank = Math.ceil((p / 100) * times.length) - 1;
        return times[Math.min(Math.max(rank, 0), times.length - 1)];
    }

    var counts = new Array(buckets.length + 1).fill(0);
    times.forEach(function(t) {
        var i = 0;
        while (i < buckets.length && t > buckets[i]) i++;
        counts[i]++;
    });

    var peak  = Math.max.apply(null, counts);
    var lines = [];

    lines.push('📊 [timing-histogram] ' + times.length + ' samples');

    counts.forEach(function(count, i) {
        var label = i < buckets.length
            ? '≤ ' + buckets[i] + 'ms'
            : '> ' + buckets[buckets.length - 1] + 'ms';
        var width = peak > 0 ? Math.round((count / peak) * 32) : 0;
        var bar   = new Array(width + 1).join('█');
        while (label.length < 10) label += ' ';
        lines.push('   ' + label + ' ' + (bar || '·') + ' ' + count);
    });

    lines.push('   ─────────────────────────────────────────');
    lines.push('   p50 ' + pct(50) + 'ms   p90 ' + pct(90) + 'ms   p95 ' + pct(95) + 'ms   max ' + times[times.length - 1] + 'ms');

    // Name the worst offenders — a histogram tells you something is slow, this
    // tells you what to open first.
    var slowest = samples.slice().sort(function(a, b) { return b.t - a.t; }).slice(0, 3);
    slowest.forEach(function(s) {
        lines.push('   ↳ ' + s.t + 'ms  ' + s.n + ' (' + s.c + ')');
    });

    console.log(lines.join('\n'));
}(ctx));
