// ════════════════════════════════════════════════════════════
// SHARED MODULE: structure — structural (shape) diff of two JSON values
//
// Powers snapshot `mode: "structural"`: compare the SHAPE of a response to its
// baseline (every leaf path → its type) while ignoring leaf VALUES. That catches
// contract changes — a field added/removed, a type flipped — without the false
// diffs that volatile values (timestamps, ids, counts) cause in a strict diff.
//
// Array indices collapse to `[*]`, so an array of 3 vs 5 items with the same
// element shape is structurally identical (length and order are values, not shape).
// A collapsed array path that carries elements of DIFFERENT types records the
// UNION of those types, sorted (e.g. "number|string"), so the fingerprint is
// order-independent.
//
// Paths use the same unescaped dot / `[*]` convention as the rest of the engine
// (extractor, checkPaths). As there, a literal object key containing "." or "[*]"
// is ambiguous with a nesting boundary — a known limitation of dot-paths, not
// specific to this module.
//
// Bundled into the post-request engine plane by `npm run build:emit` (esbuild
// inline) AND require-able from Node so scripts/test.js can unit-test the diff.
// Pure — depends only on its arguments.
// ════════════════════════════════════════════════════════════

// Map every leaf path of `obj` to its type. Objects/arrays recurse; empty ones
// are recorded as leaves so "{}" vs "{a:1}" and "[]" vs "[1]" still differ.
//
// The accumulator is a null-prototype object: a leaf path equal to an
// Object.prototype member name (toString, constructor, __proto__, …) must be a
// real own key, or additions/removals of such a field would be silently mishandled.
export function structurePaths(obj) {
    const out = Object.create(null);
    // Record `type` at `key`, accumulating the sorted union of distinct types so a
    // collapsed array path with mixed element types is order-independent.
    function add(key, type) {
        if (out[key] === undefined) { out[key] = type; return; }
        if (('|' + out[key] + '|').indexOf('|' + type + '|') === -1) {
            out[key] = out[key].split('|').concat(type).sort().join('|');
        }
    }
    function walk(v, path) {
        if (Array.isArray(v)) {
            if (v.length === 0) { add(path + '[*]', 'empty-array'); return; }
            for (let i = 0; i < v.length; i++) walk(v[i], path + '[*]');
            return;
        }
        if (v !== null && typeof v === 'object') {
            const keys = Object.keys(v);
            if (keys.length === 0) { add(path || '(root)', 'empty-object'); return; }
            keys.forEach(function(k) { walk(v[k], path ? path + '.' + k : k); });
            return;
        }
        add(path || '(root)', (v === null) ? 'null' : typeof v);
    }
    walk(obj, '');
    return out;
}

// Structural difference between a stored baseline and the current value. Returns
// a sorted list of human-readable entries (empty ⇒ structurally identical):
//   "- path (type)"          a path present in the baseline is gone
//   "+ path (type)"          a new path appeared
//   "~ path: old → new"      a path's type changed
export function structuralDiff(stored, current) {
    const a = structurePaths(stored);
    // null-proto so `p in b` / lookups see only own keys (prototype-name safety).
    const b = (current === undefined) ? Object.create(null) : structurePaths(current);
    const diff = [];
    Object.keys(a).forEach(function(p) {
        if (!(p in b)) diff.push('- ' + p + ' (' + a[p] + ')');
        else if (a[p] !== b[p]) diff.push('~ ' + p + ': ' + a[p] + ' → ' + b[p]);
    });
    Object.keys(b).forEach(function(p) {
        if (!(p in a)) diff.push('+ ' + p + ' (' + b[p] + ')');
    });
    return diff.sort();
}
