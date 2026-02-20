# collection/

Готовая к импорту Postman-коллекция на базе Hephaestus v3.

## Файлы

| Файл | Назначение |
|---|---|
| `hephaestus-template.postman_collection.json` | Шаблонная коллекция для импорта в Postman |

## Как импортировать

1. Postman → **Import** → выбрать `hephaestus-template.postman_collection.json`
2. Привязать environment (см. скриншоты в проекте)
3. Открыть `🛠️ Hephaestus System → 🔧 engine-update` → **Send**
4. Готово — движок загружен, методы работают

## Структура коллекции

```
Hephaestus v3 :: Template
├── 🛠️ Hephaestus System        ← системные методы (не трогать)
│   ├── 🔧 engine-update         ← загрузка движка из git
│   ├── 📋 snapshot-view         ← просмотр снапшотов
│   └── 🗑️ snapshot-clear        ← очистка снапшотов
└── 📦 Collection                ← рабочие методы
    └── 📁 Авторизация           ← пример папки
        ├── GET :: Получение токена        ← пример метода (auth)
        └── GET :: Получение данных        ← пример метода (data + snapshot)
```

## Переменные коллекции

| Переменная | Устанавливается | Описание |
|---|---|---|
| `hephaestus.collectionName` | Вручную | Имя коллекции для ключей snapshot |
| `hephaestus.defaults` | Вручную | JSON конфиг по умолчанию |
| `hephaestus.version` | Вручную | Версия движка (`main` или `v3.x.x`) |
| `hephaestus.v3.pre` | engine-update | Код pre-request движка |
| `hephaestus.v3.post` | engine-update | Код post-request движка |
| `hephaestus.snapshots` | Движок | Хранилище snapshot |
| `hephaestus.engineRef` | engine-update | Текущая версия движка |
| `prod.token` | Метод токена | Сессионный токен |
