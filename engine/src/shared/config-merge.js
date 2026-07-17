// ════════════════════════════════════════════════════════════
// SHARED MODULE: configMerge
//
// Single source of truth. Bundled verbatim into BOTH engine/pre-request.js
// and engine/post-request.js by `npm run build:emit` (esbuild). Edit here only —
// never edit the copies inside the generated engine files.
//
// Depends only on the `pm` sandbox global + its (ctx, override) arguments,
// so it bundles cleanly with no closure coupling to the engine IIFE.
// ════════════════════════════════════════════════════════════
import { t } from './i18n.js';

// Every top-level key the engine — and the shipped plugins — read off the merged
// config. Custom/third-party plugins allowlist their OWN keys at runtime via the
// `extraKeys` config array, so this list need not know about them. Keep it in step
// with the override config schema when adding a first-party key.
const KNOWN_KEYS = [
    '$schema', '_comment', 'strictMode', 'extraKeys',
    'baseUrl', 'defaultProtocol', 'auth', 'dateFormat', 'dates',
    'maxResponseTime', 'maxBytes', 'expectedStatus', 'expectEmpty', 'contentType',
    'snapshot', 'snapshotRecord', 'schema', 'securityAudit', 'secrets',
    'envRequired', 'ci', 'locale', 'logLevel', 'softFail', 'randomData',
    'keysToFind', 'varsToSave', 'keysToCount', 'assertions', 'assertEach',
    'assertShape', 'assertOrder', 'assertUnique', 'assertHeaders', 'retryOnStatus',
    // config for the shipped plugins (read off ctx.config by docs/plugins/*)
    'slackUrl', 'slackOnlyFailures', 'teamsUrl', 'teamsOnlyFailures',
    'slaMsLimit', 'checkCors', 'assertJsonApi'
];

export const configMerge = {
    _merge(target, source) {
        const out = Object.assign({}, target);
        Object.keys(source).forEach(k => {
            const sv = source[k];
            if (sv !== null && sv !== undefined && typeof sv === 'object' && !Array.isArray(sv)) {
                out[k] = this._merge(typeof out[k] === 'object' && out[k] !== null ? out[k] : {}, sv);
            } else if (sv !== undefined) {
                out[k] = sv;
            }
        });
        return out;
    },

    // Levenshtein distance over short strings — powers the "did you mean" hint.
    _editDistance(a, b) {
        const m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        let prev = [];
        for (let j = 0; j <= n; j++) prev[j] = j;
        for (let i = 1; i <= m; i++) {
            const cur = [i];
            for (let j = 1; j <= n; j++) {
                const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            }
            prev = cur;
        }
        return prev[n];
    },

    // Nearest known key, but only when it's close enough to be a real typo.
    _closest(key) {
        let best = null, bestD = Infinity;
        const lk = key.toLowerCase();
        for (let i = 0; i < KNOWN_KEYS.length; i++) {
            const d = this._editDistance(lk, KNOWN_KEYS[i].toLowerCase());
            if (d < bestD) { bestD = d; best = KNOWN_KEYS[i]; }
        }
        return bestD <= Math.max(2, Math.ceil(key.length / 3)) ? best : null;
    },

    // Flag override keys the engine does not recognise (e.g. a typo'd `snapshsot`,
    // which used to be silently ignored). Default: a console warning, suppressed at
    // logLevel 'silent'. With strictMode:true it fails a test so CI blocks the run.
    _validateKeys(ctx, override) {
        if (!override || typeof override !== 'object') return;
        // extraKeys lets a config allowlist custom/plugin keys the core doesn't know.
        const extra = Array.isArray(ctx.config.extraKeys) ? ctx.config.extraKeys : [];
        const unknown = Object.keys(override).filter(k => KNOWN_KEYS.indexOf(k) === -1 && extra.indexOf(k) === -1);
        if (!unknown.length) return;

        if (ctx.config.strictMode === true) {
            pm.test(t(ctx, 'configMerge.strictFailTest'), function () {
                throw new Error(t(ctx, 'configMerge.strictFailError', unknown.join(', ')));
            });
            return;
        }
        if (ctx.config.logLevel === 'silent') return;
        const self = this;
        unknown.forEach(function (k) {
            const near = self._closest(k);
            console.warn(near
                ? t(ctx, 'configMerge.unknownKeySuggest', k, near)
                : t(ctx, 'configMerge.unknownKey', k));
        });
    },

    run(ctx, override) {
        let defaults = {};
        try {
            const raw = pm.collectionVariables.get('hephaestus.defaults');
            if (raw) defaults = JSON.parse(raw);
        } catch (e) {
            ctx._meta.errors.push(t(ctx, 'configMerge.parseDefaultsFailed', e.message));
        }
        ctx.config = this._merge(defaults, override || {});
        this._validateKeys(ctx, override);
    }
};
