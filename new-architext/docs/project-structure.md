# Структура проекта

## Корень репозитория

```
queue-manager-ui/
├── src/                 # исходники
├── public/              # статика + help (Docusaurus build)
├── externalScripts/     # Ucell и др. виджеты
├── ocp-docs/            # пакет сборки help
├── docs/                # эта документация
├── index.html           # entry + softphone scripts
├── vite.config.ts
├── vite.config.proxy.ts
├── Jenkinsfile.new
└── package.json         # name: "ocp"
```

## `src/` — каталоги

| Папка | Роль |
|-------|------|
| `app/` | Bootstrap: routes, providers, db, workers, global styles |
| `pages/` | Страницы (lazy), один модуль ≈ один route |
| `widgets/` | Крупные UI-блоки (Sidebar, DashboardTable, Notification) |
| `features/` | Фичи (User, Queue, Dashboard modals, MainHeader) |
| `entities/` | Сущности (UserForm и т.д.) |
| `shared/` | ui-kit, api-types, db-types |
| `domains/` | Сложная доменная логика (формы очередей, rotator, recording) |
| `hooks/` | Переиспользуемые хуки (useAuth, useDataQuery, useWSWorker) |
| `services/` | fetch-обёртки для REST вне WS |
| `utils/` | Хелперы (logout, notify, formatters) |
| `constants/` | api, settings, phoneRegExp |
| `types/` | Локальные TS-типы |
| `modules/` | `PrivateRoute` |
| `data/` | JSON/мапперы (Policy, CallbackReason) |
| `icons/` | SVG React-иконки |

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| `src/index.tsx` | ReactDOM root |
| `src/app/App.tsx` | Провайдеры + роутер |
| `src/app/db.ts` | Dexie schema (v67) |
| `src/app/routes/router.tsx` | Все маршруты |
| `src/app/routes/paths.tsx` | Константы path |
| `src/app/routes/main-context.tsx` | sid, auth guard, Notification |
| `src/hooks/useWSWorker.ts` | Мост UI ↔ worker |
| `src/app/workers/wsWorker.ts` | WS + запись в IDB |
| `src/pages/index.ts` | Lazy exports страниц |
| `src/constants/api.ts` | WS URL, команды, API prefixes |
| `src/constants/settings.ts` | ENTITY_NAMES |

## Vite aliases (`vite.config.ts`)

| Alias | Путь |
|-------|------|
| `app` | `/src/app` |
| `styles` | `/src/app/styles` |
| `constants` | `/src/constants` |
| `utils` | `/src/utils` |
| `widgets` | `/src/widgets` |

`tsconfig` `baseUrl: "./src"` — импорты без `@/` (например `'hooks/useAuth'`).

## Страницы (основные маршруты)

| Path | Page | permissionKey (меню) |
|------|------|------------------------|
| `desktop` | Desktop | VIEW_OWN_DASHBOARD |
| `queues` | Queues | LIST_QUEUES |
| `users` | Users | LIST_USERS |
| `dashboard` | Dashboard | VIEW_DASHBOARDS |
| `calls` | Calls | VIEW_CALLS |
| `callbacks` | Callbacks | VIEW_CALLBACKS |
| `outgoing-calls/*` | OutgoingCall, ContactLists, … | VIEW_OUTGOING_CALLS |
| `settings` | Settings | VIEW_SETTINGS |
| `skill-groups` | SkillGroups | VIEW_SKILL_GROUPS |
| `roles` | Roles | VIEW_ROLES |
| `accesses` | Accesses | VIEW_ACCESSES |
| `operators-workspace` | OperatorsWorkspace | env flag |
| `chats` | Chats | — |
| `process-control` | ProcessControl | — |
| `screens-records` | ScreensRecords | — |

Полный список — `router.tsx` + `routes.tsx`.

## Генерация кода

`yarn generate` (plop) — Component, Page, Module; шаблоны Redux **устарели**.

## Help center

`public/help/` — статический HTML (собранная документация пользователя). `HelpCenterProvider` + виджет в Layout.

## Shared UI

`src/shared/ui/` — переиспользуемые компоненты: `ReactTable`, `FormFields`, `Loader`, `SoftPhone`, `AudioPlayer`, …

При добавлении таблиц — смотреть `ReactTable` + `useReactTableFilters`, `TableDataProvider` для live WS-таблиц.
