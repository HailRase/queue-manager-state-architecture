# Миграция на `app/state`

Модуль **изолирован**: `App.tsx` пока использует старые providers. Подключение поэтапное.

## Фаза 0 — зависимость

```bash
yarn add zustand   # уже добавлено
```

## Фаза 1 — WS bridge (низкий риск)

1. Обернуть приложение:

```tsx
import { AppStateRoot } from 'app/state';

<AppStateRoot>
  {/* существующие providers пока оставить */}
  <App />
</AppStateRoot>
```

2. **Временно** отключить `WebSocketProvider` и продублировать worker — **нельзя**. Вместо этого:
   - Удалить `WebSocketProvider`
   - Удалить `CallsStatisticsProvider`, `UsersStatusesLogProvider`, `TableDataProvider`
   - Заменить `useWebSocketContext()` → `useWs()` из `app/state`

3. Файлы для массовой замены импорта:

| Было | Стало |
|------|--------|
| `useWebSocketContext` from providers | `useWs` from `app/state` |
| `useCallsStatistics` | `useCallsStatisticsData` |
| `useUsersStatusesLog` | `useUsersStatusesLogData` |
| `useTableDataContext` | `useTableDataStore` + selectors |

## Фаза 2 — Dashboard / Calls

Страницы с высоким потоком — первыми перевести на:

```tsx
const stats = useCallsStatisticsData();
const callsTable = useTableEntityState('calls');
```

Проверить: FPS, Memory, корректность таблицы при пике звонков.

## Фаза 3 — session

`MainContext` `sid` → `useSessionStore`. `PrivateRoute` читает `useSessionStore(s => s.sid)`.

## Фаза 4 — UI store

`HelpCenterProvider`, флаги `SystemLoggerProvider` → `useUiStore`.

## Фаза 5 — permissions (опционально)

Кэш permissions в Zustand при `bulkPut roles/users` — только если профилирование покажет проблему.

## Откат

Вернуть providers в `App.tsx`, убрать `AppStateRoot`. Папка `app/state` не влияет на сборку, если не импортировать.

## Чеклист регрессии

- [ ] Login + `QUERY_ID_ACK`
- [ ] Dashboard при >50 events/s
- [ ] `sendRestApiMessage` / rotator PROXY
- [ ] Reconnect после 12 попыток
- [ ] Dexie entities (users, queues) через `useLiveQuery`
- [ ] Logout очищает hot stores (`reset()` на stores)

## Сброс hot stores при logout

В `utils/logout` добавить:

```ts
import {
  useCallsStatisticsStore,
  useTableDataStore,
  useUsersStatusesLogStore,
} from 'app/state';

useCallsStatisticsStore.getState().reset();
useTableDataStore.getState().reset();
useUsersStatusesLogStore.getState().reset();
```
