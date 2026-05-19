# API и интеграции

## Префиксы (`constants/api.ts`)

| Константа | Путь | Назначение |
|-----------|------|------------|
| `WS_API_URL` | `/ocp-api/v1/ws/` | Основной канал данных |
| `OCP_API_PREFIX` | `/ocp-api/v1` | REST OCP (streaming, logs) |
| `FILE_API_PREFIX` | `/file-api/v1` | Файлы, записи, ext apps |
| `MERGE_MEDIA_API_PREFIX` | `/merging_media_service` | Запись экрана, мониторинг |
| `SUPERSET_HOST` | env `REACT_APP_SUPERSET_HOST` | BI-дашборды |

## OpenAPI / типы

- Генерация: `yarn gen:client` → `src/shared/api-types/`
- Источник: `https://dev-qms.service-desk.site/openapi.json`
- Экспортируются **models** и **schemas**, не services (`--exportServices=false`)
- Использование: импорт типов в Dexie-таблицы, формы, валидацию

## Dev-прокси (`vite.config.proxy.ts`)

Только `mode === 'development'`. Переменные `VITE_PROXY_*`:

- `VITE_PROXY_OCP_API` — `/ocp-api/` (+ WS)
- `VITE_PROXY_FILE_API` — `/file-api/`
- `VITE_PROXY_MERGE_MEDIA_API` — merging media
- `VITE_PROXY_CHAT_API`, chat-ws — чаты

`rewrite` убирает префикс перед проксированием на target.

## Env-переменные (префикс `REACT_APP` в Vite)

| Переменная | Назначение |
|------------|------------|
| `REACT_APP_SUPERSET_HOST` | Superset embedded |
| `REACT_APP_OPERATORS_WORKSPACE` | `'on'` — маршрут operators-workspace |
| `REACT_APP_WEBIM_HOST` | Webim iframe cookies |
| `VITE_PROXY_*` | Dev-прокси (см. выше) |

Секреты в CI: Jenkins + Vault (`UI-Front/Front-env`).

## Интеграции

### SoftPhone (WebRTC)

- Скрипт в `index.html`: `/softphone/softphone-1.0.0-beta.js`
- Компонент `shared/ui/SoftPhone`
- Настройки в Dexie: `softphone_settings`, `softphone_type`, `sip_data`
- Логи: `SystemLoggerProvider` / `useSoftPhoneLogs`

### Superset

- `@superset-ui/embedded-sdk` + switchboard
- Токен: `fetch(\`${SUPERSET_HOST}/get-token/\`)` (Dashboard, AnalyticCalls, ViewQueueLoad)

### Webim (чат)

- `REACT_APP_WEBIM_HOST` — iframe для cookies (`MainContext`)
- `WebimChatModal`, маршрут `Chats`
- Отдельный chat API/WS через прокси `/chat-api`, `/chat-ws`

### Внешние приложения оператора

- `externalScripts/` — JS/CSS виджеты (Ucell)
- `integrations`, `dialogue_apps` в Dexie
- `ExternalApplication` page, hyperlinks через `file-api/ext_apps`

### DataChannel

- `shared/ui/DataChannel` — канал данных для интеграций (см. код виджета)

### Rotator (исходящий обзвон)

- Сервисы в `src/services/rotatorServices/` — часть **закомментирована** (миграция на WS PROXY)
- Активный путь: `sendRotatorMessage` через WebSocket

### Screen recording

- `src/services/screenRecording*` → `MERGE_MEDIA_API_PREFIX`
- Домены: `domains/screenRecordingJob`, `screenRecordingFile`

## Сервисный слой

`src/services/` — тонкие обёртки `fetch` для REST вне WS. Не покрывает основной CRUD — он через WS.

## CI/CD

- `Jenkinsfile.new` — product `qm`, backend `qms`, домен `service-desk.site`
- E2E: `HAS_E2E = false` в pipeline
- Playwright в devDependencies, отдельных e2e-тестов в репо может не быть
