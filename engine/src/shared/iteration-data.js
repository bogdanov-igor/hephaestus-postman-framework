// ════════════════════════════════════════════════════════════
// SHARED MODULE: iterationData
//
// Single source of truth — bundled verbatim into BOTH engine/pre-request.js and
// engine/post-request.js by `npm run build:emit` (esbuild inline). Edit HERE
// only; never edit the copies inside the generated engine bundles.
//
// Экспонирует данные текущей итерации Newman в ctx.iteration.
// Доступен при запуске через Newman с --iteration-data file.csv/json.
//
//   ctx.iteration:
//     index — текущая итерация (0-based)
//     count — всего итераций
//     data  — текущая строка как объект { field: value }
//     get(key) — значение поля по ключу
//
//   run(ctx, true)  → pre-request: дополнительно инжектит pm.variables("iter.key")
//                     для {{iter.email}} / {{iter.userId}} в URL / Body / Headers
//   run(ctx)        → post-request: только ctx.iteration (запрос уже отправлен)
//
// Depends only on the `pm` sandbox global + its (ctx) argument, so it bundles
// cleanly with no closure coupling to the engine IIFE.
// ════════════════════════════════════════════════════════════
export const iterationData = {
    run(ctx, inject) {
        var data = {};
        try {
            if (typeof pm.iterationData !== 'undefined' && pm.iterationData) {
                data = (pm.iterationData.toObject ? pm.iterationData.toObject() : {}) || {};
            }
        } catch(e) { /* iterationData недоступен в этом контексте */ }

        ctx.iteration = {
            index: pm.info.iteration || 0,
            count: pm.info.iterationCount || 1,
            data:  data,
            get: function(key) {
                try { return pm.iterationData ? pm.iterationData.get(key) : undefined; } catch(e) { return undefined; }
            }
        };

        // Инжектируем поля как pm.variables("iter.key") для {{iter.key}} в запросах
        if (inject) {
            Object.keys(data).forEach(function(key) {
                var val = data[key];
                pm.variables.set('iter.' + key, val !== null && val !== undefined ? String(val) : '');
            });
        }
    }
};
