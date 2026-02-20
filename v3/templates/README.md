# templates/

Шаблоны скриптов для вставки в методы Postman.

## Как использовать

1. Открыть метод в Postman
2. Вкладка **Pre-request Script** → вставить содержимое `method.pre-request.js`
3. Вкладка **Tests (Post-request)** → вставить содержимое `method.post-request.js`
4. Заполнить только секцию `const override = { ... }` — остальное трогать не нужно

## Файлы

| Файл | Куда вставлять |
|---|---|
| `method.pre-request.js` | Pre-request Script метода |
| `method.post-request.js` | Tests (Post-request) метода |

## Что писать в override

**Pre-request** — только если отличается от defaults:
- `baseUrl` — если метод идёт на другой сервер
- `auth` — тип и данные авторизации
- `dateFormat` — если нужен другой формат дат

**Post-request** — только то, что нужно этому методу:
- `contentType` — ожидаемый формат ответа
- `keysToFind` — что проверить в ответе
- `varsToSave` — что сохранить в переменные
- `keysToCount` — сколько элементов ожидается
- `snapshot` — включить/настроить сравнение снапшотов
