# QmsDb + Zustand: варианты entity stores, hooks, selectors, CRUD

> Предложение по архитектуре React + TypeScript + Zustand для работы с entity-классами `QmsDb` (`db/db.ts`).
> Опирается на эксперименты в репозитории: `zustand-dixie`, `zustand-arch`, `mirror`, `new-architext`.

---

## Контекст: что есть в `QmsDb`

В `db/db.ts` — **~70 таблиц Dexie** с разными типами данных и **разными primary key**:

| Паттерн | Примеры | Особенность |
|---------|---------|-------------|
| Стандартный `id` | `users`, `calls`, `queues` | CRUD по `id` |
| Альтернативный ключ | `config` → `name`, `user_settings` → `user_id`, `raise_card` → `operator_login` | Нужен generic по ключу |
| Составной/индексный | `out_call_statistic`, `calls_statistics` | Нужны вторичные индексы в store |
| Singleton | `current_user`, `auth` | Один объект, не коллекция |
| Paginated stream | `calls`, `company`, `abonents_lists` | Уже решено в `tableDataStore` |
| Hot stream | `calls_statistics`, `call_event` | Высокая частота обновлений |

**Вывод:** один универсальный store «на всё» возможен, но **не все 70 entity нуждаются в одинаковом store** — лучше tiered-подход + фабрика.

---

## Вариант 1: Монолитный Entity Store + фабрика хуков/селекторов

Уже близко к `zustand-dixie/src/store/entityStore.ts`.

```typescript
// types — выводим из QmsDb
type QmsDbTables = Omit<QmsDb, keyof Dexie>;
type EntityName = keyof QmsDbTables;
type EntityOf<E extends EntityName> =
  QmsDbTables[E] extends Table<infer T> ? T : never;

type EntityBucket<E extends EntityName> = Record<string, EntityOf<E>>;

type EntityStoreState = {
  entities: { [E in EntityName]: EntityBucket<E> };
  meta: { [E in EntityName]: EntityMeta };
  hydration: 'idle' | 'loading' | 'ready' | 'error';
};
```

**CRUD actions** — generic reducer (как `createEntityReducer` в mirror):

```typescript
type CrudAction<T> =
  | { type: 'put'; payload: T }
  | { type: 'add'; payload: T }
  | { type: 'delete'; payload: string | number }
  | { type: 'bulkPut'; payload: T[] }
  | { type: 'bulkAdd'; payload: T[] };

function createEntityActions<E extends EntityName>(
  entity: E,
  set: StoreApi<EntityStoreState>['setState'],
  get: StoreApi<EntityStoreState>['getState'],
  db: QmsDb,
) {
  return {
    getById: (id: string) => get().entities[entity][id],
    getAll: () => Object.values(get().entities[entity]),

    create: async (item: EntityOf<E>) => {
      await db[entity].add(item);
      set(s => ({ entities: applyPut(s.entities, entity, item) }));
    },
    update: async (id: string, patch: Partial<EntityOf<E>>) => {
      await db[entity].update(id, patch);
      // optimistic или через Dexie hook
    },
    delete: async (id: string) => {
      await db[entity].delete(id);
      set(s => ({ entities: applyDelete(s.entities, entity, id) }));
    },
    applyWs: (msg: WsEntityMessage<E>) => { /* ... */ },
  };
}
```

**Фабрика хуков:**

```typescript
function createEntityHooks<E extends EntityName>(entity: E) {
  const useEntityStore = useGlobalEntityStore;

  const selectById = (id: string) => (s: EntityStoreState) =>
    s.entities[entity][id];

  const selectAll = (s: EntityStoreState) =>
    Object.values(s.entities[entity]);

  return {
    useEntity: (id: string) => useEntityStore(selectById(id)),
    useEntities: () => useEntityStore(useShallow(selectAll)),
    useEntityActions: () => useEntityStore(s => s.actions[entity]),
    useEntityMeta: () => useEntityStore(s => s.meta[entity]),
  };
}

// usage
export const usersHooks = createEntityHooks('users');
// usersHooks.useEntity('123')
```

**Плюсы:** один hydrate, один WS batch apply, типобезопасность через mapped types.

**Минусы:** большой store, нужны `useShallow` + version counters (как в `callsStatistics.selectors.ts`).

---

## Вариант 2: Store на каждую entity через generic factory

```typescript
interface EntitySliceState<T, K extends keyof T = 'id'> {
  byKey: Map<T[K], T>;
  version: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

interface EntitySliceActions<T, K extends keyof T = 'id'> {
  hydrate: () => Promise<void>;
  upsert: (item: T) => void;
  upsertBatch: (items: readonly T[]) => void;
  remove: (key: T[K]) => void;
  clear: () => void;
  applyWs: (msg: WsEntityMessage<T>) => void;
  create: (item: T) => Promise<void>;
  update: (key: T[K], patch: Partial<T>) => Promise<void>;
  delete: (key: T[K]) => Promise<void>;
}

function createEntityStore<
  E extends EntityName,
  K extends keyof EntityOf<E> = 'id' extends keyof EntityOf<E> ? 'id' : never
>(config: {
  entity: E;
  db: QmsDb;
  keyField: K;
  indexes?: Array<{
    name: string;
    getKey: (item: EntityOf<E>) => string | number;
  }>;
}) {
  return create<EntitySliceState<EntityOf<E>, K> & EntitySliceActions<EntityOf<E>, K>>()(
    subscribeWithSelector(
      immer((set, get) => ({
        byKey: new Map(),
        version: 0,
        status: 'idle',
        error: null,

        hydrate: async () => {
          set({ status: 'loading' });
          const rows = await config.db[config.entity].toArray();
          set(s => {
            s.byKey.clear();
            for (const row of rows) s.byKey.set(row[config.keyField], row);
            s.version++;
            s.status = 'ready';
          });
        },

        upsert: (item) => set(s => {
          s.byKey.set(item[config.keyField], item);
          s.version++;
        }),

        create: async (item) => {
          await config.db[config.entity].add(item);
          get().upsert(item);
        },
      }))
    )
  );
}

export const useUsersStore = createEntityStore({ entity: 'users', db, keyField: 'id' });
export const useConfigStore = createEntityStore({ entity: 'config', db, keyField: 'name' });
```

**Фабрика селекторов/хуков (один раз):**

```typescript
function bindEntityStore<T, K extends keyof T>(
  useStore: StoreApi<EntitySliceState<T, K> & EntitySliceActions<T, K>>
) {
  return {
    useByKey: (key: T[K]) => useStore(s => s.byKey.get(key)),
    useList: () => {
      const byKey = useStore(s => s.byKey);
      const version = useStore(s => s.version);
      return useStableArrayFromMap(byKey, version);
    },
    useCount: () => useStore(s => s.byKey.size),
    useActions: () => useStore(useShallow(s => ({
      create: s.create, update: s.update, delete: s.delete,
      upsert: s.upsert, hydrate: s.hydrate,
    }))),
    selectByKey: (key: T[K]) => (s: EntitySliceState<T, K>) => s.byKey.get(key),
  };
}

export const users = bindEntityStore(useUsersStore);
// users.useByKey(userId)
// users.useList()
```

**Плюсы:** изоляция, tree-shaking, независимый devtools per entity.

**Минусы:** 70 store instances, сложный WS router, больше памяти.

---

## Вариант 3: Tiered — рекомендуемый для QmsDb

Разделить entity по **роли**, а не по «один store = одна таблица»:

```
┌─────────────────────────────────────────────────────────┐
│  Tier A: Hot Streams (отдельные stores)                 │
│  calls_statistics, call_event, notification, users_log  │
│  → Map + secondary indexes + batch coalescing           │
├─────────────────────────────────────────────────────────┤
│  Tier B: Paginated Tables (tableDataStore)              │
│  calls, company, strategy_call, selection, abonents...  │
│  → items[] + page/total/isLoading                       │
├─────────────────────────────────────────────────────────┤
│  Tier C: Reference/Lookup (единый lookupStore)          │
│  roles, permissions, timezones, employee_statuses...    │
│  → Record<entity, Map<id, T>>                           │
├─────────────────────────────────────────────────────────┤
│  Tier D: Singletons (микро-stores)                      │
│  current_user, auth, softphone_settings                 │
├─────────────────────────────────────────────────────────┤
│  Tier E: Dexie-only (без Zustand)                       │
│  journal, campaign_journal, abonents_lists_sync_logs    │
│  → liveQuery / on-demand read                           │
└─────────────────────────────────────────────────────────┘
```

**Registry + фабрика:**

```typescript
const ENTITY_TIER = {
  hot: ['calls_statistics', 'call_event', 'notification'] as const,
  paginated: ['calls', 'company', 'abonents_lists'] as const,
  lookup: ['roles', 'permissions', 'timezones', 'queues'] as const,
  singleton: ['current_user', 'auth'] as const,
} satisfies Record<string, readonly EntityName[]>;

function createEntityRegistry(db: QmsDb) {
  const hot = Object.fromEntries(
    ENTITY_TIER.hot.map(name => [name, createHotEntityStore(name, db)])
  );
  const lookup = createLookupStore(ENTITY_TIER.lookup, db);
  return { hot, lookup, tableData: useTableDataStore };
}
```

**Плюсы:** соответствует реальной нагрузке, меньше лишних re-render, проще миграция с текущего кода.

**Минусы:** нужна классификация entity (один раз).

---

## Вариант 4: Dexie как source of truth + Zustand как reactive cache

Паттерн из `zustand-arch/src/bridges/dexieBridge.ts`, но обобщённый:

```typescript
function createDexieSyncedStore<E extends EntityName>(entity: E, db: QmsDb) {
  const useStore = createEntityStore({ entity, db, keyField: 'id' });

  const subscribeDexie = () => {
    const table = db[entity];
    const debouncedRefresh = debounce(async () => {
      const rows = await table.toArray();
      useStore.getState().upsertBatch(rows);
    }, 50);

    table.hook('creating', debouncedRefresh);
    table.hook('updating', debouncedRefresh);
    table.hook('deleting', debouncedRefresh);

    return () => { /* unsubscribe */ };
  };

  return { useStore, subscribeDexie };
}
```

**CRUD flow:**

1. UI вызывает `actions.create/update/delete`
2. Action пишет в Dexie
3. Dexie hook → обновляет Zustand
4. WS message → пишет и в Dexie, и в store (или только Dexie, hook подхватит)

**Плюсы:** offline-first, персистентность «бесплатно», один источник правды.

**Минусы:** latency 50ms debounce, нужна idempotency при WS + local writes.

---

## CRUD + WS: универсальный контракт

На базе `zustand-dixie/src/store/applyWsEntityMessage.ts` и `mirror/src/utils/createEntityReducer.ts`:

```typescript
type EntityMessage<T, E extends EntityName = EntityName> = {
  entity: E;
  action: 'put' | 'add' | 'delete' | 'bulkPut' | 'bulkAdd' | 'query';
  payload: T | T[] | string | number;
};

interface EntityCrud<T, K extends keyof T = 'id'> {
  // Read
  get: (key: T[K]) => T | undefined;
  list: () => readonly T[];
  count: () => number;

  // Write (local + Dexie)
  create: (item: T) => Promise<void>;
  update: (key: T[K], patch: Partial<T>) => Promise<void>;
  remove: (key: T[K]) => Promise<void>;
  bulkUpsert: (items: readonly T[]) => Promise<void>;

  // Remote
  applyMessage: (msg: EntityMessage<T>) => void;
  requestQuery: (params?: unknown) => void;

  // Lifecycle
  hydrate: () => Promise<void>;
  reset: () => void;
}
```

---

## Полезные дополнения

### 1. Entity Meta (статус загрузки)

```typescript
type EntityMeta = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  lastSyncedAt: number | null;
  pendingWrites: number;
  error: string | null;
};
```

→ `useUsersMeta()` для skeleton/spinner per entity.

### 2. Secondary indexes

Как `byQueue` в `zustand-arch/src/stores/callsStatisticsStore.ts`:

```typescript
indexes: {
  byPhone: Map<string, Set<string>>,
  byOperatorFlag: Map<boolean, Set<string>>,
}
```

### 3. WS Message Coalescing

Уже есть в `new-architext/state/core/entityMapApply.ts` — `coalesceEntityMapMessages`. Применять на уровне bridge перед flush в store.

### 4. Cross-entity selectors

```typescript
const useOperatorWithSkills = (operatorId: string) => {
  const operator = useOperatorsStore(s => s.byKey.get(operatorId));
  const skills = useSkillsStore(s => s.byKey);
  return useMemo(() => ({
    operator,
    skills: operator?.skillIds.map(id => skills.get(id)).filter(Boolean),
  }), [operator, skills]);
};
```

### 5. `useLiveQuery` для cold entities

Для редко используемых таблиц (`journal`, `campaign_journal`) — не держать в Zustand:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
const journal = useLiveQuery(() => db.journal.orderBy('id').reverse().limit(50).toArray());
```

### 6. Optimistic updates + rollback

```typescript
update: async (id, patch) => {
  const prev = get().byKey.get(id);
  get().upsert({ ...prev, ...patch });
  try {
    await db.users.update(id, patch);
  } catch {
    if (prev) get().upsert(prev);
    throw error;
  }
}
```

### 7. Entity Registry для WS Router

```typescript
const wsRouter = new Map<EntityName, (msg: WsEntityMessage) => void>();
ENTITY_NAMES.forEach(name => {
  wsRouter.set(name, msg => getStoreFor(name).getState().applyMessage(msg));
});

export function routeWsMessage(msg: WsEntityMessage) {
  wsRouter.get(msg.entity)?.(msg);
}
```

### 8. Typed query builders

```typescript
usersQueries.bySipPhone(phone: string)
queuesQueries.byDtmf(dtmf: string)
callsStatisticsQueries.byQueue(queueId: number)
```

### 9. DevTools namespacing

```typescript
devtools(initializer, { name: `entity/${entityName}` })
```

### 10. Migration helper

Legacy Provider API → новые hooks (паттерн из `zustand-arch/src/hooks/useCallsStatistics.ts`):

```typescript
export const useUsers = () => ({
  data: users.useList(),
  dispatch: (msg) => users.useActions().applyMessage(msg),
});
```

---

## Рекомендуемая структура файлов

```
state/
├── core/
│   ├── types.ts              # EntityOf<E>, EntityMessage, EntityMeta
│   ├── applyEntityMessage.ts # pure reducer (из mirror/new-architext)
│   ├── createEntityStore.ts  # factory
│   └── entityRegistry.ts     # tier classification + WS router
├── stores/
│   ├── lookupStore.ts        # Tier C
│   ├── tableDataStore.ts     # Tier B (уже есть)
│   ├── callsStatisticsStore.ts
│   └── singletons/
│       ├── currentUserStore.ts
│       └── authStore.ts
├── selectors/
│   └── createSelectors.ts    # bindEntityStore factory
├── hooks/
│   └── createEntityHooks.ts
├── bridges/
│   ├── dexieBridge.ts        # Dexie hooks → stores
│   └── wsBridge.ts           # WS → registry
└── entities/
    ├── users.ts              # export const users = bindEntityStore(...)
    ├── queues.ts
    └── index.ts              # re-export all
```

---

## Сравнение вариантов

| Критерий | Вариант 1 (монолит) | Вариант 2 (store/entity) | Вариант 3 (tiered) |
|----------|---------------------|--------------------------|---------------------|
| Простота старта | ★★★★ | ★★ | ★★★ |
| Performance hot paths | ★★ | ★★★★ | ★★★★★ |
| Типобезопасность | ★★★★★ | ★★★★★ | ★★★★ |
| Миграция с текущего кода | ★★★ | ★★ | ★★★★★ |
| DevTools/debug | ★★ | ★★★★ | ★★★★ |

**Практическая рекомендация:** **Вариант 3 (tiered) + фабрика из Варианта 2** для генерации hooks/selectors/CRUD внутри каждого tier. Не создавать 70 отдельных store — классифицировать entity и генерировать API через `createEntityStore` + `bindEntityStore`.

---

## Edge-cases из `QmsDb`

| Entity | Primary key | Решение |
|--------|-------------|---------|
| `config` | `name` | `keyField: 'name'` |
| `user_settings` | `user_id` | Map by `user_id` или singleton per user |
| `current_user` | `id` | Отдельный singleton store |
| `raise_card` | `operator_login` | `keyField: 'operator_login'` |
| `calendar` | `date` | `keyField: 'date'` |
| `call_final_report` | `main_acallid` | `keyField: 'main_acallid'` |
| `Datasheet` entities | `id` | Generic `useDatasheet('employee_statuses')` |

---

## Связанные файлы в репозитории

- `db/db.ts` — схема `QmsDb`
- `docs/state-architecture.md` — текущая архитектура (mirror / провайдеры)
- `zustand-dixie/src/store/entityStore.ts` — монолитный entity store
- `zustand-arch/src/stores/` — разделённые stores (tableData, callsStatistics, …)
- `zustand-arch/src/bridges/dexieBridge.ts` — синхронизация Dexie → Zustand
- `mirror/src/utils/createEntityReducer.ts` — pure reducer для Map
- `new-architext/state/core/entityMapApply.ts` — coalescing WS messages
