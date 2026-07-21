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
 *          { name: 'slack-notifier', post: 'hephaestus.plugin.slack' }
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

    // ctx.api is REPLACED by the extractor with { get, find, all, count, save } —
    // status/timing live on ctx.response.
    var code     = ctx.response.code;
    var expected = ctx.config.expectedStatus;
    var expList  = Array.isArray(expected) ? expected : (typeof expected === 'number' ? [expected] : null);
    // A 404 where a 200 was expected is a failure even though it is not a 5xx.
    var isError  = code >= 500 || (expList !== null && expList.indexOf(code) === -1);
    var results = ctx._meta.results || {};

    // What ctx._meta.results can and cannot tell us: it carries found/saved/counts/
    // headers as arrays, plus snapshot and schema as single objects. It does NOT
    // carry the status, body or contentType checks — those are only visible through
    // ctx.response, which is why the 5xx test above exists separately.
    var failedAssertions = [];
    Object.keys(results).forEach(function(key) {
        var bucket = results[key];
        if (Array.isArray(bucket)) {
            bucket.filter(function(r) { return r && r.ok === false; })
                  .forEach(function(r) { failedAssertions.push(r.name || key); });
        }
    });
    if (results.schema && results.schema.valid === false) {
        failedAssertions.push('schema (' + ((results.schema.errors || []).length) + ' error(s))');
    }
    if (results.snapshot && results.snapshot.status === 'diff') {
        failedAssertions.push('snapshot diff [' + (results.snapshot.key || '') + ']');
    }

    var hasFailed = isError || failedAssertions.length > 0;
    if (onlyFailures && !hasFailed) return;

    var color   = hasFailed ? '#CC0000' : '#36A64F';
    var status  = hasFailed ? '🔴 FAILED' : '🟢 OK';
    var reqName = ctx.request.name + ' [' + ctx.request.method + ']';
    var url     = ctx.request.url || '';

    var fields = [
        { title: 'Status Code', value: String(code), short: true },
        { title: 'Response Time', value: ctx.response.time + 'ms', short: true },
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
            footer:     'Hephaestus v' + (ctx._meta.version || '4.0.0'),
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
