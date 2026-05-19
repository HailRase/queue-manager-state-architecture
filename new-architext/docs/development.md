# Разработка

## Требования

- Node.js (совместим с Vite 7)
- **Yarn 4** (`packageManager: yarn@4.11.0`)

## Команды

| Команда | Действие |
|---------|----------|
| `yarn start` | Dev-server **:3005** (не 3000 как в README) |
| `yarn build` | Production build → `build/` |
| `yarn build:prod` | `tsc && vite build` |
| `yarn lint` | ESLint + Stylelint |
| `yarn gen:client` | OpenAPI → `src/shared/api-types` |
| `yarn generate` | Plop scaffolding |

## Первый запуск

1. `yarn install`
2. Создать `.env` / `.env.development` с `VITE_PROXY_OCP_API`, `VITE_PROXY_FILE_API`, … (значения — у команды / Vault)
3. `yarn start` → http://localhost:3005

Без прокси WS не подключится — Login покажет offline (`status !== 'Open'`).

## Env (Vite)

- Префикс env в конфиге: `envPrefix: 'REACT_APP'` (исторически CRA)
- Прокси читает `VITE_PROXY_*` через `loadEnv(mode, process.cwd(), 'VITE_PROXY')`

## Стили

- SCSS modules (`*.module.scss`), camelCase locals
- PrimeReact theme: Lara Light Indigo
- BEM-подобные классы в legacy-компонентах
- Глобальные: `app/styles/app.scss`, `variables.scss`, `mixins.scss`

## Формы

- **Formik** + **Yup** (`validation.ts` рядом со страницами)
- Поля: `shared/ui/FormFields`

## Тестирование

- `@playwright/test` в devDependencies
- Jenkins: `HAS_E2E = false`
- Istanbul coverage plugin в Vite (`vite-plugin-istanbul`) — `requireEnv: false`

## Сборка help

Пакет `@ocp/docs-build` из `ocp-docs/` — отдельный pipeline документации.

## Добавление страницы

1. Папка `src/pages/MyPage/` + `index.ts` export
2. `paths.tsx` — `PATHS.MY_PAGE`
3. `router.tsx` — элемент в head/tail list
4. `routes.tsx` — пункт меню + `permissionKey`
5. `pages/index.ts` — `createLazyPage('MyPage')`

## Добавление сущности WS/IDB

1. Тип в OpenAPI или `shared/db-types`
2. Таблица в `QmsDb` + `.stores()` — **увеличить version**
3. Ключ в `ENTITY_NAMES`
4. Обработка в `wsWorker` если нужен special case
5. UI: `useDataQuery` + `useLiveQuery`

## Code style

- Husky + lint-staged: prettier + eslint на `*.{ts,tsx}`
- `noImplicitAny: false` — новый код лучше типизировать явно
- `eslint-disable max-lines` на крупных файлах (`db.ts`, `wsWorker.ts`)
