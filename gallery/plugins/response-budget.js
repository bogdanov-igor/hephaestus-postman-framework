/**
 * Hephaestus Plugin — Response Budget
 *
 * Fails the run when a response is slower than its latency budget.
 *
 * Why a plugin and not `slaMsLimit`: a single global threshold is useless on a
 * real collection, where a login is allowed 2s and a cached lookup is not. This
 * resolves a per-request budget, falls back to a default, and can warn instead
 * of failing while a team is still finding its numbers.
 *
 * Installation:
 *   1. Collection variable `hephaestus.plugin.budget` = this file's text.
 *   2. Collection Pre-request:
 *      pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *          { name: 'response-budget', post: 'hephaestus.plugin.budget' }
 *      ]));
 *
 * Config (override):
 *   budgetMs        number   default budget in ms                  (default 1000)
 *   budgets         object   { 'Request Name': ms } exact-name map  (optional)
 *   budgetSoft      boolean  true = warn only, never fail           (default false)
 *   budgetWarnAt    number   0..1 — warn when over this fraction    (default 0.8)
 */

(function responseBudget(ctx) {
    'use strict';

    var cfg     = ctx.config;
    var name    = ctx.request.name;
    var actual  = ctx.response.time;

    // Per-request budget wins over the default; 0 is a legitimate value only as
    // "no budget", so treat any non-positive number as unset.
    var budget = cfg.budgetMs;
    if (cfg.budgets && typeof cfg.budgets === 'object' && cfg.budgets[name] !== undefined) {
        budget = cfg.budgets[name];
    }
    if (typeof budget !== 'number' || !(budget > 0)) budget = 1000;

    var soft   = cfg.budgetSoft === true;
    var warnAt = typeof cfg.budgetWarnAt === 'number' ? cfg.budgetWarnAt : 0.8;

    var over    = actual > budget;
    var pct     = Math.round((actual / budget) * 100);
    var summary = actual + 'ms / ' + budget + 'ms budget (' + pct + '%)';

    if (over) {
        // Push before the test so the line survives in the summary even when a
        // soft budget keeps the run green.
        ctx._meta.errors.push('response-budget: ' + name + ' exceeded budget — ' + summary);

        if (soft) {
            console.warn('⏱️ [response-budget] ⚠️ ' + name + ' — ' + summary);
        } else {
            pm.test('⏱️ [response-budget] ' + name + ' within ' + budget + 'ms', function() {
                pm.expect(actual, 'took ' + actual + 'ms, budget ' + budget + 'ms').to.be.at.most(budget);
            });
        }
        return;
    }

    // Approaching the limit is the signal worth acting on — by the time it
    // fails, the regression already shipped.
    if (warnAt > 0 && actual >= budget * warnAt) {
        console.warn('⏱️ [response-budget] 🟡 ' + name + ' near budget — ' + summary);
    }

    pm.test('⏱️ [response-budget] ' + name + ' within ' + budget + 'ms', function() {
        pm.expect(actual).to.be.at.most(budget);
    });
}(ctx));
