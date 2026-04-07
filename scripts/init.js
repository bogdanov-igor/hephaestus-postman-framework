#!/usr/bin/env node
/**
 * Hephaestus — Project Init Wizard  v3.7.0
 *
 * Interactive setup: generates hephaestus.defaults.json and
 * an environment file template for a new project.
 *
 * Usage:
 *   node scripts/init.js             — interactive
 *   node scripts/init.js --defaults  — show current defaults.json and exit
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');

if (process.argv.includes('--defaults')) {
    const src = path.join(ROOT, 'setup/defaults.json');
    console.log(fs.readFileSync(src, 'utf8'));
    process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal) {
    return new Promise(function(resolve) {
        const prompt = question + (defaultVal !== undefined ? ' [' + defaultVal + ']' : '') + ': ';
        rl.question(prompt, function(ans) {
            resolve(ans.trim() || defaultVal || '');
        });
    });
}

function choose(question, options, defaultIdx) {
    return new Promise(function(resolve) {
        console.log('\n' + question);
        options.forEach(function(opt, i) { console.log('  ' + (i + 1) + '. ' + opt); });
        rl.question('Choice [' + (defaultIdx + 1) + ']: ', function(ans) {
            const idx = parseInt(ans.trim(), 10) - 1;
            resolve(options[Math.max(0, Math.min(options.length - 1, isNaN(idx) ? defaultIdx : idx))]);
        });
    });
}

function yesNo(question, defaultYes) {
    return new Promise(function(resolve) {
        const hint = defaultYes ? '(Y/n)' : '(y/N)';
        rl.question(question + ' ' + hint + ': ', function(ans) {
            const a = ans.trim().toLowerCase();
            resolve(a === 'y' || (defaultYes && a !== 'n'));
        });
    });
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🔥 Hephaestus Init Wizard  v3.7.0                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ─── Project basics ────────────────────────────────────────────────────────

    const projectName = await ask('Project name', 'My API');
    const baseUrl     = await ask('Base URL', 'https://api.example.com');
    const authType    = await choose('Authentication type', ['none', 'bearer', 'basic', 'oauth2cc'], 0);
    const ci          = await yesNo('Enable CI mode (structured JSON logs)', false);
    const maxTime     = await ask('Max response time threshold (ms)', '2000');
    const expectedSt  = await ask('Default expected statuses (comma-separated)', '200,201,202');

    // ─── Env variables ─────────────────────────────────────────────────────────

    console.log('\n─── Environment ─────────────────────────────────────────────────');
    const envName    = await ask('Environment name', 'prod');
    const envRequired = await ask('Required env variables (comma-separated)', 'BASE_URL');

    // ─── Secrets ──────────────────────────────────────────────────────────────

    const extraSecrets = await ask('Additional secret key substrings (comma-separated)', '');

    // ─── Auth details ──────────────────────────────────────────────────────────

    let authConfig = { type: authType, enabled: authType !== 'none' };
    if (authType === 'bearer') {
        authConfig.token = '{{' + envName + '.token}}';
    } else if (authType === 'basic') {
        const user = await ask('Basic auth username variable', '{{' + envName + '.user}}');
        authConfig.user = user;
        authConfig.pass = '{{' + envName + '.pass}}';
    } else if (authType === 'oauth2cc') {
        const tokenUrl = await ask('OAuth2 token URL', 'https://auth.example.com/oauth/token');
        authConfig.oauth2cc = {
            tokenUrl:     tokenUrl,
            clientId:     '{{oauth_client_id}}',
            clientSecret: '{{oauth_client_secret}}',
            scope:        'api:read',
        };
    }

    // ─── Snapshot ─────────────────────────────────────────────────────────────

    const snapshotEnabled = await yesNo('\nEnable snapshot regression testing', false);
    const snapshotMode    = snapshotEnabled ? await choose('Snapshot mode', ['non-strict', 'strict'], 0) : 'non-strict';

    // ─── Build defaults.json ──────────────────────────────────────────────────

    const statuses = expectedSt.split(',').map(function(s) { return parseInt(s.trim(), 10); }).filter(Boolean);
    const defaultSecrets = ['token', 'password', 'pass', 'secret', 'key', 'authorization', 'session'];
    const extraSecretsList = extraSecrets ? extraSecrets.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
    const allSecrets = Array.from(new Set(defaultSecrets.concat(extraSecretsList)));

    const required = envRequired ? envRequired.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

    const defaults = {
        auth:           authConfig,
        expectedStatus: statuses,
        maxResponseTime: parseInt(maxTime, 10) || 2000,
        contentType:    'json',
        snapshot: {
            enabled:         snapshotEnabled,
            mode:            snapshotMode,
            autoSaveMissing: true,
            ignorePaths:     [],
            checkPaths:      [],
        },
        schema:   { enabled: false },
        secrets:  allSecrets,
        ci:       ci,
        envRequired: required,
    };

    // ─── Build environment file ────────────────────────────────────────────────

    const envVars = [
        { key: 'BASE_URL',     value: baseUrl,   enabled: true },
        { key: 'ENV_NAME',     value: envName,   enabled: true },
    ];
    if (authType === 'bearer') {
        envVars.push({ key: envName + '.token', value: '', enabled: true });
    } else if (authType === 'basic') {
        envVars.push({ key: envName + '.user', value: '', enabled: true });
        envVars.push({ key: envName + '.pass', value: '', enabled: true });
    } else if (authType === 'oauth2cc') {
        envVars.push({ key: 'oauth_client_id',     value: '', enabled: true });
        envVars.push({ key: 'oauth_client_secret', value: '', enabled: true });
    }

    const envFile = {
        id:       require('crypto').randomUUID(),
        name:     envName,
        values:   envVars,
        _postman_variable_scope: 'environment',
    };

    // ─── Output paths ──────────────────────────────────────────────────────────

    const outputDir = path.join(ROOT, 'setup');
    const defaultsOut = path.join(outputDir, 'generated-defaults.json');
    const envOut      = path.join(outputDir, envName + '.postman_environment.json');

    fs.writeFileSync(defaultsOut, JSON.stringify(defaults, null, 4));
    fs.writeFileSync(envOut, JSON.stringify(envFile, null, 4));

    // ─── Summary ──────────────────────────────────────────────────────────────

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Init complete!                                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Generated:                                                 ║');
    console.log('║  📄 ' + path.relative(ROOT, defaultsOut).padEnd(56) + '║');
    console.log('║  📄 ' + path.relative(ROOT, envOut).padEnd(56) + '║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Next steps:                                                ║');
    console.log('║  1. In Postman: create a new collection                     ║');
    console.log('║  2. Add hephaestus.defaults variable with generated JSON    ║');
    console.log('║  3. Import the environment file                             ║');
    console.log('║  4. Run engine-update to load engine code                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n  hephaestus.defaults content:');
    console.log('  ' + path.relative(ROOT, defaultsOut));

    rl.close();
}

main().catch(function(e) {
    console.error('Error:', e.message);
    rl.close();
    process.exit(1);
});
