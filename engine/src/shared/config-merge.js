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
    run(ctx, override) {
        let defaults = {};
        try {
            const raw = pm.collectionVariables.get('hephaestus.defaults');
            if (raw) defaults = JSON.parse(raw);
        } catch (e) {
            ctx._meta.errors.push('configMerge: не удалось разобрать hephaestus.defaults — ' + e.message);
        }
        ctx.config = this._merge(defaults, override || {});
    }
};
