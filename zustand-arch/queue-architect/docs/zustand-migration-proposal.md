# Миграция state-слоя на Zustand

> Цель: устранить ререндеры всего поддерева на каждое WS-сообщение, унифицировать sub'ы, оставить Dexie как persistence-layer. Профиль: 100+ msg/sec.

---

## 1. Почему Zustand

| Свойство | Эффект для проекта |
|---|---|
| Подписка на срез через селектор + опциональный `equalityFn` (`shallow`) | Компонент ререндерится только если **его** срез действительно изменился; решает основную проблему `CallsStatisticsProvider`. |
| Стор живёт вне React-дерева | Нет 8 вложенных провайдеров, нет каскадных ререндеров. WS-воркер пишет напрямую через `store.setState`. |
| `subscribeWithSelector` middleware | Возможность подписываться вне React (например, из bridge в `useWSWorker`) и реагировать только на нужные изменения. |
| `immer` middleware (опционально) | Мутабельный синтаксис, без `new Map(state)` на каждое сообщение. |
| `persist` middleware | Заменяет ручной `localStorage` (sid, table-config, version). |
| Минимум бойлерплейта | Один `create<T>()(set => …)` вместо `createContext + useReducer + useMemo + Provider + custom hook`. |
| `store.getState()` / `store.setState()` без React | Доступ из утилит, воркеров, тестов; больше нет необходимости в `dispatchNotify` через `window.CustomEvent`. |

---

## 2. Доменная структура сторов

Каждый сторий — отдельный файл `src/app/stores/<name>Store.ts`. Сторонним React-кодом потребляется только через селекторы (`useFooStore(s => s.bar)`).

### 2.1. `wsStore` — транспорт

```ts
interface WsState {
  status: 'Init' | 'Open' | 'Closed';
  maxAttemptsReconnectReached: boolean;
  pending: Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>;
  connect: () => void;
  disconnect: () => void;
  command: (cmd: CommandName, entity: EntityName, payload: Payload) => void;
  sendRestApiMessage: (cmd: CommandName, entity: EntityName, msg: Omit<ProxyRestApiMessage, 'id'>) => Promise<unknown>;
  sendRotatorMessage: (msg: Omit<ProxyRestApiMessage, 'id'>) => Promise<unknown>;
}
```

- Воркер регистрируется один раз в `initWsBridge()` (модуль, не хук) и сетит `status` через `useWsStore.setState`.
- `pending` — обычный `Map`, не часть подписки (никто не реагирует на изменение Map'а), храним как поле.
- Заменяет `WebSocketProvider` + `useWSWorker` целиком.

### 2.2. `callsStatisticsStore` — hot-path 100+ msg/sec

```ts
interface CallsStatisticsState {
  byId: Map<string, CallsStatistics>;
  byQueue: Map<number, Set<string>>;
  version: number;
  upsertBatch: (items: CallsStatistics[]) => void;
  remove: (id: string) => void;
  clear: () => void;
}
```

- Храним **только Map'ы и индексы**. `Array.from` делается на стороне потребителя через `useMemo`, привязанный к `version`.
- Запись идёт **через WS-middleware с батчингом** (см. §3): входящие сообщения копятся 100 мс, потом одним `setState` обновляются `byId`/`byQueue` и инкрементируется `version`.
- Селекторы:
  - `useCallsStatisticsStore(s => s.version)` — для пересчёта мемоизированных массивов.
  - `useCallsStatisticsStore(s => s.byQueue.get(queueId), shallow)` — список id по очереди.
  - `useCallsStatisticsStore(s => s.byId.get(id))` — карточка звонка.

### 2.3. `usersStatusesLogStore` — hot-path

Симметричен `callsStatisticsStore`, индекс `byUser: Map<userId, Set<eventId>>`.

### 2.4. `tableDataStore` — серверные таблицы

```ts
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

- Хук-обёртки: `useTableSlice('calls')` → `useTableDataStore(s => s.slices.calls, shallow)`.
- `applyMessage` вызывается из WS-middleware, не из React.

### 2.5. `notificationsStore` — заменяет `window` CustomEvent

```ts
interface NotificationsState {
  queue: Notification[];
  sos: SosNotification[];
  push: (n: Notification) => void;
  pushSos: (n: SosNotification) => void;
  dismiss: (id: string) => void;
}
```

- Убирает `dispatchNotify` / `dispatchSosNotify` / `window.addEventListener('notificationEvent', …)`.
- Тостер подписывается на `queue`, авто-снимает по TTL через `setTimeout` в `push`.

### 2.6. `currentUserStore` / `permissionsStore` / `userSettingsStore`

- Заполняются bridge'ом из Dexie: при старте читаем `db.current_user`, `db.users`, `db.roles`, `db.user_settings`, подписываемся на изменения через `db.<table>.hook('creating' | 'updating' | 'deleting', …)` или через одиночный `useLiveQuery` внутри сервисного `initDexieBridge()`.
- Стор хранит уже *вычисленный* плоский массив permissions (вместо merge на каждой подписке).
- Заменяют `PermissionsProvider`, `UserSettingsProvider`, `useCurrentUser`/`useAuth` (часть с `sid` → `persist` middleware).

### 2.7. UI-сторы

| Стор | Поля | Заменяет |
|---|---|---|
| `helpCenterStore` | `currentDocPage`, `setCurrentDocPage` | `HelpCenterProvider`. |
| `systemLoggerStore` | `logs`, `isLoggerModalVisible`, `isSoftPhoneOnline`, `isSoftPhoneWsConnected`, `addLog`, `toggleModal` | `SystemLoggerProvider` + `useSoftPhoneLogs`. |
| `avatarStore` | `version: Map<userId, number>`, `invalidate(userId)` | Локальный `Map<userId, Set<Listener>>` в `useAvatar.ts`. |

### 2.8. Persistence

`persist` middleware — для `sid`, `tableConfig:*`, `quickFilters:*`, `version`. Один стор `appSettingsStore` с partializer'ом, чтобы исключить hot-поля.

---

## 3. WS-middleware и батчинг

Один shared-модуль `src/app/stores/wsBridge.ts` инициализируется в `index.tsx` **до** монтирования React:

```ts
const buffer = {
  calls_statistics: [] as CallsStatistics[],
  users_statuses_log: [] as ILogUserStatus[],
  table: [] as TableWSMessage[],
};

let scheduled = false;
const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  setTimeout(flush, 100);
};

const flush = () => {
  scheduled = false;
  if (buffer.calls_statistics.length) {
    useCallsStatisticsStore.getState().upsertBatch(buffer.calls_statistics);
    buffer.calls_statistics = [];
  }
  if (buffer.users_statuses_log.length) {
    useUsersStatusesLogStore.getState().upsertBatch(buffer.users_statuses_log);
    buffer.users_statuses_log = [];
  }
  if (buffer.table.length) {
    const tdp = useTableDataStore.getState();
    for (const msg of buffer.table) tdp.applyMessage(msg);
    buffer.table = [];
  }
};
```

- 100 мс ≈ 10 flush'ев/сек, на 100+ msg/sec даёт максимум 10 ререндеров вместо 100.
- Hot-сущности (`calls_statistics`, `users_statuses_log`) не пишутся в Dexie — обходится двойное хранение.
- Cold-сущности (`users`, `queues`, `roles`, …) продолжают идти через текущий 150 мс flush в Dexie, а Dexie-bridge заполняет соответствующие сторы (или компоненты читают через `useLiveQuery` как и сейчас).

---

## 4. Сравнение текущего решения и Zustand

| Критерий | Сейчас (Context + useReducer + Dexie) | После (Zustand) |
|---|---|---|
| **Гранулярность подписки** | Любой потребитель `useCallsStatistics()` ререндерится на каждое сообщение. | `useStore(selector, shallow)`: ререндер только при изменении *именно* срезa. |
| **CPU на сообщении** | `new Map(prev)` (O(n)) + `Array.from(state.values())` (O(n)) + проход reconciler по всем потребителям. | Один `setState` за батч 100 мс с мутацией Map (immer) → O(k), где k — размер батча. |
| **Reference equality** | `data` пересоздаётся каждый dispatch → инвалидирует `useMemo` дочерних. | Стор отдаёт стабильные ссылки на Map и `version`, потребители мемоизируют по `version`. |
| **Подписки вне React** | Нет, всё через хуки и `dispatch`. | `store.subscribe` / `subscribeWithSelector` — bridge'ы (Dexie ↔ store, WS ↔ store, softphone ↔ store) пишут напрямую. |
| **Дерево провайдеров** | 8 вложенных Provider'ов в `App.tsx`. | 0 провайдеров; сторы — модули. |
| **Бойлерплейт на стор** | `createContext` + типы + `useReducer` + `useMemo` + `Provider` + `useXContext` hook (~40 строк). | `create<T>()(set => ({ … }))` (~15 строк). |
| **Глобальные события** | `window.CustomEvent` для нотификаций/софтфона — невидимы в DevTools. | `notificationsStore` / `systemLoggerStore` — видны в Redux DevTools middleware. |
| **Persistence (sid, configs)** | Ручной `localStorage.setItem`/`getItem`, рассыпанный по utils. | `persist` middleware с typed schema и версионированием. |
| **Тестируемость** | Нужно обернуть в Provider и сэмулировать reducer. | `useStore.setState({ … })` в setup-блоке теста. |
| **Двойное хранение hot-данных** | `calls_statistics`/`users_statuses_log` → Context + Dexie (`bulkPut`). | Только Zustand. Dexie — только для cold-сущностей и persistence. |
| **Dexie-зависимость в React** | 130+ мест с `useLiveQuery`. | Сохраняется для cold-таблиц; для часто читаемых сущностей появляется derived-стор, заполненный bridge'ом. |

### Риски

- **Совместимость с Dexie-bridge'ом.** При плохой реализации `hook('updating')` может вызвать каскад `setState`. Митигация — батчинг и dedupe по `version`.
- **Структуры Map/Set и иммутабельность.** Zustand сравнивает по референсу. Нужно либо `immer`, либо явно создавать новый Map при апдейте корня; внутри `setState` — `state.byId.set(…)` через `immer` (mutate ok).
- **Размер бандла.** +~3 KB gzip. Допустимо.
- **Параллельность с текущим кодом во время миграции.** Решается слоем-адаптером: старый Context-хук временно проксирует Zustand (`useCallsStatistics()` → читает из стора), пока все потребители не переедут на селекторы.
- **`react-error-boundary` в `UserSettingsProvider`.** При выпиле провайдера переехать оборачивание в корневой `ErrorBoundary` (`main.tsx`).

---

## 5. Обеспечение производительности при 100+ msg/sec

- **Батчинг 100 мс** в WS-bridge — основной выигрыш (CPU/ререндеры ↓ в ~10×).
- **`shallow` сравнение** селекторов, возвращающих массивы/объекты.
- **Хранить индексы**, не пересчитывать на каждом сообщении (`byQueue: Map<queueId, Set<id>>` обновляется инкрементально).
- **`version`-счётчик** в hot-сторах вместо реконструкции массивов: потребитель делает `useMemo(() => Array.from(byId.values()), [version])`.
- **`subscribeWithSelector` + RAF** для UI-критичных подписок (например, тостер) — флашится не чаще одного кадра.
- **Селекторы возвращают примитивы.** Например, `useCallsStatisticsStore(s => s.byId.size)` для счётчиков — никаких ререндеров кроме изменения размера.
- **Hot-данные мимо Dexie.** `calls_statistics` и `users_statuses_log` не идут в `bulkPut` — экономим транзакции IndexedDB при пиках.
- **Web Worker остаётся.** Парсинг JSON и first-pass нормализация по-прежнему вне main thread; bridge только пересылает уже типизированные batch'и.

---

## 6. План поэтапной миграции (без поломки прод)

Принцип: на каждом этапе сохраняем оба слоя; старый Context-API оборачивает новый стор, потребители мигрируют пакетами.

### Этап 0. Подготовка
- Добавить Zustand в `package.json`, создать `src/app/stores/` и `src/app/stores/wsBridge.ts`.
- Вынести типы `EntityName`/`WebSocketActions` в общий доступ (уже есть в `src/types/settings.ts` и `src/app/workers/types/WebSocketActions.ts`).

### Этап 1. `wsStore` (низкий риск)
- Перенести `useWSWorker` логику в `wsBridge` + `wsStore`.
- `WebSocketProvider` оставить как тонкую обёртку: `useWebSocketContext()` отдаёт значения из стора через селекторы.
- Все существующие потребители `useWebSocketContext` работают без изменений.

### Этап 2. Hot-path: `callsStatisticsStore`, `usersStatusesLogStore` (главный выигрыш)
- Реализовать сторы и батчинг в `wsBridge`.
- `CallsStatisticsProvider`/`UsersStatusesLogProvider` — тонкие обёртки, `data` собирается из стора по `version`.
- Перевести самые горячие потребители на прямой селектор `useStore`. Замерить через React Profiler.
- Удалить провайдеры из `App.tsx`, когда не останется потребителей через `useContext`.

### Этап 3. `tableDataStore`
- Slice per entity, `applyMessage` в bridge.
- `useTableDataContext()` → читает из стора. Постепенный перевод страниц (`Calls`, `Companies`, `OutgoingCall/*`) на прямые селекторы.

### Этап 4. `notificationsStore`
- `dispatchNotify` → `useNotificationsStore.getState().push(...)`. Сохранить старую сигнатуру.
- `useNotification` подписывается на `queue` (`shallow`) вместо `window.addEventListener`.
- Удалить `window` CustomEvent после миграции тостера и SOS-нотификаций.

### Этап 5. Dexie-bridge для derived-стороов
- `currentUserStore`, `permissionsStore`, `userSettingsStore` — bridge через `useLiveQuery`-обёртку (внутри одного hidden-компонента или через `db.<table>.hook(...)`).
- Перевести `usePermissions`, `useUserSettings`, `useCurrentUser` на чтение из стора.
- Удалить `PermissionsProvider`, `UserSettingsProvider`.

### Этап 6. UI-сторы и persist
- `helpCenterStore`, `systemLoggerStore`, `avatarStore`.
- `appSettingsStore` с `persist` — сюда переезжают `sid`, `tableConfig:*`, `quickFilters:*`, `version`.
- Удалить `HelpCenterProvider`, `SystemLoggerProvider`.

### Этап 7. Чистка
- Удалить `src/utils/createEntityReducer.ts`, `dispatchNotify`/`dispatchSosNotify`, `wsEventHandlers`.
- В `App.tsx` остаётся только `<RouterProvider />` + бутстрап-эффекты.
- В Dexie оставить cold-таблицы + persistence (`current_user`, `users`, `queues`, `roles`, `users_avatar`, `organization_structure`, справочники). Hot-таблицы (`calls_statistics`, `users_statuses_log`) — выпилить из схемы при следующем bump'е версии.

### Контрольные точки (feature-flag)
- На этапах 2, 3, 4 держать `VITE_USE_ZUSTAND=true|false` в `.env`, фолбэк на старый Context. После 2–3 спринтов в проде — удалить флаг и старый код.
