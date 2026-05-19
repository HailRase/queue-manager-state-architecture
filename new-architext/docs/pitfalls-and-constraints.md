# Узкие места, риски и ограничения

Документ для ИИ-агентов: что ломается чаще всего и где не делать «очевидных» предположений.

## 1. WebSocket — единая точка отказа

- Без открытого WS (`status === 'Open'`) не работают login, `useDataQuery`, большинство CRUD.
- После **12** реконнектов — `maxAttemptsReconnectReached`; UI должен показывать проблему (проверить обработку).
- Команды отправляются только если worker инициализирован; race при первом рендере — дождаться `Open`.

## 2. IndexedDB и схема Dexie

- Любое изменение таблиц → **обязательно** `this.version(N+1).stores({...})` в `db.ts`.
- Забытый entity в `wsWorker` `default` — данные могут не попасть в UI (если нет special case).
- `abonent` при каждом сообщении делает `clear()` — полная перезагрузка списка.
- Батч 150ms: UI может отставать на доли секунды при burst-обновлениях.

## 3. query_id и useDataQuery

- Каждый вызов генерирует новый `uuidv7`; при remount — повторный запрос.
- `isLoading` снимается только по ack в `query_id` — если бэкенд не ответил, loader зависнет.
- `resetEntity` + `clear()` — деструктивно для таблицы перед загрузкой.

## 4. Права только в UI

- `PrivateRoute` проверяет только `sid`.
- `permissions.includes(...)` — разрозненные строки по кодовой базе; опечатка = тихий баг.
- Дерево прав (`TreeAccesses`) может расходиться с сервером — `comparePermissions`.

## 5. Легаси и документация

| Утверждение | Реальность |
|-------------|------------|
| README: Redux | Нет Redux в runtime |
| README: react-bootstrap | PrimeReact + primeflex |
| README: port 3000 | Vite port **3005** |
| Plop Redux templates | Не подключать к новым фичам |
| `services/rotatorServices/*` | Много закомментированного fetch — использовать WS PROXY |

## 6. TypeScript

- `noImplicitAny: false` — в старом коде много неявного `any`.
- OpenAPI-типы не покрывают все Dexie-таблицы — см. `shared/db-types`, `types/`.
- Циклические импорты: `shared/db-types` тянет типы из `widgets/`, `pages/` — осторожно при рефакторинге.

## 7. Производительность

- `calls_statistics` — фильтр 24ч в worker; закомментирован periodic cleaner — рост таблицы возможен.
- Большие `bulkPut` на `users`, `calls` — нагрузка на main thread при flush из worker.
- Lazy pages: при ошибке import — fallback `NotFound` (`.catch` в `createLazyPage`).

## 8. Внешние скрипты

- SoftPhone загружается глобально — конфликты с HMR, порядок скриптов в `index.html`.
- `externalScripts` копируются в build — пути должны совпадать с prod.

## 9. Мультисервисность API

- OCP (WS) + file-api + merge-media + superset + chat — разные base URL и прокси.
- В prod прокси Vite нет — nginx/ingress должен маршрутизировать те же префиксы.

## 10. Что проверять при изменениях

- [ ] WS entity совпадает с Dexie table name
- [ ] `ENTITY_NAMES` + `COMMAND_NAMES` синхронны с бэкендом
- [ ] Версия Dexie увеличена
- [ ] Permission key добавлен в menu (`routes.tsx`) при новой странице
- [ ] `gen:client` после изменения OpenAPI бэкенда
- [ ] Не полагаться на Redux/axios — их нет в архитектуре

## 11. Глобальные side-effects в App

`CampaignEvent`, `CallEvents`, `DataChannel`, `SoftPhone` — работают вне текущей страницы; изменения могут затронуть весь сеанс оператора/супервизора.

## 12. Auth logout

`logout()` в utils — очищает storage и Dexie; при правках auth-сценариев проверять и `db.auth`, и `localStorage.sid`, и WS disconnect.
