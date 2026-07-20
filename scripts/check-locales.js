#!/usr/bin/env node
'use strict';
/**
 * Hephaestus — locale catalog validator
 *
 * The engine's message catalog (engine/src/shared/i18n.js) maps every user-facing
 * string id to one template function per locale. `t()` falls back to `ru` when a
 * locale is missing — graceful at runtime, but it means an incomplete translation
 * ships silently. This validates a locale contribution before that can happen:
 *
 *   • every message id carries EVERY locale in the catalog;
 *   • the parameter count matches across locales for the same id (a template that
 *     takes fewer args than the call site silently drops data into the message);
 *   • every template renders without throwing and returns a non-empty string;
 *   • the status-code label maps cover the same codes in every locale.
 *
 * It also reports (as a note, not a failure) any message that renders identically
 * to `ru` — usually fine for symbol/emoji-only strings, but the tell-tale sign of
 * a copied-but-untranslated entry.
 *
 * Usage:
 *   node scripts/check-locales.js [--json]
 * Exit: 0 = catalog is consistent · 1 = problems found.
 */

const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const I18N = path.join(ROOT, 'engine/src/shared/i18n.js');

// Placeholder arguments. Most templates just concatenate, but a few take an array
// (they call .join()/.map() on it) or a number, so try several shapes and accept the
// first that renders — the point here is completeness/arity, not type inference.
function argShapes(n) {
    const str = [], arr = [], num = [];
    for (let i = 0; i < n; i++) {
        str.push('{' + (i + 1) + '}');
        arr.push(['{' + (i + 1) + 'a}', '{' + (i + 1) + 'b}']);
        num.push(i + 1);
    }
    return [str, arr, num];
}

// Render with the first argument shape that does not throw; returns
// { out } on success or { error } when every shape fails.
function renderAny(fn) {
    let last = null;
    const shapes = argShapes(fn.length);
    for (let i = 0; i < shapes.length; i++) {
        try { return { out: fn.apply(null, shapes[i]) }; }
        catch (e) { last = e; }
    }
    return { error: last };
}

function analyse(MESSAGES, STATUS_LABELS) {
    const ids = Object.keys(MESSAGES);
    // The locale set is whatever the catalog declares, so a new locale is picked
    // up automatically the moment a contributor adds it to any entry.
    const locales = [];
    ids.forEach(function(id) {
        Object.keys(MESSAGES[id]).forEach(function(loc) {
            if (locales.indexOf(loc) === -1) locales.push(loc);
        });
    });
    locales.sort();

    const errors = [];
    const notes  = [];

    ids.forEach(function(id) {
        const entry = MESSAGES[id];
        const present = locales.filter(function(loc) { return typeof entry[loc] === 'function'; });

        locales.forEach(function(loc) {
            if (typeof entry[loc] !== 'function') {
                errors.push(id + ': missing "' + loc + '" (t() would silently fall back to ru)');
            }
        });
        if (present.length < 2) return;

        // Arity parity across locales.
        const arity = entry[present[0]].length;
        present.forEach(function(loc) {
            if (entry[loc].length !== arity) {
                errors.push(id + ': "' + loc + '" takes ' + entry[loc].length +
                    ' param(s) but "' + present[0] + '" takes ' + arity);
            }
        });

        // Render smoke + identical-to-ru note.
        const rendered = {};
        present.forEach(function(loc) {
            const r = renderAny(entry[loc]);
            if (r.error) {
                errors.push(id + ': "' + loc + '" threw for every argument shape — ' +
                    (r.error && r.error.message ? r.error.message : r.error));
                return;
            }
            if (typeof r.out !== 'string' || r.out.length === 0) {
                errors.push(id + ': "' + loc + '" rendered a non-string / empty value');
                return;
            }
            rendered[loc] = r.out;
        });
        if (rendered.ru) {
            present.forEach(function(loc) {
                if (loc !== 'ru' && rendered[loc] === rendered.ru) {
                    notes.push(id + ': "' + loc + '" is identical to ru — intentional only if the text is language-neutral');
                }
            });
        }
    });

    // Status labels must cover the same codes everywhere.
    const statusLocales = Object.keys(STATUS_LABELS || {});
    if (statusLocales.length > 1) {
        const base = statusLocales[0];
        const baseCodes = Object.keys(STATUS_LABELS[base]).sort();
        statusLocales.slice(1).forEach(function(loc) {
            const codes = Object.keys(STATUS_LABELS[loc]).sort();
            baseCodes.forEach(function(c) {
                if (codes.indexOf(c) === -1) errors.push('statusLabel ' + c + ': missing in "' + loc + '"');
            });
            codes.forEach(function(c) {
                if (baseCodes.indexOf(c) === -1) errors.push('statusLabel ' + c + ': present in "' + loc + '" but not "' + base + '"');
            });
        });
    }

    return { locales: locales, ids: ids.length, errors: errors, notes: notes };
}

async function main() {
    const json = process.argv.includes('--json');
    let mod;
    try {
        mod = await import(pathToFileURL(I18N).href);
    } catch (e) {
        process.stderr.write('check-locales: cannot load the catalog — ' + (e && e.message ? e.message : e) + '\n');
        process.exitCode = 1;
        return;
    }
    if (!mod.MESSAGES) {
        process.stderr.write('check-locales: i18n.js does not export MESSAGES (needed for validation)\n');
        process.exitCode = 1;
        return;
    }

    const r = analyse(mod.MESSAGES, mod.STATUS_LABELS);

    if (json) {
        process.stdout.write(JSON.stringify(r, null, 2) + '\n');
    } else {
        process.stdout.write('\n  Locale catalog: ' + r.ids + ' messages × ' + r.locales.length +
            ' locale(s) [' + r.locales.join(', ') + ']\n');
        if (r.notes.length) {
            process.stdout.write('\n  Notes (' + r.notes.length + '):\n');
            r.notes.slice(0, 15).forEach(function(n) { process.stdout.write('    · ' + n + '\n'); });
            if (r.notes.length > 15) process.stdout.write('    · … ' + (r.notes.length - 15) + ' more\n');
        }
        if (r.errors.length) {
            process.stdout.write('\n  ✖ ' + r.errors.length + ' problem(s):\n');
            r.errors.forEach(function(e) { process.stdout.write('    ✖ ' + e + '\n'); });
            process.stdout.write('\n');
        } else {
            process.stdout.write('\n  ✅ Every message carries every locale, with matching parameter counts.\n\n');
        }
    }
    if (r.errors.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { analyse };
