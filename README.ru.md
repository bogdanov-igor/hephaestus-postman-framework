<p align="center">
  <img src="docs/assets/banner.svg?v=3.9" alt="Hephaestus — модульный фреймворк API-тестирования для Postman" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.9.0-e25822?style=flat-square" alt="version 3.9.0">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT">
  <img src="https://img.shields.io/badge/engine-191%20KB-success?style=flat-square" alt="191 KB engine">
  <img src="https://img.shields.io/badge/runtime%20deps-0-success?style=flat-square" alt="zero runtime dependencies">
  <img src="https://img.shields.io/badge/tests-46%20%C2%B7%20200%20golden-success?style=flat-square" alt="46 tests, 200 golden assertions">
  <img src="https://img.shields.io/badge/locale-ru%20%C2%B7%20en-success?style=flat-square" alt="locale ru / en">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Русский</b>
</p>

<p align="center"><i>Разрозненные скрипты, выкованные в единый движок.</i></p>

---

Hephaestus — это модульный фреймворк API-тестирования для Postman и Newman.
Вместо кучи скопированных pre/post-request скриптов каждый запрос несёт
небольшой конфиг `override` и делегирует всю логику одному движку под контролем
версий: слияние конфигов, авторизация, проверки, регрессия по снапшотам,
валидация по схеме, аудит безопасности и структурированное логирование — всё
в фиксированном конвейере.

Тот же автор и тот же фирменный стиль, что и у [Keel](https://github.com/bogdanov-igor/keel)
и [Loft](https://github.com/bogdanov-igor/loft), моих ядер для Claude Code.
Это другая предметная область — общая только дисциплина: измеряй то, что
выпускаешь, будь честен в том, чего оно не делает, и не тащи за собой ни одного
сервиса, который тебе не нужен.

## Новое — вывод на английском и русском

Каждая обращённая к пользователю строка, которую выдаёт движок — имена тестов,
строки логов, сообщения проверок, метки статусов, аудит безопасности — теперь
проходит через каталог локализации
([`engine/src/shared/i18n.js`](engine/src/shared/i18n.js)). Язык выбирается в
конфиге:

```json
{ "locale": "en" }
```

По умолчанию `"ru"`, и он **побайтово идентичен** каждому предыдущему релизу,
так что существующие коллекции и их золотые эталоны не сдвигаются. `"en"` даёт
тот же движок на английском. Golden-харнесс фиксирует оба.

## Быстрый старт

В одном репозитории поставляются две среды выполнения: **движок**, работающий
внутри Postman, и **Node CLI без зависимостей** для Newman и CI. Начните с
движка.

**1.** Импортируйте поставляемую коллекцию — движок встроен на этапе сборки,
поэтому свежий импорт работает офлайн, без шага загрузки:

```text
Postman → Import → collection/hephaestus-template.postman_collection.json
```

**2.** Откройте **⚙️ defaults** в папке `Hephaestus System`, отредактируйте
JSON-тело и нажмите Send:

```json
{
  "baseUrl": "https://your-api.example.com",
  "locale": "en",
  "auth": { "enabled": false, "type": "none" },
  "contentType": "json",
  "snapshot": { "enabled": false, "autoSaveMissing": true, "mode": "non-strict" },
  "secrets": ["token", "password", "pass", "secret", "key", "authorization", "session"],
  "ci": false
}
```

**3.** Задайте любому запросу `override` и передайте управление движку.
Pre-request:

```javascript
const override = {
  auth: { enabled: true, type: "bearer", token: "{{prod.token}}" }
};
eval(pm.collectionVariables.get("hephaestus.v3.pre"));
```

Тесты (post-request):

```javascript
const override = {
  contentType: "json",
  keysToFind: [
    { path: "data.id",     name: "ID" },
    { path: "data.status", name: "Status", expect: "active" }
  ],
  varsToSave: { token: { path: "data.token", name: "prod.token", scope: "collection" } },
  snapshot: { enabled: true, autoSaveMissing: true }
};
eval(pm.collectionVariables.get("hephaestus.v3.post"));
```

**4.** Для CI запустите Newman и прогоните результаты через CLI (из клона этого
репозитория):

```sh
newman run collection.json -e env.json --reporter-json-export results.json -r json
node bin/hephaestus.js summary results.json --sla=500   # p95-гейт, exit 1 при превышении
```

### Обновление движка

Встроенный движок уже работает. Чтобы подтянуть более свежую сборку из Git на
месте, отправьте запрос `engine-update` в папке `Hephaestus System`. Он
загружает `engine/pre-request.js` и `engine/post-request.js`, сверяет оба с
[`engine/checksums.json`](engine/checksums.json) (SHA-256, внутри песочницы)
перед установкой и сохраняет их в `hephaestus.v3.pre` / `hephaestus.v3.post`.

## Что внутри

- **Движок.** ES-модули в `engine/src/**`, собранные esbuild в два файла
  (~191 КБ суммарно) и выполняемые через eval внутри песочницы Postman —
  движок-как-данные, без установки плагинов, без внешней среды выполнения. Один
  pre-request конвейер и один post-request конвейер прогоняют цепочку модулей
  через общий `ctx`.
- **Коллекция без загрузок.** Поставляемая коллекция встраивает текущий движок
  на этапе сборки. Свежий импорт работает офлайн; `engine-update` нужен только
  чтобы позже подтянуть более новый код.
- **Регрессия по снапшотам.** Эталоны живут в `hephaestus.snapshots` с ключом
  `collection::request::status::format`. `strict` сравнивает всё тело,
  `non-strict` проверяет только `checkPaths`. `snapshotRecord` принудительно
  перезаписывает устаревший эталон за один прогон, когда API изменился по делу.
- **Валидация по схеме.** JSON Schema через встроенный `tv4` — без зависимостей.
- **Аудит безопасности.** Опциональные пассивные проверки ответа: отсутствие
  защитных заголовков, раскрытие версии сервера, утечки stack-trace / debug в
  теле, небезопасный CORS. Каждая выдаёт собственный тест, так что нарушение
  политики валит прогон.
- **Перцентили SLA.** Сводка CLI сообщает времена ответа p50/p90/p95/p99 и
  контролирует прогон по `--sla=<ms>`.
- **Импорт OpenAPI / Swagger.** Превращает спецификацию OpenAPI 3.x или
  Swagger 2.0 (JSON или распространённое подмножество YAML) в готовую коллекцию
  — с заранее заполненными `expectedStatus` и `schema` на каждую операцию —
  без зависимостей.
- **Снапшоты → Postman Examples.** Синхронизирует сохранённые снапшоты в
  нативные Example Responses, пригодные для Mock Server.
- **Маскирование секретов.** Ключи, названные в `secrets`, и совпадающие
  query-параметры URL маскируются только в выводе логов — сохранённые значения
  никогда не меняются.

## Что остаётся за рамками

- **Собственного тест-раннера нет.** Hephaestus — это логика; выполняют её
  Postman и Newman. Нет ни демона, ни хостящегося сервиса, ни дашборда, ни базы
  данных.
- **Состояние живёт в коллекции.** Снапшоты, токены OAuth2 и плагины — это
  переменные коллекции. Это делает всё портируемым и diff-абельным, но это не
  хранилище данных — большие наборы снапшотов место в настоящем регрессионном
  конвейере.
- **Проверка целостности — это защита от подмены, а не подтверждение
  авторства.** `engine-update` доказывает, что загруженный код соответствует
  `checksums.json` при передаче. Он не доказывает, кто написал эту контрольную
  сумму — подписи нет. Доверяйте источнику, из которого тянете. То же самое
  сказано в [SECURITY.md](SECURITY.md).
- **Схема — это JSON Schema draft 4** (встроенный `tv4`), а не новейшие
  черновики — цена нулевых runtime-зависимостей.
- **Импорт OpenAPI разбирает JSON и распространённое подмножество YAML**, а не
  полную спецификацию YAML. Экзотические спецификации могут потребовать сначала
  конвертации в JSON.

## Конфигурация

Всё — это один слитый конфиг: `hephaestus.defaults` (на всю коллекцию),
глубоко слитый с `override` на каждый запрос. Основные поля:

| Поле | По умолчанию | Назначение |
|---|---|---|
| `baseUrl` | `""` | База API; протокол подставляется из `defaultProtocol`, если опущен |
| `locale` | `"ru"` | Язык вывода движка — `"ru"` или `"en"` |
| `auth` | `none` | `none` · `basic` · `bearer` · `headers` · `variables` · `oauth2cc` |
| `contentType` | `"json"` | Разбор ответа: `json` · `xml` · `text` |
| `expectedStatus` | `[200,201,202]` | Ожидаемый HTTP-статус — число или список; управляет негативным тестированием |
| `maxResponseTime` | `1000` | Провал, если ответ медленнее (мс) |
| `maxBytes` | выкл | Провал, если тело ответа больше N байт |
| `snapshot` | выключено | `mode`, `checkPaths`, `ignorePaths`, `autoSaveMissing`, `record` |
| `schema` | выключено | Определение JSON Schema, валидируемое через `tv4` |
| `securityAudit` | выключено | Пассивные проверки: заголовки · раскрытие · CORS · cookie-флаги · JWT · no-store |
| `secrets` | `[…]` | Имена ключей, маскируемые в логах |
| `ci` | `false` | Выдавать структурированную JSON-строку `[HEPHAESTUS_CI]` на запрос |

Полный справочник по каждому полю — в
[`docs/config-reference.html`](docs/config-reference.html).

## Модули

Движок — это фиксированный набор модулей, прогоняемых через общий `ctx`; это
перечень, а не точный порядок вызова:

**Pre-request** — `configMerge` · `envRequired` · `iterationData` · `random` ·
`urlBuilder` · `auth` · `dateUtils` · `logger`.

**Post-request** — `configMerge` · `normalizeResponse` · `metrics` ·
`extractor` · `assertions` · `assertEach` · `assertShape` · `graphql` ·
`assertOrder` · `assertUnique` · `assertHeaders` · `retryOnStatus` · `snapshot` · `schema` ·
`securityAudit` · `plugins` · `logger`.

`assertions` покрывает `keysToFind` / `varsToSave` / `keysToCount` / `assertMap` /
`maxResponseTime`; `extractor` открывает `ctx.api` с `get / find / all /
count / save` над JSON и XML, dot-пути и wildcard-ы `[*]`. Кастомные `plugins`
расширяют движок из переменных коллекции без форка. Детали по каждому модулю и
примеры — в [`docs/features.html`](docs/features.html).

## CLI

Node-инструментарий без зависимостей, один бинарник, пробрасывает коды выхода,
так что каждая команда работает как CI-гейт. Из клона этого репозитория:

```sh
node bin/hephaestus.js <command> [args]
# те же инструменты подключены как npm-скрипты:
npm run <command> -- [args]
```

> Пока не опубликован в npm. Когда опубликуется — те же команды будут
> запускаться как `npx hephaestus <command>` без клонирования.

| Команда | Что делает |
|---|---|
| `summary <results.json> [--md] [--sla=<ms>]` | Сводка прогона + p50/p90/p95/p99, SLA-гейт |
| `compare <before> <after> [--md]` | Diff двух прогонов — регресс-гейт, exit 1 при регрессии |
| `report <results.json> [out.html]` | Автономный HTML-отчёт |
| `junit <results.json\|-> [out.xml]` | Newman JSON → JUnit XML |
| `migrate <collection.json>` | Классифицирует состояние миграции коллекции |
| `docs <collection.json>` | API-документация из тест-скриптов коллекции |
| `sync-examples <collection.json>` | Снапшоты → Postman Example Responses |
| `openapi <spec>` | OpenAPI / Swagger → коллекция Hephaestus |
| `init` | Интерактивный мастер конфига / окружения |
| `watch -c <collection.json>` | Перезапуск Newman при изменении файла |

`node bin/hephaestus.js --help` перечисляет всё.

## Тесты и целостность

- **Golden-харнесс движка** — настоящий движок запускается под Newman против
  mock-сервера, и его вывод сравнивается побайтово с золотым эталоном:
  **200 проверок в 17 запросах**, обе локали зафиксированы. Он ловит любой
  дрейф в поведении движка, а не только в инструментарии.
- **`npm test`** — **46 тестов** по CLI-скриптам (docs, summary, compare,
  JUnit, migrate, импорт OpenAPI, sync-examples) и проверка маскирования секретов.
- **`npm run build`** — **10 проверок**: бандл движка синхронен с `engine/src`,
  версия из единого источника, `checksums.json` и встроенная коллекция
  актуальны, defaults и коллекция — валидный JSON.
- **eslint** чист по `engine/`, `setup/`, `templates/`.

Нулевые runtime-зависимости. Только для разработки: `esbuild` (запинён),
`newman`, `eslint`.

## Документация

| Документ | Что внутри |
|---|---|
| [быстрый старт](docs/quickstart.html) | Import → defaults → первый запрос, от и до |
| [справочник конфига](docs/config-reference.html) | Каждое поле конфига, типизировано, с дефолтами |
| [рецепты](docs/recipes.md) | 10 частых задач → 10 готовых `override`-блоков |
| [возможности](docs/features.html) | Модуль за модулем с примерами |
| [newman и CI](docs/newman-ci.md) | Настройки GitHub Actions, GitLab CI, Jenkins |
| [просмотр снапшотов](docs/snapshot-viewer.html) | Визуальный браузер для `hephaestus.snapshots` |
| [главная документации](docs/index.html) | Локальный индекс сайта документации |

Полное руководство двуязычно: этот файл (Русский) и
[README.md](README.md) (English).

## Лицензия

[MIT](LICENSE) © 2026 **Igor Bogdanov** · <bogdanov.ig.alex@gmail.com>

Свободно использовать, форкать и строить поверх, в том числе коммерчески.
Сохраняйте атрибуцию.
