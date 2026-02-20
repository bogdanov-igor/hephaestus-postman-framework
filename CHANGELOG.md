# Changelog

Формат: **[версия] — дата — краткое почему/зачем**

---

## [3.2.0] — 2026-02-20 — Рефакторинг структуры и полировка

### Добавлено
- `README.ru.md` — полная русскоязычная документация
- Раздел о маскировании секретов (URL query params + ключи ответа)

### Изменено
- **Структура репозитория:** `v3/engine/`, `v3/setup/`, `v3/templates/`, `v3/collection/` перемещены в корень
  - `engine/`, `setup/`, `templates/`, `collection/` — без prefix версии
  - Пути в `engine-update.js` и `hephaestus-template.postman_collection.json` обновлены
- **`README.md`** полностью переписан на английский язык, добавлен language switcher
- **GitHub About:** описание и теги (topics) обновлены через API
- **`normalizeResponse`:** `xml2Json` (deprecated) заменён на `require('xml2js')`
  - Сохранён fallback на `xml2Json` для совместимости
- **`logger.summary` (post-request):** полная переработка
  - URL query params с чувствительными ключами теперь маскируются в логе
  - Response preview перемещён внутрь единого блока — нет "floating quotes"
  - Все секции выводятся одним `console.log` (один блок в Postman Console)
  - Консистентные рамки: `╔/╚` сверху/снизу, `╠/╣` для разделителей

---

## [3.1.0] — 2026-02-20 — Публикация

### Добавлено
- `LICENSE` (MIT) — авторство Богданов Игорь Александрович
- `README.md` полностью переписан: русский язык, professional-оформление для распространения
  - Hero-секция с badges (version, license, Postman, Apidog, author)
  - Полная таблица конфигурации, auth-типов, snapshot-режимов, модулей
  - Раздел совместимости с Apidog
  - Таблица совместимости `pm.*` API
  - Контакты автора
- Добавлена авторская атрибуция во все ключевые файлы

### Изменено
- Приведена к единому формату документация в `v3/`

---

## [3.0.0] — 2026-02-20 — Финал ✅

**Зачем:** v2 имел критические проблемы безопасности и архитектурные ограничения,
которые блокировали развитие фреймворка как универсального инструмента.

**Ключевые проблемы v2, которые решает v3:**
- `eval(pm.environment.get(...))` — код исполнялся из environment (неконтролируемый источник)
- URL зависел от `zone` + `methodType` — бизнес-логика UCELL в ядре
- Нет маскирования секретов — токены в открытом виде в console
- Нет snapshot/regression — нельзя сравнивать ответы во времени
- Дублированный `interpolate()` с разным поведением

### Added
- Модульная архитектура: orchestrator + ctx + 11 модулей
- Engine хранится в `collectionVariables`, обновляется через git (`engine-update`)
- Единый объект `override` вместо разрозненных `const` переменных в методе
- `ctx` — единая структура данных на весь pipeline
- `ctx.api` — удобный экстрактор: get / find / count / save
- Snapshot: baseline + сравнение, `checkPaths`, `ignorePaths`, `autoSaveMissing`
- Secret masking: маскирование середины значения по именам ключей
- Auth plugin: `none` / `basic` / `bearer` / `headers` / `variables` (универсальный — любой набор полей)
- Schema validation: JSON Schema (draft-07), XML, text/plain
- Snapshot: хранение в едином объекте `hephaestus.snapshots`, опциональный Postman API storage
- Logger: разделители, эмодзи, masking секретов, CI JSON-дублирование
- CI-режим: структурированный JSON-лог + стандартные pm.test
- Версионирование движка: `hephaestus.version` → конкретный тег / `main`

### Итерация 1 ✅ — реализовано (2026-02-20)
- `pre-request.js`: orchestrator · ctx · configMerge · urlBuilder · auth · dateUtils · logger
- `post-request.js`: orchestrator · ctx · configMerge · normalizeResponse · metrics · logger
- Logger: рамки, разделители, эмодзи, preview с маскированием секретов, CI JSON-дублирование
- Auth: 5 типов — none / basic / bearer / headers / variables

### Итерация 2 ✅ — реализовано (2026-02-20)
- `extractor`: `_getDeep`, `_extractArray`, `_toLowerDeep` — взяты из v2, улучшены
- `ctx.api`: get(path) / find(path, predicate) / count(path) / save(path, target)
- `assertions.runFind`: keysToFind — наличие + expect (значение или предикат `v => bool`)
- `assertions.runSave`: varsToSave — сохранение в collection / environment / local
- `assertions.runCount`: keysToCount — подсчёт с filter / transformBefore / transformAfter / type: object
- logger.summary: секция assertions (found / saved / counts) + финальный разделитель
- CI JSON включает found[], saved[], counts[]

### Итерация 3 ✅ — реализовано (2026-02-20)
- `snapshot`: единое хранилище `hephaestus.snapshots` в collectionVariables
- Ключ: `{collectionName}::{requestName}::{statusCode}::{format}`
- `collectionName` берётся из `collectionVariables["hephaestus.collectionName"]`
- Режим `strict`: полное deep-equal + детальный diff
- Режим `non-strict`: все ключи из baseline должны присутствовать в текущем ответе
- `checkPaths`: сравниваем/храним только указанные пути (снижает объём)
- `ignorePaths`: удаляем пути из обоих объектов перед сравнением
- `autoSaveMissing`: автоматически сохраняет baseline при первом запуске
- Предупреждение при `hephaestus.snapshots > 900KB`
- `storage: "postman-api"` — заглушка (TODO)
- `schema`: валидация через `tv4` (глобал Postman sandbox, JSON Schema draft-04/07)
- logger.summary: секции snapshot и schema в итоговом блоке
- CI JSON обновлён: включает snapshot и schema результаты

### Финализация ✅ — (2026-02-20)
- Удалены все legacy v2 файлы из корня репозитория
- `engine-update.js`: URL обновлён на реальный репозиторий `bogdanov-igor/hephaestus-postman-framework`
- `v3/collection/hephaestus-template.postman_collection.json`: полная Postman-коллекция для импорта
  - Папка `🛠️ Hephaestus System`: engine-update, snapshot-view, snapshot-clear (скрипты встроены)
  - Папка `📦 Collection → 📁 Авторизация`: два рабочих примера метода
  - Все переменные коллекции преднастроены
  - Документация в Postman Docs (markdown) для коллекции, папок и методов
  - Единый стиль именования: `{HTTP} :: {Описание}`
- `v3/collection/README.md`: инструкция по импорту и структуре

### Итерация 4 ✅ — реализовано (2026-02-20)
- `pre-request.js` logger: маскирование auth-значений (basic pass, bearer token, header/variable values)
- Правило маскирования: ключи из `ctx.config.secrets` + встроенный список (`token, pass, password, secret, key`)
- Формат маска: первые/последние 20% строки видны, середина = `***MASKED***`
- `setup/snapshot-clear.js`: очистка `hephaestus.snapshots` — полная или по фильтру
- `setup/snapshot-view.js`: просмотр всех снапшотов с метаданными и данными (по фильтру)
- Управление через collectionVariables: `hephaestus.snapshot.clearFilter`, `hephaestus.snapshot.viewFilter`

### Changed
- `eval(pm.environment.get(...))` → `eval(pm.collectionVariables.get(...))`
- URL: `baseUrl` напрямую из config, без `zone` / `methodType` / `environment`-префиксов
- Auth `credentials` → `variables` (универсальный набор полей)
- Auth `custom-header` → `headers` (поддержка нескольких заголовков)
- Snapshot: единый объект `hephaestus.snapshots` вместо отдельных ключей

### Removed
- Пинг сервера (pm.sendRequest в каждом pre-request)
- Зависимость от `zone`, `methodType`, `oapi`, `psapi` в ядре
- Дублированный `interpolate()` и UCELL-специфичная логика

---

## [2.0.2025] — 2025 — legacy

Рабочая версия. Файлы сохранены в корне репозитория:
- `pre-request-script` — ядро pre-request (хранилось в environment)
- `pre-reuqest-script-in-method` — конфиг метода + eval
- `post-request-script` — ядро post-request (хранилось в environment)
- `post-request-script-in-method` — конфиг метода + eval
