#!/usr/bin/env node
/**
 * Hephaestus — unified CLI  v3.9.0
 *
 * One command instead of `node scripts/<x>.js`. Works via npx without cloning:
 *   npx hephaestus-postman-framework <command> [args]
 * or, installed globally / as a dependency:
 *   hephaestus <command> [args]
 *
 * Each command delegates to the matching script in ../scripts, forwarding args
 * and propagating the exit code (so CI gating keeps working).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT    = path.join(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');

// User-facing commands only. Maintainer tasks (build, test, engine tests) stay
// as `npm run …` because they only make sense inside the repo.
const COMMANDS = {
    summary: { script: 'summary.js',         usage: 'summary <results.json> [--md] [--sla=<ms>]',        about: 'Newman run summary + p50/p95/p99 (SLA gate via --sla)' },
    compare: { script: 'compare.js',         usage: 'compare <before.json> <after.json> [--md]',         about: 'Diff two Newman runs (CI regression gate)' },
    flaky:   { script: 'flaky.js',           usage: 'flaky <run1.json> <run2.json> ... [--fail-on-flaky]', about: 'Find assertions that flap across repeated runs' },
    report:  { script: 'generate-report.js', usage: 'report <results.json> [out.html]',                  about: 'Self-contained HTML report' },
    junit:   { script: 'ci-to-junit.js',     usage: 'junit <results.json|-> [out.xml]',                  about: 'Convert Newman JSON to JUnit XML' },
    migrate: { script: 'migrate.js',         usage: 'migrate <collection.json> [--template] [--json]',   about: 'Classify a collection\'s migration state' },
    docs:    { script: 'docs.js',            usage: 'docs <collection.json> [-o out.md] [--json]',       about: 'Generate API docs from a collection' },
    'sync-examples': { script: 'sync-examples.js', usage: 'sync-examples <collection.json> [-o out.json]', about: 'Snapshots → Postman Example Responses' },
    openapi: { script: 'openapi-import.js',  usage: 'openapi <spec.yaml|json> [-o collection.json]',      about: 'OpenAPI/Swagger → Hephaestus collection' },
    coverage:{ script: 'coverage.js',        usage: 'coverage --spec <spec> <collection.json> [--min N]', about: 'OpenAPI/Swagger coverage of a collection' },
    init:    { script: 'init.js',            usage: 'init [--defaults]',                                 about: 'Interactive config/environment wizard' },
    watch:   { script: 'watch.js',           usage: 'watch -c <collection.json> [-e env.json]',          about: 'Re-run Newman on file changes' },
    trends:  { script: 'trends.js',          usage: 'trends [history.jsonl] [--last N] [--json]',        about: 'Pass-rate / p95 sparkline trends across runs' },
    mock:    { script: 'mock.js',            usage: 'mock <collection.json> [-p <port>] [--filter <s>]', about: 'Replay saved snapshots as a local mock API' },
    doctor:  { script: 'doctor.js',          usage: 'doctor [-e <env.json>] [--json]',                   about: 'Pre-flight health check: engine integrity, versions, drift' }
};

const pkgVersion = require(path.join(ROOT, 'package.json')).version;

function printHelp() {
    const lines = [
        '',
        '⚒️  Hephaestus CLI  v' + pkgVersion,
        '',
        'Usage: hephaestus <command> [args]',
        '',
        'Commands:'
    ];
    const pad = Math.max.apply(null, Object.keys(COMMANDS).map(function (c) { return c.length; }));
    Object.keys(COMMANDS).forEach(function (c) {
        lines.push('  ' + c + ' '.repeat(pad - c.length) + '   ' + COMMANDS[c].about);
    });
    lines.push('');
    lines.push('Run "hephaestus <command> --help" for command-specific flags, e.g.:');
    Object.keys(COMMANDS).slice(0, 3).forEach(function (c) {
        lines.push('  hephaestus ' + COMMANDS[c].usage);
    });
    lines.push('');
    lines.push('  hephaestus --version    print version');
    lines.push('  hephaestus --help       this help');
    lines.push('');
    console.log(lines.join('\n'));
}

const argv = process.argv.slice(2);
const cmd  = argv[0];
const rest = argv.slice(1);

if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    // Printing help is not a failure — exit 0 whether invoked bare or via --help.
    printHelp();
    process.exit(0);
}

if (cmd === '--version' || cmd === '-v' || cmd === 'version') {
    console.log(pkgVersion);
    process.exit(0);
}

const entry = COMMANDS[cmd];
if (!entry) {
    console.error('Unknown command: "' + cmd + '"');
    printHelp();
    process.exit(1);
}

const scriptPath = path.join(SCRIPTS, entry.script);
if (!fs.existsSync(scriptPath)) {
    console.error('Hephaestus: script for "' + cmd + '" not found at ' + scriptPath + ' (broken install?).');
    process.exit(1);
}

const result = spawnSync(process.execPath, [scriptPath].concat(rest), { stdio: 'inherit' });
if (result.error) {
    console.error('Failed to run "' + cmd + '": ' + result.error.message);
    process.exit(1);
}
if (result.status === null && result.signal) {
    // Child terminated by a signal → conventional 128+signal exit code (e.g. 130 for SIGINT).
    const signals = require('os').constants.signals;
    process.exit(128 + (signals[result.signal] || 0));
}
process.exit(result.status === null ? 1 : result.status);
