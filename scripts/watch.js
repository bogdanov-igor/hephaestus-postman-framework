#!/usr/bin/env node
/**
 * Hephaestus — Newman Watch Mode  v4.0.1
 *
 * Watches collection + environment files for changes and re-runs Newman.
 * Like jest --watch, but for API tests.
 *
 * Usage:
 *   node scripts/watch.js -c collection.json [-e environment.json] [--delay 500]
 *   npm run watch -- -c collection.json -e env.json
 *
 * Options:
 *   -c <file>      Collection JSON (required)
 *   -e <file>      Environment JSON (optional, can repeat)
 *   --delay <ms>   Debounce delay in ms (default: 400)
 *   --args <str>   Extra Newman args passed verbatim
 */

'use strict';

const fs           = require('fs');
const path         = require('path');
const os           = require('os');
const { spawn }    = require('child_process');

// Newman writes its JSON report here; os.tmpdir() so it works on Windows (no /tmp).
const RESULTS = path.join(os.tmpdir(), 'hephaestus-watch-results.json');

// ─── CLI ──────────────────────────────────────────────────────────────────────

const rawArgs    = process.argv.slice(2);
// Explicit index: `rawArgs[indexOf('-c') + 1]` silently resolves to rawArgs[0]
// when -c is absent, so `watch --delay 500` would try to watch a file named "--delay".
const cIdx       = rawArgs.indexOf('-c');
const cVal       = cIdx !== -1 ? rawArgs[cIdx + 1] : undefined;
const collection = (cVal && !cVal.startsWith('-')) ? cVal : undefined;
const delay      = rawArgs.includes('--delay') ? parseInt(rawArgs[rawArgs.indexOf('--delay') + 1], 10) : 400;
const extraArgs  = rawArgs.includes('--args') ? rawArgs[rawArgs.indexOf('--args') + 1] : '';

const envFiles = [];
rawArgs.forEach(function(arg, i) {
    if (arg === '-e' && rawArgs[i + 1]) envFiles.push(rawArgs[i + 1]);
});

if (!collection) {
    console.error('Usage: node scripts/watch.js -c <collection.json> [-e <env.json>] [--delay <ms>]');
    process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const colors = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    blue:   '\x1b[34m',
};

function c(color, str) { return colors[color] + str + colors.reset; }

function timestamp() { return new Date().toISOString().slice(11, 19); }

function clearLine() { process.stdout.write('\r\x1b[K'); }

function header(msg) {
    const line = '─'.repeat(60);
    console.log(c('dim', line));
    console.log(c('bold', '  ⚒️  ' + msg));
    console.log(c('dim', line));
}

// ─── Newman runner ────────────────────────────────────────────────────────────

let currentRun = null;
let runCount   = 0;
let lastResult = null;

function runNewman() {
    if (currentRun) {
        currentRun.kill();
        currentRun = null;
    }

    runCount++;
    const ts = timestamp();
    header('[' + ts + '] Run #' + runCount + ' — ' + path.basename(collection));

    // shell:true so `newman` resolves to newman.cmd on Windows; path args are quoted
    // so spaces (e.g. C:\Users\First Last\…) survive the shell.
    const q    = function(s) { return '"' + s + '"'; };
    const cmd  = 'newman';
    const args = ['run', q(path.resolve(collection))];
    envFiles.forEach(function(e) { args.push('-e', q(path.resolve(e))); });
    args.push('--reporter-json-export', q(RESULTS));
    args.push('-r', 'json');
    if (extraArgs) args.push(...extraArgs.split(' ').filter(Boolean));

    const startTime = Date.now();
    currentRun = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });

    let stdout = '';
    let stderr = '';

    currentRun.stdout.on('data', function(d) { stdout += d; });
    currentRun.stderr.on('data', function(d) { stderr += d; });

    currentRun.on('close', function(code) {
        currentRun = null;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        // Parse Newman JSON results
        let stats = null;
        try {
            const res  = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
            const s    = res.run && res.run.stats || {};
            stats = {
                requests: s.requests ? s.requests.total : 0,
                reqFail:  s.requests ? s.requests.failed : 0,
                asserts:  s.assertions ? s.assertions.total : 0,
                asFail:   s.assertions ? s.assertions.failed : 0,
            };
        } catch(e) { /* can't parse */ }

        lastResult = { code, stats, elapsed };

        if (stats) {
            const passRate = stats.asserts > 0 ? Math.round((stats.asserts - stats.asFail) / stats.asserts * 100) : 100;
            const icon = stats.asFail === 0 && stats.reqFail === 0 ? '✅' : '❌';
            console.log(
                '\n  ' + icon + '  ' + c(stats.asFail === 0 ? 'green' : 'red',
                    'Requests: ' + stats.requests + ' | Assertions: ' + stats.asserts +
                    ' | Pass: ' + passRate + '%' +
                    (stats.asFail > 0 ? ' | Failed: ' + c('red', String(stats.asFail)) : '')
                ) + '  ' + c('dim', elapsed + 's')
            );
        } else {
            console.log('  ' + (code === 0 ? c('green', '✅ Done') : c('red', '❌ Exit ' + code)) + '  ' + c('dim', elapsed + 's'));
        }

        if (stderr && stderr.trim()) {
            console.log(c('yellow', '  ⚠ ' + stderr.trim().slice(0, 200)));
        }

        // Show full summary from summary.js if available
        try {
            const summaryScript = path.join(__dirname, 'summary.js');
            if (fs.existsSync(summaryScript) && fs.existsSync(RESULTS)) {
                const { execSync } = require('child_process');
                const out = execSync(
                    '"' + process.execPath + '" "' + summaryScript + '" "' + RESULTS + '" --no-color',
                    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
                );
                console.log(out.split('\n').map(function(l) { return '  ' + l; }).join('\n'));
            }
        } catch(e) { /* summary.js not available or failed */ }

        console.log(c('dim', '\n  Watching for changes... (Ctrl+C to exit)'));
    });

    currentRun.on('error', function(e) {
        console.log(c('red', '  ❌ Newman error: ' + e.message));
        console.log(c('yellow', '  Make sure Newman is installed: npm install -g newman'));
        currentRun = null;
    });
}

// ─── File watcher ─────────────────────────────────────────────────────────────

const watchFiles = [collection].concat(envFiles);
const watchers   = [];
let debounceTimer = null;

function onChange(filename) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
        clearLine();
        console.log(c('cyan', '\n  📝 Changed: ' + filename));
        runNewman();
    }, delay);
}

console.log('');
console.log(c('bold', '  ⚒️  Hephaestus — Watch Mode  v4.0.1'));
console.log(c('dim', '  Collection: ') + path.basename(collection));
if (envFiles.length) console.log(c('dim', '  Environments: ') + envFiles.map(function(e) { return path.basename(e); }).join(', '));
console.log(c('dim', '  Debounce: ' + delay + 'ms'));
console.log('');

watchFiles.forEach(function(f) {
    if (!fs.existsSync(f)) {
        console.warn(c('yellow', '  ⚠ File not found (will watch anyway): ' + f));
    }
    const watcher = fs.watch(f, function(event) {
        if (event === 'change') onChange(path.basename(f));
    });
    watchers.push(watcher);
});

// Initial run
runNewman();

// Graceful shutdown
process.on('SIGINT', function() {
    console.log('\n' + c('dim', '  Stopping watch mode...'));
    if (currentRun) currentRun.kill();
    watchers.forEach(function(w) { w.close(); });
    process.exit(0);
});

// Interactive: 'r' to re-run manually
process.stdin.setRawMode && process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', function(key) {
    if (key.toString() === 'r' || key.toString() === 'R') {
        clearLine();
        console.log(c('cyan', '\n  ↩ Manual re-run'));
        runNewman();
    }
    if (key.toString() === '\u0003') { // Ctrl+C
        process.emit('SIGINT');
    }
});
