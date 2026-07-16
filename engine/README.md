# engine/

Движок Hephaestus v3.

- **`src/`** — исходники (ES-модули). **Правь только их.** `src/shared/` — общие модули
  (напр. `config-merge.js`), вшиваемые в оба движка из одного источника.
- **`pre-request.js` / `post-request.js`** — СГЕНЕРИРОВАННЫЕ бандлы (esbuild) из `src/`.
  Не редактировать вручную: перегенерируются через `npm run build:emit`, проверяются
  через `npm run build`. Поведение гарантируется `npm run test:engine` (golden-харнесс).
- **`checksums.json`** — SHA-256 бандлов для проверки целостности в `engine-update`.

Эти файлы **не вставляются в Postman вручную**. Шаблонная коллекция уже содержит
вшитый движок; `setup/engine-update.js` качает бандлы из git только для ОБНОВЛЕНИЯ.

## Файлы

| Файл | Назначение | collectionVariable |
|---|---|---|
| `pre-request.js` | Pipeline до отправки запроса | `hephaestus.v3.pre` |
| `post-request.js` | Pipeline после получения ответа | `hephaestus.v3.post` |

## Pre-request pipeline

```
configMerge → envRequired → iterationData → random
    → urlBuilder → auth? → dateUtils → logger.summary
```

## Post-request pipeline

```
configMerge → iterationData → normalizeResponse → retryOnStatus?
    → metrics → extractor → assertions → assertEach → assertShape
    → assertOrder → assertUnique → assertHeaders → snapshot?
    → schema? → plugins? → logger.summary
```

## Модули внутри движка

| Модуль | Что делает |
|---|---|
| `configMerge` | deep merge(defaults, override) → ctx.config |
| `envRequired` | проверка обязательных переменных окружения |
| `iterationData` | загрузка данных итерации → ctx.iteration |
| `random` | генерация случайных данных (randomData) → pm.variables |
| `urlBuilder` | валидация и установка baseUrl |
| `auth` | plugin: none / basic / bearer / headers / variables / oauth2cc |
| `dateUtils` | устанавливает pm.variables: currentDate, monthsAgoN |
| `normalizeResponse` | JSON → XML fallback → ctx.response |
| `retryOnStatus` | повтор запроса при определённых HTTP-статусах |
| `extractor` | ctx.api: get / find / all / count / save |
| `assertions` | keysToFind / varsToSave / keysToCount / maxResponseTime |
| `assertEach` | проверка условия для каждого элемента массива |
| `assertShape` | валидация формы каждого элемента массива |
| `assertOrder` | проверка порядка элементов по полю |
| `assertUnique` | проверка уникальности значений в массиве |
| `assertHeaders` | валидация заголовков ответа |
| `snapshot` | сохранение/сравнение ответов по checkPaths |
| `schema` | валидация JSON Schema / XML |
| `metrics` | статус, время, размер → pm.test |
| `plugins` | кастомные модули из collectionVariables |
| `logger` | единый лог с маскированием секретов |
