#!/usr/bin/env node
'use strict';
/**
 * Hephaestus — locale catalog validator
 *
 * The engine's message catalog (engine/src/shared/i18n.js) maps every user-facing
 * string id to one template function per locale. `t()` does `entry[locale] || entry.ru`,
 * so a MISSING locale silently falls back to Russian — an incomplete translation
 * would ship unnoticed. This is the gate for a locale contribution.
 *
 * Checks:
 *   • every message id carries every locale — measured against BASELINE_LOCALES plus
 *     anything the catalog adds, so dropping a locale everywhere is still an error
 *     (deriving the set purely from the catalog would call that "consistent");
 *   • parameter counts match across locales for the same id;
 *   • every template renders, and all locales of one id accept the SAME argument
 *     type — a template that only works for a different type than the call site
 *     passes would throw inside the engine at runtime;
 *   • no render leaks `undefined` / `NaN` / `[object Object]`;
 *   • the status-label map covers every locale with the same status codes and no
 *     empty labels (the status map is also what makes a locale selectable — see
 *     locOf() in i18n.js).
 *
 * Notes (reported, not failures): a render identical to `ru` (fine when the text is
 * language-neutral, a red flag when it means copied-not-translated), and arguments
 * that never reach the output (fine for flag-style params used in a conditional).
 *
 * Usage:  node scripts/check-locales.js [--json]
 * Exit:   0 = consistent · 1 = problems found.
 */

const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const I18N = path.join(ROOT, 'engine/src/shared/i18n.js');

// The locales this project ships. Kept explicit so that deleting one everywhere is
// an error rather than a "consistent single-locale catalog".
const BASELINE_LOCALES = ['ru', 'en'];

// Argument shapes to probe a template with. Templates mostly concatenate, but a few
// take an array (.join()/.map()) or a number.
const SHAPE_NAMES = ['string', 'array', 'number', 'object'];
const LEAK = /undefined|NaN|\[object Object\]/;

function argShapes(n) {
    const str = [], arr = [], num = [], obj = [];
    for (let i = 0; i < n; i++) {
        str.push('{' + (i + 1) + '}');
        arr.push(['{' + (i + 1) + 'a}', '{' + (i + 1) + 'b}']);
        num.push(i + 1);
        // Error-like: several templates take an error/response object and read .message.
        obj.push({ message: '{' + (i + 1) + 'm}', name: '{' + (i + 1) + 'n}' });
    }
    return [str, arr, num, obj];
}

// Render with each shape and PREFER one that comes out clean. Returning the first
// shape that merely doesn't throw would (a) let a template that breaks on the real
// argument type pass, and (b) flag an object-consuming template as leaking just
// because a string probe has no .message. Reports WHICH shape worked so locales of
// the same id can be compared — they must agree, since the call site passes one type.
function renderAny(fn) {
    const shapes = argShapes(fn.length);
    let firstRendered = null;
    let lastError = null;
    for (let i = 0; i < shapes.length; i++) {
        try {
            const out = fn.apply(null, shapes[i]);
            const result = { out: out, shape: i, args: shapes[i] };
            if (typeof out === 'string' && out.length > 0 && !LEAK.test(out)) return result;
            if (!firstRendered) firstRendered = result;
        } catch (e) { lastError = e; }
    }
    return firstRendered || { error: lastError };
}

function analyse(MESSAGES, STATUS_LABELS, opts) {
    opts = opts || {};
    const errors = [];
    const notes  = [];
    const ids = Object.keys(MESSAGES || {});

    if (!MESSAGES || ids.length === 0) {
        errors.push('catalog is empty — nothing to validate (is MESSAGES exported?)');
        return { locales: [], ids: 0, errors: errors, notes: notes };
    }

    // Expected locales: the shipped baseline plus anything the catalog introduces.
    const locales = BASELINE_LOCALES.slice();
    ids.forEach(function(id) {
        const entry = MESSAGES[id];
        if (entry && typeof entry === 'object') {
            Object.keys(entry).forEach(function(loc) {
                if (locales.indexOf(loc) === -1) locales.push(loc);
            });
        }
    });
    locales.sort();

    ids.forEach(function(id) {
        const entry = MESSAGES[id];
        if (!entry || typeof entry !== 'object') {
            errors.push(id + ': entry is not an object');
            return;
        }
        try {
            const present = locales.filter(function(loc) { return typeof entry[loc] === 'function'; });
            locales.forEach(function(loc) {
                if (typeof entry[loc] !== 'function') {
                    errors.push(id + ': missing "' + loc + '" (t() would silently fall back to ru)');
                }
            });
            if (!present.length) return;

            // Arity parity — baseline on ru when we have it, so the message blames
            // the new locale rather than whichever sorts first.
            const base  = present.indexOf('ru') !== -1 ? 'ru' : present[0];
            const arity = entry[base].length;
            present.forEach(function(loc) {
                if (entry[loc].length !== arity) {
                    errors.push(id + ': "' + loc + '" takes ' + entry[loc].length +
                        ' param(s) but "' + base + '" takes ' + arity);
                }
            });

            const rendered = {};
            const shapes   = {};
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
                if (LEAK.test(r.out)) {
                    errors.push(id + ': "' + loc + '" render leaks ' + (r.out.match(LEAK) || [''])[0] +
                        ' under every probed argument type — it reads something the call site may not pass');
                    return;
                }
                rendered[loc] = r.out;
                shapes[loc]   = r.shape;
                // Arguments that never reach the text are usually flags used in a
                // conditional — worth surfacing, not worth failing.
                if (r.shape === 0) {
                    r.args.forEach(function(a) {
                        if (r.out.indexOf(a) === -1) notes.push(id + ': "' + loc + '" never prints argument ' + a);
                    });
                }
            });

            // Every locale of one id must accept the same argument type: the call
            // site passes exactly one, so a divergence means one of them throws live.
            const usedShapes = Object.keys(shapes).map(function(l) { return shapes[l]; });
            const distinct = usedShapes.filter(function(s, i) { return usedShapes.indexOf(s) === i; });
            if (distinct.length > 1) {
                const detail = Object.keys(shapes).map(function(l) { return l + '=' + SHAPE_NAMES[shapes[l]]; }).join(', ');
                errors.push(id + ': locales disagree on the argument type (' + detail +
                    ') — one of them throws for what the call site actually passes');
            }

            if (rendered.ru) {
                Object.keys(rendered).forEach(function(loc) {
                    if (loc !== 'ru' && rendered[loc] === rendered.ru) {
                        notes.push(id + ': "' + loc + '" is identical to ru — intentional only if the text is language-neutral');
                    }
                });
            }
        } catch (e) {
            errors.push(id + ': validation crashed — ' + (e && e.message ? e.message : e));
        }
    });

    // Status labels: tied to the SAME locale set. A locale without a status map is
    // not selectable at runtime (see locOf) even if every message is translated.
    const status = STATUS_LABELS || {};
    const haveStatus = Object.keys(status).length > 0;
    if (!haveStatus && opts.requireStatus) {
        errors.push('statusLabels: missing entirely (no locale would be selectable)');
    }
    if (haveStatus) {
        locales.forEach(function(loc) {
            if (!status[loc] || typeof status[loc] !== 'object') {
                errors.push('statusLabels: missing locale "' + loc + '" — that locale cannot be selected at runtime');
            }
        });
        const covered = locales.filter(function(loc) { return status[loc] && typeof status[loc] === 'object'; });
        if (covered.length) {
            const baseLoc = covered.indexOf('ru') !== -1 ? 'ru' : covered[0];
            const baseCodes = Object.keys(status[baseLoc]).sort();
            covered.forEach(function(loc) {
                const codes = Object.keys(status[loc]).sort();
                baseCodes.forEach(function(c) {
                    if (codes.indexOf(c) === -1) errors.push('statusLabel ' + c + ': missing in "' + loc + '"');
                });
                codes.forEach(function(c) {
                    if (baseCodes.indexOf(c) === -1) errors.push('statusLabel ' + c + ': present in "' + loc + '" but not "' + baseLoc + '"');
                    const v = status[loc][c];
                    if (typeof v !== 'string' || v.length === 0) {
                        errors.push('statusLabel ' + c + ' in "' + loc + '": empty or non-string label');
                    }
                });
            });
        }
    }

    return { locales: locales, ids: ids.length, errors: errors, notes: notes };
}

function emit(json, payload, humanFn) {
    if (json) process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    else humanFn();
}

async function main() {
    const json = process.argv.includes('--json');
    let mod;
    try {
        mod = await import(pathToFileURL(I18N).href);
    } catch (e) {
        const msg = 'cannot load the catalog — ' + (e && e.message ? e.message : e);
        emit(json, { locales: [], ids: 0, errors: [msg], notes: [] },
            function() { process.stderr.write('check-locales: ' + msg + '\n'); });
        process.exitCode = 1;
        return;
    }
    if (!mod.MESSAGES) {
        const msg = 'i18n.js does not export MESSAGES (needed for validation)';
        emit(json, { locales: [], ids: 0, errors: [msg], notes: [] },
            function() { process.stderr.write('check-locales: ' + msg + '\n'); });
        process.exitCode = 1;
        return;
    }

    const r = analyse(mod.MESSAGES, mod.STATUS_LABELS, { requireStatus: true });

    emit(json, r, function() {
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
            process.stdout.write('\n  ✅ Every message carries every locale, with matching parameters and argument types.\n\n');
        }
    });
    if (r.errors.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { analyse, BASELINE_LOCALES };
