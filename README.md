Ты — Senior JS/TS архитектор и security-aware инженер.
Твоя задача — превратить текущий Postman-based framework (Hephaestus v2) в безопасный, модульный, управляемый v3.

У тебя есть 4 файла для анализа:

- /mnt/data/pre-request-script
- /mnt/data/pre-reuqest-script-in-method
- /mnt/data/post-request-script
- /mnt/data/post-request-script-in-method

=== ЦЕЛЬ v3 ===

Это не просто рефактор.
Это превращение в модульный framework с orchestrator + ctx + модулями.

Framework должен:
- быть универсальным
- не зависеть от zone/methodType/oapi/psapi
- не содержать бизнес-логики пользователей
- поддерживать defaults + override
- поддерживать snapshot + schema + compare
- быть безопасным
- работать в Postman sandbox (без Node import)
- НЕ исполнять код из environment
- минимизировать или убрать eval

=== КЛЮЧЕВЫЕ ПРАВИЛА ===

1) Base URL:
   - есть один baseUrl в collectionVariables
   - если override содержит свой baseUrl → использовать его
   - никаких zone/methodType

2) Auth:
   - auth — это plugin-модуль
   - отключён по умолчанию
   - не должен быть жёстко встроен в core

3) Конфигурация:
   - defaults хранятся в collectionVariables как JSON (hephaestus.defaults)
   - request-level override хранится в environment как hephaestus.override
   - orchestrator делает deep merge(defaults, override)
   - request-level override должен содержать ТОЛЬКО уникальные поля

4) Snapshot:
   - primary storage: collectionVariables
   - key формируется по шаблону:
     {{collection}}::{{folder}}::{{request}}::{{status}}::{{type}}
   - если snapshot отсутствует → autoSaveMissing = true → сохранить baseline
   - поддержка ignorePaths
   - режим сравнения strict / non-strict
   - save response UI может использоваться вручную, но framework не должен от него зависеть

5) Логи:
   - единый logger
   - маскирование секретов
   - компактные test results
   - preview ответа с лимитом

6) Extract API:
   Нужен удобный API внутри ctx:
   - ctx.api.get(path)
   - ctx.api.find(path, predicate)
   - ctx.api.count(path)
   - ctx.api.save(path, target)

7) Структура:
   Скрипт должен быть разделён логически на модули.
   Нужен orchestrator (pipeline).

=== ЧТО НУЖНО СДЕЛАТЬ ===

ШАГ A — АНАЛИЗ

1) Проанализируй текущие 4 файла.
2) Определи:
   - где eval используется
   - где риски безопасности
   - где утечки токенов возможны
   - какие части хорошо спроектированы (extractor, deep traversal)
3) Кратко опиши архитектуру v2.

ШАГ B — ДИЗАЙН v3

Предложи структуру:

- orchestrator
- ctx (строгая структура)
- modules:
    - normalizeResponse
    - logger
    - extractor
    - assertions
    - snapshot
    - schema
    - metrics
    - auth (plugin)
    - configMerge

Опиши contract каждого модуля:
- вход
- выход
- что мутирует в ctx

ШАГ C — ЗАДАЙ ВАЖНЫЕ ВОПРОСЫ (не больше 10)

Только архитектурно значимые вопросы:
- snapshot compare mode?
- хранить ли schema отдельно?
- какие responseTypes обязательны?
- нужен ли XML schema?
- нужны ли профили (smoke/regression/contract)?
- нужна ли поддержка Newman CI?
Без воды.

ШАГ D — НАЧАТЬ ИТЕРАЦИИ

Итерация 1:
- создать orchestrator
- создать ctx
- вынести normalizeResponse
- вынести logger
- показать минимальный рабочий пример

Итерация 2:
- вынести extractor API
- заменить старую логику deep get

Итерация 3:
- snapshot + compare + autoSaveMissing

Итерация 4:
- auth plugin
- presets (profiles)
- masking secrets

Каждую итерацию оформляй как мини-PR:
- список новых модулей
- код
- пример override для метода
- объяснение как подключить

=== ОГРАНИЧЕНИЯ POSTMAN ===

- нет import
- нет require
- код должен работать в sandbox
- нельзя исполнять произвольный код из environment
- нельзя использовать response как код
- хранение возможно только в collectionVariables или environment

=== ЦЕЛЬ ===

После 4 итераций должен получиться:

- модульный framework
- управляемый defaults + override
- snapshot-driven regression engine
- безопасный
- простой для подключения к любой коллекции

Начни с ШАГА A.

---

## Прогресс v3

| Шаг | Статус |
|---|---|
| Шаг A — Анализ v2 | ✅ Выполнен |
| Шаг B — Дизайн v3 | ✅ Выполнен |
| Шаг C — Вопросы + ответы | ✅ Выполнен |
| Итерация 1 — orchestrator, ctx, normalizeResponse, logger | ✅ Готово |
| Итерация 2 — extractor API | ✅ Готово |
| Итерация 3 — snapshot + compare | ✅ Готово |
| Итерация 4 — auth plugin + masking | ✅ Готово |

## Структура репозитория

```
/
├── README.md                         — прогресс и структура репозитория
├── CHANGELOG.md                      — история изменений
└── v3/
    ├── README.md                     — архитектура v3
    ├── engine/
    │   ├── pre-request.js            — движок pre-request (→ hephaestus.v3.pre)
    │   └── post-request.js           — движок post-request (→ hephaestus.v3.post)
    ├── templates/
    │   ├── method.pre-request.js     — шаблон для вставки в метод (pre)
    │   └── method.post-request.js    — шаблон для вставки в метод (post)
    ├── setup/
    │   ├── defaults.json             — шаблон hephaestus.defaults
    │   ├── engine-update.js          — скрипт обновления движка из git
    │   ├── snapshot-clear.js         — очистка снапшотов (все / по фильтру)
    │   └── snapshot-view.js          — просмотр снапшотов в Console
    └── collection/
        ├── README.md                 — инструкция по импорту
        └── hephaestus-template.postman_collection.json  ← ИМПОРТИРОВАТЬ В POSTMAN
```