# Queue Manager UI — документация для ИИ-агентов

**Проект:** `ocp` (Queue Manager) — SPA для управления очередями контакт-центра (QMS/OCP).

**Стек:** React 19, TypeScript, Vite 7, React Router 6, Dexie (IndexedDB), WebSocket, PrimeReact, Formik/Yup, SCSS modules.

## Навигация по документам

| Файл | Содержание |
|------|------------|
| [architecture.md](./architecture.md) | Общая архитектура, диаграммы, слои FSD |
| [data-flow.md](./data-flow.md) | WebSocket, worker, IndexedDB, запросы данных |
| [api-and-integrations.md](./api-and-integrations.md) | REST-прокси, внешние API, OpenAPI |
| [auth-and-permissions.md](./auth-and-permissions.md) | Сессия, роли, права, маршруты |
| [project-structure.md](./project-structure.md) | Каталоги `src/`, алиасы, ключевые файлы |
| [development.md](./development.md) | Запуск, сборка, codegen, прокси |
| [pitfalls-and-constraints.md](./pitfalls-and-constraints.md) | Узкие места, легаси, риски |
| [../src/app/state/ARCHITECTURE.ru.md](../src/app/state/ARCHITECTURE.ru.md) | Эталон Zustand + батчинг 100+ msg/s |
| [../src/app/state/MIGRATION.md](../src/app/state/MIGRATION.md) | План подключения `app/state` |

## Краткий контекст (30 секунд)

1. **Нет Redux** — глобальное состояние: IndexedDB (`app/db.ts`) + React Context-провайдеры + Web Worker для WS.
2. **Бэкенд — через WebSocket** — CRUD и query идут командой `{ command, entity, payload }`, не классическим REST из UI.
3. **UI читает данные из Dexie** — `useLiveQuery` подписывается на таблицы; сервер пушит изменения в WS → worker пишет в IndexedDB.
4. **Права** — строковые ключи (`LIST_QUEUES`, `VIEW_CALLS`); мерж ролей пользователя в `usePermissions`.
5. **FSD-подобная структура:** `app` → `pages` → `widgets` → `features` → `entities` → `shared`; плюс `domains` для сложных форм.

## Точка входа

```
index.html → src/index.tsx → PrimeReactProvider → App → провайдеры → RouterProvider
```

## Что устарело в репозитории

- `README.md` упоминает **redux-toolkit** и **react-bootstrap** — в коде не используются.
- `.plop` содержит шаблоны **Redux slice** — легаси генератора.
- `noImplicitAny: false` в `tsconfig.json` — строгая типизация не везде.
