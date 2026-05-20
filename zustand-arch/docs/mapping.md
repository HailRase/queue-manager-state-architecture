# Legacy API to Zustand mapping

## Providers and hooks

| Legacy (src/app/providers/...) | New store | New selectors | Compat hook |
|---|---|---|---|
| `WebSocketProvider` + `useWebSocketContext` | `wsStore` | `useWsStatus`, `useWsIsOpen`, `useMaxAttemptsReached` | `useWebSocketContext` (1:1 surface) |
| `CallsStatisticsProvider` + `useCallsStatistics` | `callsStatisticsStore` (byId/byQueue/version) | `useCallsStatisticsList`, `useCallsStatisticsByQueue`, `useCallsStatisticsById`, `useCallsStatisticsSize` | `useCallsStatistics` |
| `UsersStatusesLogProvider` + `useUsersStatusesLog` | `usersStatusesLogStore` (byId/byUser/version) | `useUsersStatusesList`, `useUsersStatusesByUser`, `useUsersStatusesById`, `useUsersStatusesSize` | `useUsersStatusesLog` |
| `TableDataProvider` + `useTableDataContext` | `tableDataStore` | `useTableSlice`, `useTableSliceItems`, `useTableSliceIsLoading`, `useTableSlicePagination` | `useTableDataContext` |
| `PermissionsProvider` + `usePermissionsContext` | `permissionsStore` | `useHasPermission`, `usePermissionsList`, `hasPermission` | `usePermissions` |
| `UserSettingsProvider` + `useUserSettingsContext` | `userSettingsStore` | direct `useUserSettingsStore(s => s.settings)` | `useUserSettings` |
| `HelpCenterProvider` (Context only) | `helpCenterStore` | direct `useHelpCenterStore` | `useHelpCenterStore` (no compat shim needed) |
| `SystemLoggerProvider` + `useSystemLoggerContext` | `systemLoggerStore` (+ `softphoneBridge`) | direct `useSystemLoggerStore(...)` selectors | `useSystemLoggerStore` |

## Utility replacements

| Legacy (src/utils/...) | New |
|---|---|
| `dispatchNotify` | `useNotificationsStore.getState().push(...)` |
| `dispatchSosNotify` | `useNotificationsStore.getState().pushSos(...)` |
| `wsEventHandlers.wsOnOpenHandler` | `notificationsStore.push(...)` inside `wsBridge` on `OPEN` (optional) |
| `wsEventHandlers.wsOnCloseHandler` | `notificationsStore.push(...)` inside `wsBridge` on `CLOSE` (optional) |
| `createEntityReducer` | replaced by hot-store `upsertBatch` semantics |
| `localStorage` helpers (`setTableConfig`, `getLocalStorageConfig`, `quickFilters`) | `appSettingsStore.setTableConfig`, `setQuickFilters`, `setSid` (persist) |

## Hook replacements

| Legacy (src/hooks/...) | New |
|---|---|
| `useWSWorker` | `initWsBridge` (bootstrap) + `wsStore` |
| `usePermissions` | reads `permissionsStore` populated by `dexieBridge` |
| `useUserSettings` | reads `userSettingsStore` populated by `dexieBridge` |
| `useAvatar` (local bus) | local bus replaced by `avatarStore.invalidate(userId)` + selector `useAvatarStore(s => s.versions.get(userId))` |
| `useDataQuery` | preserved 1:1; depends on `wsStore.command` + Dexie `query_id` table |

## Worker contract

- Worker file stays at `src/app/workers/wsWorker.ts`.
- `wsBridge` is the only consumer of `WorkerMessage` events.
- No React imports inside `wsBridge` or worker.
