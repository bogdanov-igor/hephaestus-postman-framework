# engine/

Исходники движка Hephaestus v3.

Эти файлы **не вставляются в Postman вручную**. Их качает `setup/engine-update.js`
и кладёт в `collectionVariables["hephaestus.v3.pre"]` и `["hephaestus.v3.post"]`.

## Файлы

| Файл | Назначение | collectionVariable |
|---|---|---|
| `pre-request.js` | Pipeline до отправки запроса | `hephaestus.v3.pre` |
| `post-request.js` | Pipeline после получения ответа | `hephaestus.v3.post` |

## Pre-request pipeline

```
configMerge → urlBuilder → auth? → dateUtils → logger.summary
```

## Post-request pipeline

```
normalizeResponse → metrics → extractor → assertions
    → snapshot? → schema? → logger.summary
```

## Модули внутри движка

| Модуль | Что делает |
|---|---|
| `configMerge` | deep merge(defaults, override) → ctx.config |
| `urlBuilder` | валидация и установка baseUrl |
| `auth` | plugin: none / basic / bearer / credentials / custom-header |
| `dateUtils` | устанавливает pm.variables: currentDate, monthsAgoN |
| `normalizeResponse` | JSON → XML fallback → ctx.response |
| `extractor` | ctx.api: get / find / count / save |
| `assertions` | keysToFind / varsToSave / keysToCount |
| `snapshot` | сохранение/сравнение ответов по checkPaths |
| `schema` | валидация JSON Schema / XML |
| `metrics` | статус, время, размер → pm.test |
| `logger` | единый лог с маскированием секретов |
