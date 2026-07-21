/**
 * Hephaestus Plugin — CSV Metrics Appender
 *
 * Appends one CSV row per request — timing, size, and every module's verdict —
 * so a run can be diffed against yesterday's in a spreadsheet or loaded into a
 * dashboard.
 *
 * Why CSV and not the engine's `ci: true` JSON: the CI line is per-request and
 * meant for a log parser. This produces a single table for the WHOLE run,
 * printed once between markers that a shell can cut out with sed/awk without
 * needing a JSON tool in the pipeline.
 *
 * Installation:
 *   1. Collection variable `hephaestus.plugin.csv` = this file's text.
 *   2. Collection Pre-request:
 *      pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *          { name: 'csv-metrics', post: 'hephaestus.plugin.csv' }
 *      ]));
 *      if (!pm.info.iteration) pm.collectionVariables.unset('hephaestus.plugin.csvRows');
 *
 *      The unset matters: collection variables persist between runs, so without
 *      it the table accumulates across every run you have ever done.
 *   3. Extract from a Newman run:
 *      newman run c.json | sed -n '/HEPHAESTUS_CSV_BEGIN/,/HEPHAESTUS_CSV_END/p' \
 *        | grep -v HEPHAESTUS_CSV > metrics.csv
 *
 * Config (override):
 *   csvPrint    boolean  dump the table on this request        (default false)
 *   csvMaxRows  number   ring-buffer cap                       (default 1000)
 *   csvVar      string   collection variable holding the rows
 *   csvUrl      boolean  include the request URL column        (default false)
 *
 * Printing: automatic on the final iteration of a data-driven run. For a
 * single-pass collection set `csvPrint: true` on the LAST request.
 */

(function csvMetrics(ctx) {
    'use strict';

    var cfg     = ctx.config;
    var VAR     = cfg.csvVar || 'hephaestus.plugin.csvRows';
    var MAX     = typeof cfg.csvMaxRows === 'number' ? cfg.csvMaxRows : 1000;
    var withUrl = cfg.csvUrl === true;

    var results = ctx._meta.results;

    function ratio(list) {
        if (!Array.isArray(list) || list.length === 0) return '';
        var ok = list.filter(function(x) { return x.ok; }).length;
        return ok + '/' + list.length;
    }

    // RFC 4180: quote everything containing a comma, quote, or newline, and
    // double any embedded quote. Request names are user-authored, so this is
    // not a theoretical concern.
    function esc(value) {
        if (value === null || value === undefined) return '';
        var s = String(value);
        if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    var columns = ['timestamp', 'request', 'method'];
    if (withUrl) columns.push('url');
    columns = columns.concat([
        'status', 'time_ms', 'size_bytes', 'format', 'iteration',
        'found', 'saved', 'counts', 'headers', 'snapshot', 'schema', 'security', 'errors'
    ]);

    var row = [ctx._meta.processedAt, ctx.request.name, ctx.request.method];
    if (withUrl) row.push(ctx.request.url);
    row = row.concat([
        ctx.response.code,
        ctx.response.time,
        ctx.response.size,
        ctx.response.format,
        ctx.iteration.index,
        ratio(results.found),
        ratio(results.saved),
        ratio(results.counts),
        ratio(results.headers),
        results.snapshot ? results.snapshot.status : '',
        results.schema ? (results.schema.valid ? 'valid' : 'invalid') : '',
        results.security ? (results.security.ok ? 'ok' : results.security.findings.length + ' findings') : '',
        ctx._meta.errors.length
    ]);

    var rows = [];
    try {
        rows = JSON.parse(pm.collectionVariables.get(VAR) || '[]');
        if (!Array.isArray(rows)) rows = [];
    } catch (e) {
        rows = [];
    }

    rows.push(row.map(esc).join(','));
    if (rows.length > MAX) rows = rows.slice(-MAX);

    try {
        pm.collectionVariables.set(VAR, JSON.stringify(rows));
    } catch (e) {
        ctx._meta.errors.push('csv-metrics: cannot persist rows — ' + e.message);
        return;
    }

    var lastIteration = ctx.iteration.count > 1 && ctx.iteration.index === ctx.iteration.count - 1;
    if (cfg.csvPrint !== true && !lastIteration) return;

    console.log([
        'HEPHAESTUS_CSV_BEGIN',
        columns.join(','),
        rows.join('\n'),
        'HEPHAESTUS_CSV_END'
    ].join('\n'));
}(ctx));
