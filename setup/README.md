# setup/

Файлы первоначальной настройки коллекции.

## Файлы

| Файл | Назначение |
|---|---|
| `defaults.json` | Шаблон для `hephaestus.defaults` в collectionVariables |
| `engine-update.js` | Скрипт обновления движка из git → в collectionVariables |
| `snapshot-clear.js` | Очистка `hephaestus.snapshots` (все или по фильтру) |
| `snapshot-view.js` | Просмотр содержимого снапшотов в Console |

## Первый запуск (onboarding)

1. Скопировать содержимое `defaults.json`
2. В Postman → Collection → Variables → добавить переменную `hephaestus.defaults`, вставить JSON
3. Создать метод `🔧 engine-update` в коллекции (GET, любой URL)
4. В Pre-request Script вставить `engine-update.js`
5. Запустить метод — движок скачается и встанет в коллекцию
6. Методы готовы к использованию шаблонов из `templates/`

## Обновление движка

Запустить метод `🔧 engine-update` с нужной версией:
```
collectionVariables["hephaestus.version"] = "3.1.0"  // или оставить пустым для main
```

## Управление снапшотами

| Метод | Скрипт | Что делает |
|---|---|---|
| `📋 snapshot-view` | `snapshot-view.js` | Показывает все снапшоты (ключи + метаданные) |
| `🗑️ snapshot-clear` | `snapshot-clear.js` | Очищает снапшоты |

Фильтры (задаются в collectionVariables):
```
hephaestus.snapshot.viewFilter  = "Login"   // показать только снапшоты "Login"
hephaestus.snapshot.clearFilter = ""        // очистить все
hephaestus.snapshot.clearFilter = "Login"   // удалить только "Login"
```
