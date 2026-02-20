# Hephaestus v3 — Обзор архитектуры

Модульный, безопасный Postman-фреймворк без зависимости от `eval(environment)`.

## Как это работает

```
1. Один раз:  setup/engine-update (запрос в Postman) → качает движок из git
                                                      → кладёт в collectionVariables

2. На старте: collectionVariables["hephaestus.defaults"] → общий конфиг коллекции

3. В методе:  const override = { только твои поля }     → pre/post-request
              eval(pm.collectionVariables.get("hephaestus.v3.pre / .post"))
              ↑ движок сам мержит defaults + override и запускает pipeline
```

## Директории

| Папка | Назначение |
|---|---|
| `engine/` | Исходники движка — хранятся в git, загружаются в коллекцию |
| `templates/` | Шаблоны для вставки в методы Postman |
| `setup/` | Дефолты, скрипт обновления движка |

## Ключевые переменные коллекции

| Переменная | Содержимое |
|---|---|
| `hephaestus.defaults` | JSON — дефолтный конфиг всей коллекции |
| `hephaestus.v3.pre` | JS-код pre-request движка |
| `hephaestus.v3.post` | JS-код post-request движка |
| `hephaestus.engineRef` | Версия движка (`main` / `v3.1.0`) |
| `hephaestus.snap::*` | Snapshot-ы ответов |

## Итерации разработки

- [ ] **Итерация 1** — orchestrator, ctx, normalizeResponse, logger
- [ ] **Итерация 2** — extractor API (get/find/count/save)
- [ ] **Итерация 3** — snapshot + compare + autoSaveMissing
- [ ] **Итерация 4** — auth plugin + secret masking
