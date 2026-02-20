<div align="center">

# ⚒️ Hephaestus

**Модульный фреймворк автоматизации API-тестирования для Postman**

[![Version](https://img.shields.io/badge/version-3.0.0-blue?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Postman](https://img.shields.io/badge/Postman-v10+-orange?style=flat-square&logo=postman&logoColor=white)](https://postman.com)
[![Apidog](https://img.shields.io/badge/Apidog-compatible-9cf?style=flat-square)](https://apidog.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-sandbox-yellow?style=flat-square&logo=javascript&logoColor=black)](engine/)
[![Author](https://img.shields.io/badge/author-Bogdanov_Igor-blueviolet?style=flat-square)](mailto:bogdanov.ig.alex@gmail.com)

**[🇬🇧 English version](README.md)**

[Быстрый старт](#-быстрый-старт) · [Конфигурация](#️-конфигурация) · [Модули](#-модули) · [Архитектура](#️-архитектура) · [APIDog](#-совместимость-с-apidog) · [Автор](#-автор)

</div>

---

## Обзор

**Hephaestus** — open-source фреймворк для организации, автоматизации и стандартизации API-тестирования в Postman. Он заменяет разрозненные pre/post-request скрипты единым, версионируемым движком с поддержкой snapshot-регрессии, валидации схем, гибкой авторизации и маскирования секретов.

Каждый запрос в коллекции содержит только минимальный `override`-конфиг. Всю логику берёт на себя движок, загруженный из Git.

**Для кого:**
- QA-инженеры, автоматизирующие тестирование REST / XML API
- Команды, использующие Postman как основной инструмент
- Коллекции с большим количеством методов, которым нужен единый стандарт
- Проекты с требованием snapshot-регрессии без CI-оверхеда

---

## ✨ Возможности

| Возможность | Описание |
|---|---|
| 🔄 **Pipeline-архитектура** | Orchestrator управляет цепочкой модулей через единый объект `ctx` |
| ⚙️ **Defaults + Override** | Конфиг на уровне коллекции + переопределение на уровне метода |
| 📸 **Snapshot-регрессия** | Автоматический baseline, strict/non-strict режимы, checkPaths/ignorePaths |
| 🔐 **Auth-плагин** | `none`, `basic`, `bearer`, `headers`, `variables` — настраивается per-request |
| 🔍 **Extract API** | `ctx.api.get()`, `.find()`, `.count()`, `.save()` — для JSON и XML |
| ✅ **Assertions** | `keysToFind`, `varsToSave`, `keysToCount` — с ожидаемыми значениями |
| 📋 **Schema-валидация** | JSON Schema через встроенный `tv4` без зависимостей |
| 🛡️ **Маскирование секретов** | Токены, пароли и query-параметры URL маскируются в логах автоматически |
| 📊 **Красивые логи** | Эмодзи, ASCII-рамки, preview ответа, CI-режим (JSON output) |
| 🔄 **Auto-update** | Движок обновляется из Git одним запросом — `engine-update` |

---

## 🏛️ Архитектура

```
┌──────────────────────────────────────────────────────────────────┐
│                         PRE-REQUEST                              │
│                                                                  │
│   configMerge → urlBuilder → auth → dateUtils → logger           │
│                                                                  │
│   • Объединяет hephaestus.defaults + override                    │
│   • Выставляет pm.variables.baseUrl (автоподстановка протокола)  │
│   • Подставляет auth (headers / pm.variables)                    │
│   • Логирует конфиг с маскированием секретов                     │
└──────────────────────────────────────────────────────────────────┘
                        ⬇  HTTP-запрос  ⬇
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
│   • Выводит структурированный лог с маскированием               │
└──────────────────────────────────────────────────────────────────┘
```

### Как работает движок

```
Git (engine/pre-request.js + engine/post-request.js)
         ↓  engine-update (pm.sendRequest)
collectionVariables["hephaestus.v3.pre"]
collectionVariables["hephaestus.v3.post"]
         ↓  каждый метод
eval(pm.collectionVariables.get("hephaestus.v3.pre"))
eval(pm.collectionVariables.get("hephaestus.v3.post"))
```

### Объект `ctx`

```javascript
ctx = {
    config:   { /* merged: defaults + override */ },
    request:  { name, method, url },
    response: { parsed, raw, code, time, size, format },
    api:      { get(path), find(path, fn), count(path), save(path, target) }
}
```

---

## 🚀 Быстрый старт

### Шаг 1 — Импортировать коллекцию

```
Postman → Import → collection/hephaestus-template.postman_collection.json
```

### Шаг 2 — Привязать environment

Создать или подключить environment с переменными:

```
login.*      — логины пользователей
password.*   — пароли
channel.*    — дополнительные поля (если нужно)
```

### Шаг 3 — Настроить defaults

Открыть **⚙️ defaults** в `🛠️ Hephaestus System`, отредактировать JSON в Body и нажать **Send**:

```json
{
  "baseUrl": "https://your-api.example.com",
  "defaultProtocol": "https",
  "auth": { "enabled": false, "type": "none" },
  "contentType": "json",
  "snapshot": { "enabled": false, "autoSaveMissing": true, "mode": "non-strict" },
  "secrets": ["token", "password", "pass", "key"],
  "ci": false
}
```

### Шаг 4 — Загрузить движок

```
🛠️ Hephaestus System → 🔧 engine-update → Send
```

Движок загрузится из Git в `hephaestus.v3.pre` и `hephaestus.v3.post`.  
Повторять при обновлении фреймворка.

### Шаг 5 — Написать метод

Каждый метод содержит только `override` + вызов движка:

**Pre-request script:**
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

**Tests (Post-request):**
```javascript
const override = {
    contentType: "json",
    keysToFind: [
        { path: "data.id",     name: "ID" },
        { path: "data.status", name: "Статус", expect: "active" }
    ],
    varsToSave: [
        { path: "data.token", name: "prod.token", scope: "collection" }
    ],
    snapshot: { enabled: true, autoSaveMissing: true }
};

eval(pm.collectionVariables.get("hephaestus.v3.post"));
```

---

## ⚙️ Конфигурация

### Полный список полей

| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| `baseUrl` | string | `""` | Базовый URL API — протокол можно не указывать, подставится автоматически |
| `defaultProtocol` | string | `"https"` | Протокол по умолчанию, если в `baseUrl` не указан. `"http"` — выдаст предупреждение |
| `auth.enabled` | boolean | `false` | Включить авторизацию |
| `auth.type` | string | `"none"` | Тип: `none`, `basic`, `bearer`, `headers`, `variables` |
| `contentType` | string | `"json"` | Ожидаемый формат ответа: `json`, `xml`, `text` |
| `expectEmpty` | boolean | `false` | Ожидать пустой ответ |
| `dateFormat` | string | `"yyyy-MM-dd"` | Формат дат для dateUtils |
| `snapshot.enabled` | boolean | `false` | Включить snapshot-сравнение |
| `snapshot.mode` | string | `"non-strict"` | `strict` (полный diff) или `non-strict` (только checkPaths) |
| `snapshot.autoSaveMissing` | boolean | `true` | Автосохранение baseline при отсутствии |
| `snapshot.checkPaths` | string[] | `[]` | Сравнивать только эти пути (пусто = всё) |
| `snapshot.ignorePaths` | string[] | `[]` | Игнорировать эти пути |
| `schema.enabled` | boolean | `false` | Включить JSON Schema валидацию |
| `schema.definition` | object | `null` | JSON Schema объект |
| `secrets` | string[] | `[...]` | Ключи, значения которых маскируются в логах |
| `ci` | boolean | `false` | CI-режим: структурированный JSON-лог |

### Auth-типы

| Тип | Что делает |
|---|---|
| `none` | Без авторизации |
| `basic` | `Authorization: Basic base64(user:pass)` |
| `bearer` | `Authorization: Bearer {token}` |
| `headers` | Подставляет произвольные заголовки в запрос |
| `variables` | Устанавливает `pm.variables` для подстановок в URL / Body |

**Пример — `variables` (логин + канал + пароль):**
```javascript
auth: {
    enabled: true,
    type: "variables",
    fields: {
        "login":    "{{login.main}}",
        "channel":  "{{channel.main}}",
        "password": "{{password.main}}"
    }
}
```

### Маскирование секретов

Маскирование применяется **только к логам** — сохранённые значения не изменяются.

- Ключи, совпадающие со словами из списка `secrets`, маскируются: `AAAI3A***MASKED***KMR3ms`
- Query-параметры URL с совпадающими именами маскируются в POST-REQUEST логе
- Список настраивается через `secrets` в defaults или override

---

## 🧩 Модули

### Pre-request pipeline

| Модуль | Описание |
|---|---|
| `configMerge` | Deep merge: `hephaestus.defaults` + `override` → `ctx.config` |
| `urlBuilder` | Устанавливает `pm.variables.baseUrl`; автоподставляет `defaultProtocol` |
| `auth` | Auth-плагин — применяет выбранный тип к запросу |
| `dateUtils` | Вычисляет даты (today, tomorrow и др.) в `pm.variables` |
| `logger` | Логирует конфиг запроса с маскированием секретов |

### Post-request pipeline

| Модуль | Описание |
|---|---|
| `configMerge` | Повторный merge для доступа к конфигу в тестах |
| `normalizeResponse` | Парсит JSON / XML (xml2js) / text → `ctx.response` |
| `metrics` | Фиксирует время ответа и размер тела |
| `extractor` | Инициализирует `ctx.api` — Extract API с `get/find/count/save` |
| `assertions` | Проверяет `keysToFind`, сохраняет `varsToSave`, считает `keysToCount` |
| `snapshot` | Сравнивает с baseline или сохраняет при `autoSaveMissing` |
| `schema` | Валидирует тело ответа по JSON Schema через `tv4` |
| `logger` | Структурированный лог: статус, метрики, assertions, preview |

### Extract API

```javascript
ctx.api.get("data.user.id")                // → значение по пути
ctx.api.find("data.items", i => i.active)  // → первый подходящий элемент
ctx.api.count("data.items")                // → количество элементов
ctx.api.save("data.token", {               // → сохранить в pm.variables / env / collection
    name: "prod.token",
    scope: "collection"
})
```

---

## 📸 Snapshot-регрессия

Snapshot хранится в `hephaestus.snapshots` (collectionVariables) как JSON-объект.

**Ключ snapshot:** `{collectionName}::{requestName}::{statusCode}::{format}`

| Режим | Поведение |
|---|---|
| `non-strict` | Проверяет только `checkPaths`, игнорирует `ignorePaths` |
| `strict` | Полное сравнение структуры (с учётом `ignorePaths`) |

**Управление снапшотами:**

| Действие | Расположение |
|---|---|
| Просмотр | `🛠️ Hephaestus System → 📋 snapshot-view` |
| Очистка | `🛠️ Hephaestus System → 🗑️ snapshot-clear` |
| Фильтр | Переменная `hephaestus.snapshot.clearFilter` |

---

## 🔄 Обновление движка

Версия движка задаётся в `hephaestus.version` (collectionVariables):

| Значение | Результат |
|---|---|
| `main` | Загружает последний коммит из ветки `main` |
| `3.1.0` | Загружает тег `v3.1.0` |

После изменения версии → запустить `🔧 engine-update`.

**Приватные репозитории:** задайте `hephaestus.githubToken` (GitHub PAT).  
Движок переключится на GitHub Contents API вместо raw-ссылок.

---

## 🔌 Совместимость с Apidog

Hephaestus v3 **полностью совместим** с [Apidog](https://apidog.com).

| Функция | Postman | Apidog |
|---|---|---|
| `pm.collectionVariables.get/set` | ✅ | ✅ (Module Variables) |
| `pm.sendRequest` | ✅ | ✅ |
| `eval()` | ✅ | ✅ |
| `pm.test` | ✅ | ✅ |
| `pm.response.json/text` | ✅ | ✅ |
| `pm.variables.set/get` | ✅ | ✅ |

> В Apidog `collectionVariables` называются **Module Variables** в UI, но в коде работают идентично через `pm.collectionVariables.*`.

**Для импорта в Apidog:** `Import → Postman Collection → выбрать JSON файл`.  
Скрипты переносятся без изменений.

---

## 📁 Структура репозитория

```
/
├── README.md                     — документация (English)
├── README.ru.md                  — документация (Русский)
├── CHANGELOG.md                  — история изменений
├── LICENSE                       — лицензия MIT
├── engine/
│   ├── pre-request.js            — движок pre-request  → hephaestus.v3.pre
│   └── post-request.js           — движок post-request → hephaestus.v3.post
├── templates/
│   ├── method.pre-request.js     — шаблон метода (pre)
│   └── method.post-request.js    — шаблон метода (post)
├── setup/
│   ├── defaults.json             — шаблон hephaestus.defaults
│   ├── engine-update.js          — загрузка движка из Git
│   ├── snapshot-clear.js         — очистка снапшотов
│   └── snapshot-view.js          — просмотр снапшотов
└── collection/
    ├── README.md                 — инструкция по импорту
    └── hephaestus-template.postman_collection.json
```

---

## 📝 Changelog

История изменений — [CHANGELOG.md](CHANGELOG.md)

---

## 👤 Автор

**Богданов Игорь Александрович**  
📞 [+998 90 175 38 36](tel:+998901753836)  
✉️ [bogdanov.ig.alex@gmail.com](mailto:bogdanov.ig.alex@gmail.com)  
🐙 [github.com/bogdanov-igor](https://github.com/bogdanov-igor)

---

## 📄 Лицензия

Проект распространяется под лицензией **MIT** — см. [LICENSE](LICENSE).

```
Copyright (c) 2026 Bogdanov Igor Alexandrovich
```
