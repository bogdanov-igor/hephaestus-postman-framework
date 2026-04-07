/**
 * Hephaestus Plugin — Microsoft Teams Notifier
 *
 * Отправляет Adaptive Card в Teams-канал через Incoming Webhook когда:
 *   - HTTP-статус 5xx
 *   - Есть провалившиеся assertions
 *
 * Установка:
 *   1. Создай Incoming Webhook в Teams:
 *      Канал → ... → Connectors → Incoming Webhook → Configure
 *   2. Сохрани URL в collectionVariable: hephaestus.plugin.teamsUrl
 *   3. Добавь этот код в hephaestus.plugins:
 *
 *      pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *          { name: 'teams-notifier', code: pm.collectionVariables.get('hephaestus.plugin.teams') }
 *      ]));
 *
 *   4. Сохрани текст этого файла в collectionVariable: hephaestus.plugin.teams
 */

(function teamsNotifier(ctx) {
    var webhookUrl = ctx.config.teamsUrl
        || pm.collectionVariables.get('hephaestus.plugin.teamsUrl')
        || pm.environment.get('TEAMS_WEBHOOK_URL');

    if (!webhookUrl) return;

    var onlyFailures = ctx.config.teamsOnlyFailures !== false;

    var code    = ctx.api.status;
    var isError = code >= 500;
    var results = ctx._meta.results || {};

    var failedAssertions = [];
    Object.keys(results).forEach(function(key) {
        var bucket = results[key];
        if (Array.isArray(bucket)) {
            bucket.filter(function(r) { return r && r.passed === false; })
                  .forEach(function(r) { failedAssertions.push(r.name || key); });
        }
    });

    var hasFailed = isError || failedAssertions.length > 0;
    if (onlyFailures && !hasFailed) return;

    var color   = hasFailed ? 'attention' : 'good';
    var title   = hasFailed ? '🔴 API Test Failed' : '🟢 API Test Passed';
    var reqName = ctx.request.method + ' ' + ctx.request.name;
    var envName = pm.environment.name || '—';

    var facts = [
        { title: 'Request',       value: reqName },
        { title: 'Status Code',   value: String(code) },
        { title: 'Response Time', value: ctx.api.responseTime + 'ms' },
        { title: 'Environment',   value: envName },
    ];

    if (failedAssertions.length > 0) {
        facts.push({ title: 'Failed', value: failedAssertions.join(', ') });
    }

    // MessageCard format (legacy — works with all Teams webhook connectors)
    var payload = {
        '@type':      'MessageCard',
        '@context':   'https://schema.org/extensions',
        themeColor:   hasFailed ? 'CC0000' : '36A64F',
        summary:      title,
        sections: [{
            activityTitle: '**' + title + '**',
            activityText:  ctx.request.url || '',
            facts:         facts,
            markdown:      true,
        }],
        potentialAction: [{
            '@type': 'OpenUri',
            name:    'View Collection',
            targets: [{ os: 'default', uri: 'https://github.com/bogdanov-igor/hephaestus-postman-framework' }],
        }],
    };

    pm.sendRequest({
        url:    webhookUrl,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        body:   { mode: 'raw', raw: JSON.stringify(payload) },
    }, function(err) {
        if (err) console.warn('[teams-notifier] Send error: ' + err.message);
    });
}(ctx));
