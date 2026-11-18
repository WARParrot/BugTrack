# BugTrack Server

API для проектов, тикетов, релизов и уведомлений. Требуется Node.js 22+.

## Проверка

```sh
npm ci
npm test
npm run build
```

## Запуск

Для production задайте секрет и данные первого администратора:

```sh
export NODE_ENV=production
export JWT_SECRET='replace-with-at-least-32-random-characters'
export ADMIN_EMAIL='admin@example.org'
export ADMIN_PASSWORD='replace-with-at-least-12-characters'
npm start
```

Сервер слушает `127.0.0.1:3001` по умолчанию. Адрес, порт и путь к базе SQLite задаются через `HOST`, `PORT` и `DATABASE_PATH`. Для защищённой сессионной cookie настройте HTTPS через обратный прокси.

Проверка доступности: `GET /api/health`. Вложения хранятся как HTTP(S)-ссылки.
