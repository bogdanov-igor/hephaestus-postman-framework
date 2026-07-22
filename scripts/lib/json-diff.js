'use strict';
/**
 * Hephaestus — structural JSON diff  v4.0.1
 *
 * Powers the Dev Panel's snapshot diff viewer. The engine has its own comparison
 * inside the snapshot module, but those are methods on an object inside a bundled
 * IIFE — not reachable from Node — so this reimplements the same three modes and
 * is tested against the engine's actual behaviour.
 *
 *   strict      every path must be equal
 *   non-strict  every path present in the BASELINE must be present and equal in
 *               the current value; extra keys in current are fine
 *   structural  compares the SHAPE (path -> type) only, so volatile values (ids,
 *               timestamps, counters) do not register as changes
 *
 * Array handling matches the engine: elements are compared by index, and a length
 * difference is itself a difference — except in structural mode, where only the
 * shape of the elements matters, which is why a list that grew from 3 to 50 items
 * does not read as a contract change.
 */

function typeOf(v) {
    if (v === null)       return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
}

function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// Short, readable rendering for the diff column — never "[object Object]".
function preview(v, max) {
    const limit = max || 60;
    let s;
    if (v === undefined) s = '—';
    else if (typeof v === 'string') s = JSON.stringify(v);
    else { try { s = JSON.stringify(v); } catch (e) { s = String(v); } }
    if (s === undefined) s = String(v);
    return s.length > limit ? s.slice(0, limit - 1) + '…' : s;
}

function join(path, key) {
    if (path === '') return String(key);
    return typeof key === 'number' ? path + '[' + key + ']' : path + '.' + key;
}

/**
 * diff(baseline, current, mode) -> [{ path, kind, baseline, current, note }]
 *   kind: 'changed' | 'added' | 'removed' | 'type' | 'length'
 * In non-strict mode 'added' is never reported — extra keys are allowed.
 */
function diff(baseline, current, mode) {
    const m   = mode || 'strict';
    const out = [];

    // Structural mode compares shapes, so build the path->type map for each side
    // and diff those instead of the values.
    if (m === 'structural') {
        const a = shapeOf(baseline);
        const b = shapeOf(current);
        Object.keys(a).forEach(function(p) {
            if (!(p in b)) out.push({ path: p, kind: 'removed', baseline: a[p], current: undefined, note: 'path gone' });
            else if (a[p] !== b[p]) out.push({ path: p, kind: 'type', baseline: a[p], current: b[p], note: 'type changed' });
        });
        Object.keys(b).forEach(function(p) {
            if (!(p in a)) out.push({ path: p, kind: 'added', baseline: undefined, current: b[p], note: 'new path' });
        });
        return out.sort(byPath);
    }

    walk(baseline, current, '');
    return out.sort(byPath);

    function walk(a, b, path) {
        const ta = typeOf(a), tb = typeOf(b);

        if (ta !== tb) {
            out.push({ path: path, kind: 'type', baseline: preview(a), current: preview(b),
                       note: ta + ' → ' + tb });
            return;
        }

        if (Array.isArray(a)) {
            if (a.length !== b.length) {
                out.push({ path: path, kind: 'length', baseline: a.length, current: b.length,
                           note: 'array length ' + a.length + ' → ' + b.length });
            }
            const n = Math.min(a.length, b.length);
            for (let i = 0; i < n; i++) walk(a[i], b[i], join(path, i));
            // Elements beyond the shorter array are reported by the length entry
            // above; listing each one would bury the actual change.
            return;
        }

        if (isObj(a)) {
            Object.keys(a).forEach(function(k) {
                if (!Object.prototype.hasOwnProperty.call(b, k)) {
                    out.push({ path: join(path, k), kind: 'removed', baseline: preview(a[k]), current: undefined,
                               note: 'key missing' });
                } else {
                    walk(a[k], b[k], join(path, k));
                }
            });
            if (m === 'strict') {
                Object.keys(b).forEach(function(k) {
                    if (!Object.prototype.hasOwnProperty.call(a, k)) {
                        out.push({ path: join(path, k), kind: 'added', baseline: undefined, current: preview(b[k]),
                                   note: 'key added' });
                    }
                });
            }
            return;
        }

        if (a !== b) {
            out.push({ path: path, kind: 'changed', baseline: preview(a), current: preview(b), note: '' });
        }
    }
}

// path -> type map. Arrays collapse to a single representative element, so a list
// of 3 and a list of 50 have the same shape as long as the elements match.
function shapeOf(value) {
    const map = {};
    (function walk(v, path) {
        const t = typeOf(v);
        map[path === '' ? '(root)' : path] = t;
        if (t === 'array') {
            if (v.length) walk(v[0], path + '[]');
        } else if (t === 'object') {
            Object.keys(v).forEach(function(k) { walk(v[k], join(path, k)); });
        }
    }(value, ''));
    return map;
}

function byPath(x, y) { return x.path < y.path ? -1 : x.path > y.path ? 1 : 0; }

function summarize(entries) {
    const by = { changed: 0, added: 0, removed: 0, type: 0, length: 0 };
    entries.forEach(function(e) { if (by[e.kind] !== undefined) by[e.kind]++; });
    return by;
}

module.exports = { diff, shapeOf, typeOf, preview, summarize };
