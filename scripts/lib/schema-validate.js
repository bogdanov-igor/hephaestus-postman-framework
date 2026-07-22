'use strict';
/**
 * Hephaestus — JSON Schema validator (draft-07 subset)  v4.0.1
 *
 * The engine validates responses with tv4, but tv4 is a Postman-sandbox global —
 * it does not exist in Node. The Dev Panel needs to check an edited defaults.json
 * against docs/override.schema.json before writing it to disk, so this covers the
 * subset that schema actually uses:
 *
 *     type · enum · required · properties · additionalProperties · items ·
 *     anyOf · $ref (local, into definitions) · definitions
 *
 * It is deliberately NOT a general validator. Anything outside that list makes
 * validate() report an 'unsupported' problem rather than quietly returning valid:
 * a validator that silently ignores a constraint is worse than no validator,
 * because it grants confidence it has not earned.
 */

const SUPPORTED = [
    'type', 'enum', 'required', 'properties', 'additionalProperties',
    'items', 'anyOf', '$ref', 'definitions',
    // Annotations — carry no constraint, safe to ignore.
    'description', 'title', 'examples', 'default', '$schema', '$id', '_comment',
];

const ANNOTATIONS = ['description', 'title', 'examples', 'default', '$schema', '$id', '_comment'];

function typeOf(v) {
    if (v === null)        return 'null';
    if (Array.isArray(v))  return 'array';
    if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
    return typeof v;
}

// draft-07: an integer satisfies "number"; a non-integer number does not satisfy
// "integer".
function typeMatches(value, want) {
    const actual = typeOf(value);
    if (want === 'number')  return actual === 'number' || actual === 'integer';
    if (want === 'integer') return actual === 'integer';
    return actual === want;
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (typeOf(a) !== typeOf(b)) return false;
    if (Array.isArray(a)) {
        return a.length === b.length && a.every(function(x, i) { return deepEqual(x, b[i]); });
    }
    if (a && typeof a === 'object') {
        const ka = Object.keys(a), kb = Object.keys(b);
        return ka.length === kb.length && ka.every(function(k) { return deepEqual(a[k], b[k]); });
    }
    return false;
}

// Only local refs of the form "#/definitions/Name" — the schema we ship uses
// nothing else, and resolving remote refs would mean network access.
function resolveRef(ref, root) {
    const m = /^#\/definitions\/([^/]+)$/.exec(String(ref));
    if (!m) return null;
    return (root.definitions || {})[m[1]] || null;
}

function validate(value, schema, opts) {
    const root     = (opts && opts.root) || schema;
    const problems = [];
    const seen     = new Set();

    function walk(val, sch, path) {
        if (!sch || typeof sch !== 'object') return;

        if (sch.$ref) {
            const target = resolveRef(sch.$ref, root);
            if (!target) {
                problems.push({ path: path, kind: 'unsupported', message: 'cannot resolve $ref ' + sch.$ref });
                return;
            }
            // Guard against a definition that refers to itself through a cycle.
            const key = path + '::' + sch.$ref;
            if (seen.has(key)) return;
            seen.add(key);
            return walk(val, target, path);
        }

        Object.keys(sch).forEach(function(kw) {
            if (SUPPORTED.indexOf(kw) === -1) {
                problems.push({
                    path: path, kind: 'unsupported',
                    message: 'schema uses "' + kw + '", which this validator does not implement — ' +
                             'the value at this path was NOT checked against it',
                });
            }
        });

        if (sch.type !== undefined) {
            const wants = Array.isArray(sch.type) ? sch.type : [sch.type];
            if (!wants.some(function(w) { return typeMatches(val, w); })) {
                problems.push({
                    path: path, kind: 'type',
                    message: 'expected ' + wants.join(' or ') + ', got ' + typeOf(val),
                });
                return;   // Reporting property errors on a wrong-typed value is noise.
            }
        }

        if (Array.isArray(sch.enum)) {
            if (!sch.enum.some(function(allowed) { return deepEqual(val, allowed); })) {
                problems.push({
                    path: path, kind: 'enum',
                    message: 'must be one of ' + sch.enum.map(function(x) { return JSON.stringify(x); }).join(', ') +
                             ' — got ' + JSON.stringify(val),
                });
            }
        }

        if (Array.isArray(sch.anyOf)) {
            // A branch matches when it produces no problems of its own. Unsupported
            // keywords inside a branch are surfaced rather than counted as a match.
            const branchProblems = sch.anyOf.map(function(sub) {
                return validate(val, sub, { root: root }).problems;
            });
            const matched = branchProblems.some(function(ps) {
                return ps.filter(function(p) { return p.kind !== 'unsupported'; }).length === 0;
            });
            if (!matched) {
                problems.push({
                    path: path, kind: 'anyOf',
                    message: 'does not match any allowed shape (' +
                             branchProblems.map(function(ps) { return (ps[0] && ps[0].message) || 'no match'; }).join(' | ') + ')',
                });
            }
            branchProblems.forEach(function(ps) {
                ps.filter(function(p) { return p.kind === 'unsupported'; }).forEach(function(p) { problems.push(p); });
            });
        }

        if (typeOf(val) === 'object') {
            const props = sch.properties || {};

            (sch.required || []).forEach(function(k) {
                if (!Object.prototype.hasOwnProperty.call(val, k)) {
                    problems.push({ path: path + '/' + k, kind: 'required', message: 'is required but missing' });
                }
            });

            Object.keys(val).forEach(function(k) {
                if (Object.prototype.hasOwnProperty.call(props, k)) {
                    walk(val[k], props[k], path + '/' + k);
                } else if (sch.additionalProperties === false) {
                    problems.push({ path: path + '/' + k, kind: 'additional', message: 'is not a known property' });
                } else if (sch.additionalProperties && typeof sch.additionalProperties === 'object') {
                    walk(val[k], sch.additionalProperties, path + '/' + k);
                }
            });
        }

        if (typeOf(val) === 'array' && sch.items) {
            // Tuple form (items as an array) is not used by our schema; treat it as
            // unsupported rather than guessing.
            if (Array.isArray(sch.items)) {
                problems.push({ path: path, kind: 'unsupported', message: 'tuple-form "items" is not implemented' });
            } else {
                val.forEach(function(item, i) { walk(item, sch.items, path + '/' + i); });
            }
        }
    }

    walk(value, schema, '');

    const real = problems.filter(function(p) { return p.kind !== 'unsupported'; });
    return {
        valid: real.length === 0,
        problems: problems,
        errors: real,
        // Surfaced separately so a caller can distinguish "your config is wrong"
        // from "this validator could not check part of your config".
        unchecked: problems.filter(function(p) { return p.kind === 'unsupported'; }),
    };
}

module.exports = { validate, SUPPORTED, ANNOTATIONS, typeOf, typeMatches };
