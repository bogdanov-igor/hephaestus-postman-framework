#!/usr/bin/env node
'use strict';
/**
 * Hephaestus — override generator (interactive wizard)
 *
 * Asks a few questions and prints a ready-to-paste `override` block plus the
 * engine `eval(...)` line — so you scaffold a request's config without
 * memorising the schema. Zero dependencies (node:readline), no network, no LLM.
 *
 * Usage:
 *   node bin/hephaestus.js generate
 *   npm run generate            (if wired)
 *
 * The block is printed to stdout; paste it into the request's Pre-request or
 * Tests tab. The pure builders (buildOverride / renderScript) are exported so
 * the shape is unit-tested directly.
 */

const readline = require('readline');

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

// Turn collected answers into an override object. Only non-default fields are
// emitted, so the block stays minimal.
function buildOverride(a) {
    a = a || {};
    const o = {};
    if (a.locale === 'en' || a.locale === 'ru') o.locale = a.locale;

    if (a.plane === 'pre') {
        const type = a.auth && a.auth.type;
        if (type && type !== 'none') {
            o.auth = { enabled: true, type: type };
            if (type === 'bearer' && a.auth.token) o.auth.token = a.auth.token;
            if (type === 'basic') {
                if (a.auth.username) o.auth.username = a.auth.username;
                if (a.auth.password) o.auth.password = a.auth.password;
            }
        }
        return o;
    }

    // post-request plane
    if (typeof a.expectedStatus === 'number') o.expectedStatus = a.expectedStatus;

    const keys = (a.keysToFind || []).filter(function(k) { return k && k.path; });
    if (keys.length) {
        o.keysToFind = keys.map(function(k) {
            const entry = { path: k.path };
            if (k.expect !== undefined && k.expect !== '') entry.expect = k.expect;
            return entry;
        });
    }

    const shape = a.assertShape || {};
    if (Object.keys(shape).length) o.assertShape = shape;

    if (a.snapshot && a.snapshot.enabled) {
        o.snapshot = { enabled: true, mode: a.snapshot.mode || 'non-strict', autoSaveMissing: true };
    }
    return o;
}

// Render the paste-able script: the override literal + the engine eval line.
function renderScript(override, plane) {
    const varName = plane === 'pre' ? 'hephaestus.v3.pre' : 'hephaestus.v3.post';
    return 'const override = ' + JSON.stringify(override, null, 2) + ';\n' +
        'eval(pm.collectionVariables.get("' + varName + '"));';
}

// ── Interactive driver ────────────────────────────────────────────────────────

// A line reader that BUFFERS incoming lines, so it is reliable whether input is
// a TTY (human typing) or a pipe (lines arriving in a burst — rl.question drops
// those). On EOF, pending reads resolve to null so every prompt falls to its
// default and the wizard still finishes.
function makePrompts(rl, out) {
    const queue = [];    // lines received but not yet consumed
    const waiters = [];  // resolvers waiting for the next line
    let closed = false;
    rl.on('line', function(line) {
        if (waiters.length) waiters.shift()(line);
        else queue.push(line);
    });
    rl.on('close', function() {
        closed = true;
        while (waiters.length) waiters.shift()(null);
    });
    function nextLine() {
        return new Promise(function(resolve) {
            if (queue.length) return resolve(queue.shift());
            if (closed) return resolve(null);
            waiters.push(resolve);
        });
    }
    function write(s) { out.write(s); }

    async function ask(question, defaultVal) {
        write(question + (defaultVal !== undefined ? ' [' + defaultVal + ']' : '') + ': ');
        const line = await nextLine();
        return ((line == null ? '' : line).trim()) || defaultVal || '';
    }
    async function choose(question, options, defaultIdx) {
        write('\n' + question + '\n');
        options.forEach(function(opt, i) { write('  ' + (i + 1) + '. ' + opt + '\n'); });
        write('Choice [' + (defaultIdx + 1) + ']: ');
        const line = await nextLine();
        const idx = parseInt((line == null ? '' : line).trim(), 10) - 1;
        return options[Math.max(0, Math.min(options.length - 1, isNaN(idx) ? defaultIdx : idx))];
    }
    async function yesNo(question, defaultYes) {
        write(question + ' ' + (defaultYes ? '(Y/n)' : '(y/N)') + ': ');
        const line = await nextLine();
        const s = (line == null ? '' : line).trim().toLowerCase();
        return s === 'y' || s === 'yes' || (defaultYes && s === '');
    }
    return { ask: ask, choose: choose, yesNo: yesNo };
}

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const p = makePrompts(rl, process.stdout);
    console.log('\n⚒️  Hephaestus — override generator\n');

    const answers = { auth: {}, keysToFind: [], assertShape: {}, snapshot: {} };

    const planeChoice = await p.choose('Which plane?', ['post-request (Tests tab)', 'pre-request'], 0);
    answers.plane = planeChoice.indexOf('pre-request') === 0 ? 'pre' : 'post';

    const loc = await p.choose('Output language (engine locale)?', ['ru (default)', 'en', '(leave to defaults)'], 0);
    answers.locale = loc.indexOf('en') === 0 ? 'en' : (loc.indexOf('ru') === 0 ? 'ru' : null);

    if (answers.plane === 'pre') {
        const authType = await p.choose('Auth?', ['none', 'bearer', 'basic', 'headers', 'variables'], 0);
        answers.auth.type = authType;
        if (authType === 'bearer') answers.auth.token = await p.ask('Bearer token (e.g. {{prod.token}})', '{{token}}');
        if (authType === 'basic') {
            answers.auth.username = await p.ask('Username', '{{user}}');
            answers.auth.password = await p.ask('Password', '{{pass}}');
        }
    } else {
        const statusStr = await p.ask('Expected HTTP status (blank to skip)', '200');
        const statusNum = parseInt(statusStr, 10);
        if (!isNaN(statusNum)) answers.expectedStatus = statusNum;

        if (await p.yesNo('Extract / assert response fields (keysToFind)?', true)) {
            let more = true;
            while (more) {
                const pathStr = await p.ask('  Field path (e.g. data.id), blank to stop');
                if (!pathStr) break;
                const expect = await p.ask('  Expected value (blank = presence only)');
                answers.keysToFind.push({ path: pathStr, expect: expect });
                more = await p.yesNo('  Add another?', false);
            }
        }

        if (await p.yesNo('Add structural type checks (assertShape)?', false)) {
            let more = true;
            while (more) {
                const pathStr = await p.ask('  Field path (e.g. data.items), blank to stop');
                if (!pathStr) break;
                const type = await p.choose('  Type', ['string', 'number', 'boolean', 'object', 'array', 'null', 'any', 'absent'], 0);
                answers.assertShape[pathStr] = type;
                more = await p.yesNo('  Add another?', false);
            }
        }

        if (await p.yesNo('Enable snapshot regression?', false)) {
            answers.snapshot.enabled = true;
            answers.snapshot.mode = await p.choose('  Snapshot mode', ['non-strict', 'strict', 'structural'], 0);
        }
    }

    rl.close();

    const override = buildOverride(answers);
    const script = renderScript(override, answers.plane);
    console.log('\n' + '─'.repeat(60));
    console.log('Paste into the ' + (answers.plane === 'pre' ? 'Pre-request' : 'Tests') + ' tab:\n');
    console.log(script);
    console.log('─'.repeat(60) + '\n');
}

if (require.main === module) {
    main().catch(function(e) {
        console.error('generate: ' + (e && e.message ? e.message : e));
        process.exit(1);
    });
}

module.exports = { buildOverride, renderScript };
