/**
 * Hephaestus Plugin — Slack Notifier
 *
 * Отправляет уведомление в Slack-канал через Incoming Webhook когда:
 *   - HTTP-статус 5xx
 *   - Есть провалившиеся assertions
 *
 * Установка:
 *   1. Создай Incoming Webhook: https://api.slack.com/messaging/webhooks
 *   2. Сохрани URL в collectionVariable: hephaestus.plugin.slackUrl
 *   3. Добавь этот код в hephaestus.plugins:
 *
 *      pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *          { name: 'slack-notifier', code: pm.collectionVariables.get('hephaestus.plugin.slack') }
 *      ]));
 *
 *   4. Сохрани текст этого файла в collectionVariable: hephaestus.plugin.slack
 *
 * ctx.config доступные поля:
 *   slackUrl  — webhook URL (берётся из collectionVariables или config)
 *   slackOnlyFailures — true (default) / false — слать всегда
 */

(function slackNotifier(ctx) {
    var slackUrl = ctx.config.slackUrl
        || pm.collectionVariables.get('hephaestus.plugin.slackUrl')
        || pm.environment.get('SLACK_WEBHOOK_URL');

    if (!slackUrl) return; // плагин не настроен

    var onlyFailures = ctx.config.slackOnlyFailures !== false; // default: true

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

    var color   = hasFailed ? '#CC0000' : '#36A64F';
    var status  = hasFailed ? '🔴 FAILED' : '🟢 OK';
    var reqName = ctx.request.name + ' [' + ctx.request.method + ']';
    var url     = ctx.request.url || '';

    var fields = [
        { title: 'Status Code', value: String(code), short: true },
        { title: 'Response Time', value: ctx.api.responseTime + 'ms', short: true },
        { title: 'Environment', value: pm.environment.name || '—', short: true },
    ];

    if (failedAssertions.length > 0) {
        fields.push({ title: 'Failed Assertions', value: failedAssertions.join('\n'), short: false });
    }

    var payload = {
        attachments: [{
            color:      color,
            pretext:    status + '  *' + reqName + '*',
            title:      url,
            fields:     fields,
            footer:     'Hephaestus v' + (ctx._meta.version || '3.3.0'),
            ts:         Math.floor(Date.now() / 1000),
        }]
    };

    pm.sendRequest({
        url:    slackUrl,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        body:   { mode: 'raw', raw: JSON.stringify(payload) },
    }, function(err) {
        if (err) console.warn('[slack-notifier] Send error: ' + err.message);
    });
}(ctx));
