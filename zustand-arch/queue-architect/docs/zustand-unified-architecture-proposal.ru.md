# Единое предложение: миграция на Zustand (worker + Dexie + pipeline)

> Документ фиксирует архитектурное предложение по миграции state-слоя на Zustand с сохранением Dexie (IndexedDB) и WebSocket worker.
> Сравнивается с [`zustand-migration-proposal.md`](./zustand-migration-proposal.md).
> Исходные файлы текущей реализации: `worker/wsWorker.ts`, `db/db.ts`, `worker/useWSWorker.ts`.

---

## 1. Текущее состояние (кратко)

### `wsWorker.ts`

- Держит WebSocket, парсит сообщения.
- Агрегирует в `cache` по `entity → primaryKey → payload`.
- Раз в **150 ms** делает `db[entity].bulkPut(items)` напрямую в IndexedDB.
- Часть сообщений (`NOTIFY`, `SOS_NOTIFY`, `CALLS_STATISTICS`, `TABLE_DATA_MESSAGE`, `QUERY_ID_ACK`, `PROXY_REST_API`, `USERS_STATUSES_LOG`) пробрасывает в main thread **по одному** через `postMessage`.
- Содержит перегруженный `switch (msg.entity)` с бизнес-логикой (нормализация, фильтры, `clear` таблиц).

### `db.ts`

- Dexie-синглтон `QmsDb` с ~60 таблицами (entity).
- Persistence-layer для большинства сущностей.

### `useWSWorker.ts`

- Мост между worker и React.
- На каждое сообщение вызывает `dispatch(...)` соответствующих провайдеров.
- Держит `Map<id, PendingRequest>` для proxy REST.

### Проблемы

- Ветка `switch (msg.entity)` в воркере перегружена бизнес-логикой.
- `postMessage` на каждое не-DB сообщение → много мелких сообщений в main thread.
- Ответственности размазаны: воркер и пишет в БД, и фильтрует, и нормализует, и роутит.
- Хук завязан на конкретные контексты (3 разных `dispatch`).

---

## 2. Целевая архитектура

### Принципы

1. **Воркер** делает две вещи:
   - пишет в IndexedDB (как сейчас);
   - накапливает **все** WS-сообщения и раз в 150 ms шлёт **батч** в main thread.
2. **Main thread** — pipeline (конвейер): берёт батч, группирует, разводит по Zustand-сторам.
3. Каждый entity = **отдельный Zustand-store**:
   - 80% — фабрика `createEntityStore<T>()` с базовыми экшенами: `put | add | bulkPut | bulkAdd | delete` (+ `clear`, `setAll`);
   - 20% — кастомные сторы с дополнительной логикой.
4. Отдельный **`wsStatusStore`** — статус соединения.
5. **`useWSWorker`** упрощается: создаёт worker, шлёт команды, держит `pendingRequests` для proxy REST (или выносит в `proxyRestBridge`).

### Поток данных

```text
WS msg
  └─► worker:
        ├─ buffer.outbox.push(msg)        // в main thread
        └─ cache.dbBuffer[entity][pk]=p   // в IndexedDB

каждые 150 ms (worker):
  ├─ postMessage({ type:'BATCH', data: outbox })  outbox=[]
  └─ db[entity].bulkPut(items)                    dbBuffer={}

main thread:
  pipeline(batch) → группировка → entityStores[entity].apply(action, payload)
                                 → wsStatusStore (для системных)
                                 → topic-стора (notifications, callsStats и т.п.)
```

### Структура файлов

```text
/db/db.ts                          # без изменений
/worker/
  wsWorker.ts                      # упрощённый: буфер + батч + db.bulkPut
  useWSWorker.ts                   # упрощённый: мост worker↔pipeline
  types.ts                         # WebSocketMessage, BatchMessage, ...
/stores/
  ws/
    wsStatusStore.ts               # статус соединения
  entities/
    createEntityStore.ts           # фабрика типового стора
    registry.ts                    # карта entity → store
    custom/
      usersStore.ts                # нормализация статусов
      notificationStore.ts         # + dispatchNotify
      notificationSosStore.ts      # + dispatchSosNotify
      callsStatisticsStore.ts      # + фильтр по 24ч
      organizationStructureStore.ts# + clear notification при apply
      abonentStore.ts              # + clear при bulkPut
      companyRuntimeStore.ts       # + custom delete by company_id
  pipeline/
    messagePipeline.ts             # обработка батча
    entityHandlers.ts              # карта entity → кастомный обработчик
    systemHandlers.ts              # OPEN/CLOSE/MAX_RECONNECTS_REACHED
    proxyRestBridge.ts             # PROXY_REST_API → pendingRequests
  index.ts
```

### Ключевые типы сообщений воркера

```typescript
export type WebSocketActions = 'put' | 'add' | 'bulkPut' | 'bulkAdd' | 'delete';

export interface EntityMessage {
  kind: 'ENTITY';
  entity: EntityName;
  action: WebSocketActions;
  payload: ReceivedWSPayload | ReceivedWSPaginatedPayload;
}

export interface SystemMessage {
  kind: 'SYSTEM';
  type: 'OPEN' | 'CLOSE' | 'ERROR' | 'MAX_RECONNECTS_REACHED';
  data?: unknown;
}

export interface ProxyRestMessage {
  kind: 'PROXY_REST_API';
  data: { id: string; status: number; body: unknown; headers: Record<string, string>; path: string };
}

export type WorkerOutMessage = EntityMessage | SystemMessage | ProxyRestMessage;

export interface BatchMessage {
  type: 'BATCH';
  data: ReadonlyArray<WorkerOutMessage>;
}
```

### Воркер — тонкий, без бизнес-логики

Воркер **не знает** про `notification_sos`, `users.normalizeUserStatus`, `calls_statistics 24h filter`, `organization_structure clear` — это переезжает в **pipeline / custom-сторы** в main thread.

Исключение (минимальная прослойка в воркере): `db.notification.clear()` / `db.abonent.clear()` перед буферизацией — 5 строк, не загромождает.

### Куда переезжает «особая» логика из текущего воркера

| Сейчас в `wsWorker.ts` | Куда переезжает |
|---|---|
| `rotator → PROXY_REST_API` | `proxyRestBridge` (через `kind: 'PROXY_REST_API'`) |
| `notification_sos → SOS_NOTIFY` + cache | `notificationSosStore.bulkPut/put` + side effect `dispatchSosNotify` внутри стора |
| `calls_statistics 24h filter` | `callsStatisticsStore.bulkPut` (фильтрует на вход) |
| `users_statuses_log → USERS_STATUSES_LOG` | отдельный topic-стор (`usersStatusesLogStore`) |
| `notification → NOTIFY` + cache | `notificationStore.put/bulkPut` + `dispatchNotify` как side effect |
| `query_id → QUERY_ID_ACK` + `db.query_id.put` | обычный entity (DB пишется в воркере) |
| `organization_structure: db.notification.clear() + normalizePayload` | `organizationStructureStore`: `useNotificationStore.getState().clear()` + `normalizePayload(...)` перед `setAll` |
| `abonent: db.abonent.clear() + cache` | `abonentStore.bulkPut` с предварительным `clear()` |
| `company_runtime delete by company_id` | `companyRuntimeStore.delete({ company_id })` |
| `calls`, `operator_status_history → TABLE_DATA_MESSAGE` | topic-стор `tableDataStore` (заменит `TableDataProvider`) |
| `users: normalizeUserStatus` для writeAction | `usersStore` |

---

## 3. Сравнение с `zustand-migration-proposal.md`

### 3.1. Что в документе **сильнее** — стоит взять

#### `version`-счётчик в hot-сторах

В базовом `createEntityStore` хранение `byId + ids[]` с пересборкой `ids` на каждый `bulkPut` — O(n). Лучше: **только** `Map`/`Set` + `version: number`, массив строится в потребителе через `useMemo([version])`.

#### `Map` + `immer` вместо `Record` + spread

`byId = { ...s.byId, [id]: item }` копирует весь объект на каждый батч. Для `calls_statistics` (десятки тысяч записей, 100+ msg/sec) критично использовать `Map` с мутацией внутри `immer`.

#### Индексы `byQueue: Map<queueId, Set<id>>`

Инкрементальное обновление при `upsertBatch`. Потребитель: `useStore(s => s.byQueue.get(queueId), shallow)` → O(1) выборка.

#### `subscribeWithSelector` middleware

Подписки **из** сторов наружу (тостер слушает `queue`, Dexie-bridge слушает изменения hot-стора). Без middleware все потребители тянут весь стейт.

#### `notificationsStore` вместо `window.CustomEvent`

`dispatchNotify`/`dispatchSosNotify` → `useNotificationsStore.getState().push(...)`. Видно в DevTools, тестируется, нет «висящих» listener'ов.

#### `persist` middleware для UI-настроек

`sid`, `tableConfig:*`, `quickFilters:*`, `version` → `appSettingsStore` с `persist` + `partialize`.

#### План миграции «по доменам», а не «по entity»

Сначала `wsStore`, потом **сразу hot-path** (`calls_statistics`, `users_statuses_log`) — главный перформанс-выигрыш сразу.

#### Feature-flag `VITE_USE_ZUSTAND` + старый Context как тонкая обёртка

Держать оба слоя параллельно и переключать в проде.

#### RAF-флаш для UI-критичных подписок

Подписка не чаще одного кадра (тостер, индикаторы).

### 3.2. Что в документе **расходится с требованиями** — осторожно

#### Документ предлагает выпилить hot-таблицы из Dexie

> «Hot-сущности не пишутся в Dexie — обходится двойное хранение.»

**Требование:** логика записи в базу остаётся. **Решение — гибрид:** оставить запись в Dexie (flush 150 ms из воркера), но в main thread держать те же данные в Zustand-сторе с индексами/`version`. Двойное хранение — осознанная цена надёжности (Dexie как fallback при перезагрузке).

#### Документ описывает сторы только под конкретные домены

Нет 60+ entity. **Решение:** `createEntityStore` + `registry` для 80% cold-entity; hot-сущности — «прокачанные» сторы из документа (`Map`/`Set`/`version`/индексы).

#### В документе нет тонкого универсального воркера

Подразумевается текущий воркер со `switch (msg.entity)`. **Оставить:** вынести роутинг в pipeline, воркер делает только буфер + DB-flush + батч в main.

#### В документе нет универсального `pipeline`

Три хардкод-буфера в `wsBridge`. **Взять из предложения:** универсальный диспетчер по карте `entity → store`.

#### `pending` внутри `wsStore`

Если Map не в подписке — не часть стора. **Чище:** отдельный модуль `proxyRestBridge`.

---

## 4. Итоговая объединённая архитектура

1. **Тонкий воркер + универсальный pipeline + registry** — остаются.
2. **`createEntityStore` фабрика** — для 80% cold-entity, переписать на `Map` + `immer` + опциональный `version`.
3. **Hot-сторы** (`callsStatisticsStore`, `usersStatusesLogStore`) — **не через фабрику**: `Map<id, T>` + `byQueue/byUser: Map<key, Set<id>>` + `version` + `upsertBatch`.
4. **Запись в IndexedDB остаётся в воркере** для **всех** entity, включая hot. Двойное хранение допускаем.
5. **`notificationsStore`** заменяет `window.CustomEvent`. `dispatchNotify`/`dispatchSosNotify` → обёртки на время миграции.
6. **`subscribeWithSelector` middleware** — на всех сторах сразу.
7. **`persist` middleware** — отдельный `appSettingsStore` под `sid`, `tableConfig:*`, `quickFilters:*`.
8. **План миграции — гибрид** (см. §5).
9. **Feature-flag** `VITE_USE_ZUSTAND` + старые контексты как тонкие адаптеры.
10. **Чистка:** `createEntityReducer.ts`, `dispatchNotify`, `wsEventHandlers`.

### Hot-сторы (эталонная структура из proposal)

```typescript
interface CallsStatisticsState {
  byId: Map<string, CallsStatistics>;
  byQueue: Map<number, Set<string>>;
  version: number;
  upsertBatch: (items: CallsStatistics[]) => void;
  remove: (id: string) => void;
  clear: () => void;
}
```

Селекторы:

- `useCallsStatisticsStore(s => s.version)` — для пересчёта мемоизированных массивов.
- `useCallsStatisticsStore(s => s.byQueue.get(queueId), shallow)` — список id по очереди.
- `useCallsStatisticsStore(s => s.byId.get(id))` — карточка звонка.

### `tableDataStore` (из proposal)

```typescript
type EntityKey = 'calls' | 'operator_status_history' | 'company' | 'strategy_call' | 'selection' | 'abonents_lists';

interface EntitySlice<T> {
  items: T[];
  page: number;
  pages: number;
  size: number;
  total: number;
  isLoading: boolean;
  updatedAt: number;
}

interface TableDataState {
  slices: Record<EntityKey, EntitySlice<any>>;
  applyMessage: (msg: TableWSMessage) => void;
  setLoading: (entity: EntityKey) => void;
}
```

### `notificationsStore` (из proposal)

```typescript
interface NotificationsState {
  queue: Notification[];
  sos: SosNotification[];
  push: (n: Notification) => void;
  pushSos: (n: SosNotification) => void;
  dismiss: (id: string) => void;
}
```

### `wsStore` / `wsStatusStore`

```typescript
interface WsState {
  status: 'Init' | 'Open' | 'Closed' | 'Error';
  maxAttemptsReconnectReached: boolean;
  connect: () => void;
  disconnect: () => void;
  command: (cmd: CommandName, entity: EntityName, payload: Payload) => void;
  sendRestApiMessage: (...) => Promise<unknown>;
  sendRotatorMessage: (...) => Promise<unknown>;
}
```

`pending` для proxy REST — в `proxyRestBridge`, не в реактивной части стора.

---

## 5. План поэтапной миграции

### Этап 0. Подготовка

- Добавить Zustand в `package.json`.
- Создать `stores/` и `stores/pipeline/`.
- Вынести типы `EntityName` / `WebSocketActions` в общий доступ.

### Этап 1. `wsStatusStore` (низкий риск)

- Перенести логику `useWSWorker` в `wsBridge` + `wsStatusStore`.
- `WebSocketProvider` — тонкая обёртка над селекторами.
- Feature-flag `VITE_USE_ZUSTAND`.

### Этап 2. Hot-path (главный выигрыш)

- `callsStatisticsStore`, `usersStatusesLogStore` с `Map` + индексами + `version` + `upsertBatch`.
- Батчинг в pipeline / wsBridge (100–150 ms).
- Провайдеры — тонкие обёртки, `data` из стора по `version`.
- Запись в Dexie из воркера **сохраняется**.

### Этап 3. `tableDataStore`

- Slice per entity, `applyMessage` в pipeline.
- `useTableDataContext()` → читает из стора.

### Этап 4. `notificationsStore`

- `dispatchNotify` → `useNotificationsStore.getState().push(...)`.
- Удалить `window` CustomEvent после миграции тостера.

### Этап 5. Cold-entity через фабрику

- `createEntityStore` + `registry` для 80% entity.
- Тонкий воркер: убрать `switch (msg.entity)`, батч всех сообщений.
- Универсальный `messagePipeline`.

### Этап 6. Dexie-bridge для derived-сторов

- `currentUserStore`, `permissionsStore`, `userSettingsStore`.
- Bridge через `db.<table>.hook(...)` или `useLiveQuery` в `initDexieBridge()`.

### Этап 7. UI-сторы и persist

- `helpCenterStore`, `systemLoggerStore`, `avatarStore`.
- `appSettingsStore` с `persist`.

### Этап 8. Чистка

- Удалить `createEntityReducer.ts`, `dispatchNotify`/`dispatchSosNotify`, `wsEventHandlers`.
- Убрать 8 вложенных Provider'ов из `App.tsx`.
- Удалить feature-flag после 2–3 спринтов в проде.

---

## 6. Производительность (100+ msg/sec)

- **Батчинг 100–150 ms** в worker + pipeline — основной выигрыш (CPU/ререндеры ↓ в ~10×).
- **`shallow`** для селекторов, возвращающих массивы/объекты.
- **Индексы** (`byQueue`, `byUser`) — инкрементальное обновление, не пересчёт на каждом сообщении.
- **`version`-счётчик** — `useMemo(() => Array.from(byId.values()), [version])`.
- **`subscribeWithSelector` + RAF** для UI-критичных подписок.
- **Селекторы возвращают примитивы** где возможно (`s.byId.size`).
- **Web Worker остаётся** — парсинг JSON и first-pass нормализация вне main thread.

### Риски

| Риск | Митигация |
|---|---|
| Dexie-bridge вызывает каскад `setState` | батчинг и dedupe по `version` |
| Map/Set и иммутабельность Zustand | `immer` middleware |
| Параллельность с текущим кодом | feature-flag + Context-адаптеры |
| Двойное хранение hot-данных | осознанная цена; Dexie = fallback при reload |

---

## 7. Связанные документы

- [`zustand-migration-proposal.md`](./zustand-migration-proposal.md) — исходный proposal (hot-path, батчинг, доменные сторы).
- [`architecture.md`](./architecture.md) — анализ текущих потоков данных.
- [`../../docs/mapping.md`](../../docs/mapping.md) — маппинг старых провайдеров на новые сторы.
- [`../../docs/migration-checklist.md`](../../docs/migration-checklist.md) — чеклист миграции.
- [`../../../docs/state-architecture.md`](../../../docs/state-architecture.md) — описание текущей архитектуры (IndexedDB + worker + Context).
