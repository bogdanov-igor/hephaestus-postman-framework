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
//
// Bundled into the post-request engine plane by `npm run build:emit` (esbuild
// inline) AND require-able from Node so scripts/test.js can unit-test the diff.
// Pure — depends only on its arguments.
// ════════════════════════════════════════════════════════════

// Map every leaf path of `obj` to its type. Objects/arrays recurse; empty ones
// are recorded as leaves so "{}" vs "{a:1}" and "[]" vs "[1]" still differ.
export function structurePaths(obj) {
    const out = {};
    function walk(v, path) {
        const key = path || '(root)';
        if (Array.isArray(v)) {
            if (v.length === 0) { out[key + '[*]'] = 'empty-array'; return; }
            for (let i = 0; i < v.length; i++) walk(v[i], path + '[*]');
            return;
        }
        if (v !== null && typeof v === 'object') {
            const keys = Object.keys(v);
            if (keys.length === 0) { out[key] = 'empty-object'; return; }
            keys.forEach(function(k) { walk(v[k], path ? path + '.' + k : k); });
            return;
        }
        out[key] = (v === null) ? 'null' : typeof v; // string | number | boolean | null
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
    const b = structuralPathsSafe(current);
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

// Guard so a caller that passes an undefined "current" (e.g. an unparsed body)
// gets a clean structural diff rather than a throw.
function structuralPathsSafe(v) {
    return (v === undefined) ? {} : structurePaths(v);
}
