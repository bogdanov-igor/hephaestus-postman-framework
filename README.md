<div align="center">

# ⚒️ Hephaestus

**Модульный фреймворк автоматизации API-тестирования для Postman**

[![Version](https://img.shields.io/badge/version-3.0.0-blue?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Postman](https://img.shields.io/badge/Postman-v10+-orange?style=flat-square&logo=postman&logoColor=white)](https://postman.com)
[![Apidog](https://img.shields.io/badge/Apidog-compatible-9cf?style=flat-square)](https://apidog.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-sandbox-yellow?style=flat-square&logo=javascript&logoColor=black)](v3/engine)
[![Author](https://img.shields.io/badge/author-Bogdanov_Igor-blueviolet?style=flat-square)](mailto:bogdanov.ig.alex@gmail.com)

[Быстрый старт](#-быстрый-старт) · [Конфигурация](#%EF%B8%8F-конфигурация) · [Модули](#-модули) · [Архитектура](#%EF%B8%8F-архитектура) · [APIDog](#-совместимость-с-apidog) · [Автор](#-автор)

</div>

---

## Что такое Hephaestus?

**Hephaestus** — open-source фреймворк для организации, автоматизации и стандартизации API-тестирования в Postman. Он превращает разрозненные pre/post-request скрипты в единую, управляемую систему с поддержкой snapshot-регрессии, валидации схем, гибкой авторизации и маскирования секретов.

Фреймворк построен по принципу **orchestrator → ctx → pipeline модулей**. Каждый запрос в Postman содержит только минимальный `override`-конфиг — всю логику берёт на себя движок, загруженный из git.

> Назван в честь бога кузнечного дела в греческой мифологии — **Гефеста**. Как Гефест создавал совершенные инструменты для богов, так и этот фреймворк создаёт надёжную инфраструктуру для инженеров по автоматизации.

### Для кого подходит?

- QA-инженеры, автоматизирующие тестирование REST / XML API
- Команды, использующие Postman как основной инструмент
- Проекты с большим количеством методов, которым нужен единый стандарт
- Команды, которым важно snapshot-регрессионное тестирование без CI-оверхеда

---

## ✨ Возможности

| Возможность | Описание |
|---|---|
| 🔄 **Pipeline-архитектура** | Orchestrator управляет цепочкой модулей через единый `ctx` |
| ⚙️ **Defaults + Override** | Конфиг на уровне коллекции + переопределение на уровне метода |
| 📸 **Snapshot-регрессия** | Автоматический baseline, strict/non-strict режимы, checkPaths/ignorePaths |
| 🔐 **Auth-плагин** | `none`, `basic`, `bearer`, `headers`, `variables` — настраивается per-request |
| 🔍 **Extract API** | `ctx.api.get()`, `.find()`, `.count()`, `.save()` — для JSON и XML |
| ✅ **Assertions** | `keysToFind`, `varsToSave`, `keysToCount` — с ожидаемыми значениями |
| 📋 **Schema-валидация** | JSON Schema через встроенный `tv4` без зависимостей |
| 🛡️ **Маскирование секретов** | Токены и пароли не попадают в логи — автоматически |
| 📊 **Красивые логи** | Эмодзи, ASCII-рамки, preview ответа, CI-режим (JSON output) |
| 🔄 **Auto-update** | Движок обновляется из git одним запросом — `engine-update` |

---

## 🏛️ Архитектура

```
┌──────────────────────────────────────────────────────────────────┐
│                         PRE-REQUEST                              │
│                                                                  │
│   configMerge → urlBuilder → auth → dateUtils → logger          │
│                                                                  │
│   • Объединяет hephaestus.defaults + override                    │
│   • Выставляет pm.variables.baseUrl                              │
│   • Подставляет auth (headers / pm.variables)                    │
│   • Логирует конфиг с маскированием секретов                     │
└──────────────────────────────────────────────────────────────────┘
                         ⬇️  HTTP запрос ⬇️
┌──────────────────────────────────────────────────────────────────┐
│                         POST-REQUEST                             │
│                                                                  │
│   configMerge → normalizeResponse → metrics → extractor          │
│   → assertions → snapshot → schema → logger                      │
│                                                                  │
│   • Парсит JSON / XML / text ответ в единый ctx.response         │
│   • Считает метрики (время, размер)                              │
│   • Предоставляет ctx.api для работы с данными                   │
│   • Проверяет assertions, сохраняет переменные                   │
│   • Сравнивает со snapshot или сохраняет baseline                │
│   • Валидирует JSON Schema                                       │
│   • Выводит структурированный лог                                │
└──────────────────────────────────────────────────────────────────┘
```

### ctx — центральный объект

```javascript
ctx = {
    config:   { /* merged: defaults + override */ },
    request:  { name, method, url },
    response: { body, status, headers, format, raw },
    metrics:  { responseTime, size },
    api:      { get(path), find(path, fn), count(path), save(path, target) }
}
```

### Как работает движок

```
Git (engine/pre-request.js + post-request.js)
         ↓  engine-update (pm.sendRequest)
collectionVariables["hephaestus.v3.pre"]
collectionVariables["hephaestus.v3.post"]
         ↓  каждый метод
eval(pm.collectionVariables.get("hephaestus.v3.pre"))
eval(pm.collectionVariables.get("hephaestus.v3.post"))
```

---

## 📋 Требования

| Требование | Описание |
|---|---|
| **Postman Desktop** v10+ | Рекомендуется для работы с коллекцией |
| **Интернет** | Нужен один раз для `engine-update` |
| **Git-репозиторий** | Движок хранится в git и загружается в коллекцию |

---

## 🚀 Быстрый старт

### Шаг 1 — Импортировать коллекцию

```
Postman → Import → v3/collection/hephaestus-template.postman_collection.json
```

### Шаг 2 — Привязать environment

Создать или подключить environment с переменными:

```
login.*          — логины пользователей
password.*       — пароли пользователей
channel.*        — дополнительные поля (если нужно)
```

### Шаг 3 — Настроить defaults

Открыть переменные коллекции → `hephaestus.defaults` → вставить конфиг:

```json
{
  "baseUrl": "https://your-api.example.com",
  "auth": { "enabled": false, "type": "none" },
  "contentType": "json",
  "expectEmpty": false,
  "snapshot": { "enabled": false, "autoSaveMissing": true, "mode": "non-strict" },
  "schema":   { "enabled": false },
  "secrets":  ["token", "password", "pass", "key"],
  "ci": false
}
```

### Шаг 4 — Загрузить движок

```
🛠️ Hephaestus System → 🔧 engine-update → Send
```

Движок загрузится из git в `hephaestus.v3.pre` и `hephaestus.v3.post`.  
Повторять при обновлении фреймворка.

### Шаг 5 — Написать метод

Каждый метод содержит только `override` + вызов движка:

**Pre-request:**
```javascript
const override = {
    auth: {
        enabled: true,
        type: "bearer",
        token: "{{prod.token}}"
    }
};

eval(pm.collectionVariables.get("hephaestus.v3.pre"));
```

**Post-request (Tests):**
```javascript
const override = {
    contentType: "json",
    keysToFind: [
        { path: "data.id",     name: "ID" },
        { path: "data.status", name: "Статус", expect: "active" }
    ],
    snapshot: { enabled: true, autoSaveMissing: true }
};

eval(pm.collectionVariables.get("hephaestus.v3.post"));
```

---

## ⚙️ Конфигурация

### hephaestus.defaults — полный список полей

| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| `baseUrl` | string | `""` | Базовый URL API |
| `auth.enabled` | boolean | `false` | Включить авторизацию |
| `auth.type` | string | `"none"` | Тип: `none`, `basic`, `bearer`, `headers`, `variables` |
| `contentType` | string | `"json"` | Формат ответа: `json`, `xml`, `text` |
| `expectEmpty` | boolean | `false` | Ожидать пустой ответ (нет проверки тела) |
| `dateFormat` | string | `"yyyy-MM-dd"` | Формат дат для dateUtils |
| `snapshot.enabled` | boolean | `false` | Включить snapshot-сравнение |
| `snapshot.mode` | string | `"non-strict"` | Режим: `strict` или `non-strict` |
| `snapshot.autoSaveMissing` | boolean | `true` | Автоматически сохранять baseline |
| `snapshot.checkPaths` | string[] | `[]` | Сравнивать только эти пути (пусто = всё) |
| `snapshot.ignorePaths` | string[] | `[]` | Игнорировать эти пути при сравнении |
| `schema.enabled` | boolean | `false` | Включить JSON Schema валидацию |
| `schema.definition` | object | `null` | JSON Schema объект |
| `secrets` | string[] | `[...]` | Ключи, значения которых маскируются в логах |
| `ci` | boolean | `false` | CI-режим: вывод логов как JSON |

### Auth-типы

| Тип | Что делает |
|---|---|
| `none` | Без авторизации |
| `basic` | `Authorization: Basic base64(user:pass)` |
| `bearer` | `Authorization: Bearer {token}` |
| `headers` | Подставляет произвольные заголовки |
| `variables` | Устанавливает `pm.variables` (для URL/Body подстановок) |

**Пример — variables (логин + канал + пароль):**
```javascript
auth: {
    enabled: true,
    type: "variables",
    fields: {
        "login":    "{{login.sbms.technical.main}}",
        "channel":  "{{channel.sbms.technical.main}}",
        "password": "{{password.sbms.technical.main}}"
    }
}
```

---

## 🧩 Модули

### Pre-request pipeline

| Модуль | Описание |
|---|---|
| `configMerge` | Deep merge: `hephaestus.defaults` + `override` → `ctx.config` |
| `urlBuilder` | Устанавливает `pm.variables.baseUrl` из `ctx.config.baseUrl` |
| `auth` | Плагин авторизации — применяет выбранный тип к запросу |
| `dateUtils` | Вычисляет даты (today, tomorrow и др.) и записывает в `pm.variables` |
| `logger` | Выводит конфиг запроса с маскированием секретов |

### Post-request pipeline

| Модуль | Описание |
|---|---|
| `configMerge` | Повторный merge для доступа к конфигу в тестах |
| `normalizeResponse` | Парсит JSON / XML / text → `ctx.response.body` (единый формат) |
| `metrics` | Фиксирует время ответа и размер тела |
| `extractor` | Инициализирует `ctx.api` — Extract API с методами `get/find/count/save` |
| `assertions` | Проверяет `keysToFind`, сохраняет `varsToSave`, считает `keysToCount` |
| `snapshot` | Сравнивает с baseline или сохраняет при `autoSaveMissing` |
| `schema` | Валидирует тело ответа по JSON Schema через `tv4` |
| `logger` | Структурированный лог: статус, metrics, assertions, snapshot, preview |

### Extract API — ctx.api

```javascript
// В post-request override можно использовать ctx.api (после eval):

ctx.api.get("data.user.id")               // → значение по пути
ctx.api.find("data.items", i => i.active) // → первый подходящий элемент
ctx.api.count("data.items")               // → количество элементов
ctx.api.save("data.token", {              // → сохранить в pm.variables / env / collection
    name: "prod.token",
    scope: "collection"
})
```

---

## 📸 Snapshot-регрессия

Snapshot сохраняется в `hephaestus.snapshots` (collectionVariables) как JSON-объект.

**Ключ snapshot:** `{collectionName}::{requestName}::{statusCode}::{format}`

| Режим | Поведение |
|---|---|
| `non-strict` | Проверяет только указанные `checkPaths`, игнорирует `ignorePaths` |
| `strict` | Полное побайтовое сравнение (с учётом `ignorePaths`) |

**Управление снапшотами:**

| Метод | Где |
|---|---|
| Просмотр | `🛠️ Hephaestus System → 📋 snapshot-view` |
| Очистка | `🛠️ Hephaestus System → 🗑️ snapshot-clear` |
| Фильтр | Переменная `hephaestus.snapshot.clearFilter` |

---

## 🔄 Обновление движка

Версия движка управляется через `hephaestus.version` в collectionVariables:

| Значение | Результат |
|---|---|
| `main` | Загружает последнюю версию из ветки `main` |
| `3.1.0` | Загружает конкретный тег `v3.1.0` |

После изменения версии → запустить `🔧 engine-update`.

---

## 🔌 Совместимость с Apidog

Hephaestus v3 **полностью совместим** с [Apidog](https://apidog.com) — популярной альтернативой Postman.

| Функция Hephaestus | Postman | Apidog |
|---|---|---|
| `pm.collectionVariables.get/set` | ✅ | ✅ (Module Variables) |
| `pm.sendRequest` | ✅ | ✅ |
| `eval()` | ✅ | ✅ |
| `pm.test` | ✅ | ✅ |
| `pm.response.json/text` | ✅ | ✅ |
| `pm.variables.set/get` | ✅ | ✅ |
| `pm.nextRequest` | — не используется | ❌ не поддерживается |

> В Apidog `collectionVariables` называются **Module Variables** в UI, но в коде работают идентично через `pm.collectionVariables.*`.

**Для импорта в Apidog:** `Import → Postman Collection → выбрать JSON файл`.  
Скрипты перенесутся без изменений.

---

## 📁 Структура репозитория

```
/
├── README.md                    — документация проекта
├── CHANGELOG.md                 — история изменений
├── LICENSE                      — лицензия MIT
└── v3/
    ├── README.md                — архитектура v3
    ├── engine/
    │   ├── pre-request.js       — движок pre-request  → hephaestus.v3.pre
    │   └── post-request.js      — движок post-request → hephaestus.v3.post
    ├── templates/
    │   ├── method.pre-request.js   — шаблон метода (pre)
    │   └── method.post-request.js  — шаблон метода (post)
    ├── setup/
    │   ├── defaults.json        — шаблон hephaestus.defaults
    │   ├── engine-update.js     — загрузка движка из git
    │   ├── snapshot-clear.js    — очистка снапшотов
    │   └── snapshot-view.js     — просмотр снапшотов
    └── collection/
        ├── README.md            — инструкция по импорту
        └── hephaestus-template.postman_collection.json  ← импортировать в Postman / Apidog
```

---

## 📝 Changelog

История изменений и список версий — [CHANGELOG.md](CHANGELOG.md)

---

## 👤 Автор

<table>
  <tr>
    <td valign="top">
      <strong>Богданов Игорь Александрович</strong><br/>
      Отдел инноваций, разработки архитектуры и решений<br/>
      Управление эксплуатации и развития ИТ сервисов<br/>
      Департамент информационных технологий<br/>
      <br/>
      📞 <a href="tel:+998901753836">+998 90 175 38 36</a><br/>
      ✉️ <a href="mailto:bogdanov.ig.alex@gmail.com">bogdanov.ig.alex@gmail.com</a>
    </td>
  </tr>
</table>

---

## 📄 Лицензия

Данный проект распространяется под лицензией **MIT**.  
Подробнее — [LICENSE](LICENSE).

```
Copyright (c) 2026 Богданов Игорь Александрович
```

При использовании фреймворка сохраняйте ссылку на автора и текст лицензии.
