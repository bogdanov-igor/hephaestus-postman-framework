# Hephaestus Plugins

Готовые плагины для расширения post-request пайплайна без правки движка.

## Как использовать

### 1. Добавить код плагина в collection variable

```
hephaestus.plugin.<name>  →  <содержимое .js файла>
```

### 2. Зарегистрировать плагины в `hephaestus.plugins`

Один плагин:
```javascript
pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
    { name: 'slack-notifier', code: pm.collectionVariables.get('hephaestus.plugin.slack') }
]));
```

Несколько плагинов:
```javascript
pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
    { name: 'slack-notifier',    code: pm.collectionVariables.get('hephaestus.plugin.slack') },
    { name: 'custom-assertions', code: pm.collectionVariables.get('hephaestus.plugin.custom') },
]));
```

> Устанавливай `hephaestus.plugins` в **Pre-request** скрипте коллекции,  
> чтобы оно было доступно во всех запросах.

### 3. Конфигурация плагинов через `override`

```javascript
const override = {
    // Slack plugin config
    slackUrl: pm.collectionVariables.get('hephaestus.plugin.slackUrl'),
    slackOnlyFailures: true,

    // Teams plugin config
    teamsOnlyFailures: true,

    // Custom assertions config
    slaMsLimit: 2000,
    checkCors: true,
    assertJsonApi: false,
};
```

---

## Доступные плагины

### `slack-notifier.js`
Отправляет уведомление в Slack при HTTP 5xx или провале assertions.

**Переменные:**
| Variable | Описание |
|---|---|
| `hephaestus.plugin.slackUrl` | Slack Incoming Webhook URL |

**Config override:**
| Ключ | По умолчанию | Описание |
|---|---|---|
| `slackUrl` | из collectionVar | Webhook URL |
| `slackOnlyFailures` | `true` | Слать только при ошибках |

---

### `teams-notifier.js`
Microsoft Teams Adaptive Card при провале.

**Переменные:**
| Variable | Описание |
|---|---|
| `hephaestus.plugin.teamsUrl` | Teams Incoming Webhook URL |

**Config override:**
| Ключ | По умолчанию | Описание |
|---|---|---|
| `teamsUrl` | из collectionVar | Webhook URL |
| `teamsOnlyFailures` | `true` | Слать только при ошибках |

---

### `custom-assertions.js`
Библиотека кастомных assertions поверх стандартного пайплайна.

Из коробки проверяет:
- Response time SLA (настраивается через `slaMsLimit`)
- Pagination contract (автоматически, если поле `page` присутствует)
- Error body contract (для 4xx/5xx ответов)
- Data-driven field check (если `ctx.iteration.data.expectedId` задан)
- CORS headers (если `checkCors: true`)
- JSON:API compliance (если `assertJsonApi: true`)

Редактируй файл под свои нужды — это шаблон.

---

## Написать свой плагин

Плагин — это самовызывающаяся функция `(function myPlugin(ctx) { ... }(ctx))`.

Доступные объекты:

| Объект | Тип | Описание |
|---|---|---|
| `ctx.api.body` | `object \| string` | Parsed response body |
| `ctx.api.status` | `number` | HTTP status code |
| `ctx.api.headers` | `object` | Response headers (lowercase keys) |
| `ctx.api.responseTime` | `number` | Response time in ms |
| `ctx.config` | `object` | Merged hephaestus config |
| `ctx.request` | `object` | `{ name, method, url }` |
| `ctx.iteration` | `object` | `{ index, count, data, get(key) }` |
| `ctx._meta` | `object` | Internal meta (results, errors, version) |
| `pm` | Postman SDK | Полный доступ к pm API |

Пример минимального плагина:
```javascript
(function myPlugin(ctx) {
    if (ctx.api.status === 429) {
        pm.test('⚠️ Rate limit hit — retry later', function() {
            pm.expect(ctx.api.status).to.not.equal(429);
        });
    }
}(ctx));
```
