# Migration checklist

Pre-copy: place `zustand-arch/src/` content into `src/app/stores/` (or another agreed location) and merge `package.snippet.json` into the root `package.json`. Run `yarn install`.

## Stage 0. Preparation

- [ ] Merge dependencies from `zustand-arch/package.snippet.json` into root `package.json`.
- [ ] Re-export hot types (`EntityName`, `WebSocketActions`) from a single shared module.
- [ ] Add `src/app/stores/index.ts` barrel (clone of `zustand-arch/src/index.ts`).

## Stage 1. wsStore (low risk)

- [ ] Replace `useWSWorker` internals with `initWsBridge` call in `index.tsx`.
- [ ] Keep `WebSocketProvider` as a thin adapter reading from `wsStore` via the compat hook.
- [ ] Verify no behavioural change for existing consumers of `useWebSocketContext`.

## Stage 2. Hot-path: callsStatisticsStore + usersStatusesLogStore

- [ ] Wire bridge buffers and 100ms flush; remove direct dispatches in `CallsStatisticsProvider` and `UsersStatusesLogProvider`.
- [ ] Migrate the hottest consumers to direct selectors (`useCallsStatisticsByQueue`, `useCallsStatisticsList`).
- [ ] Profile rerender count; expect <=10/sec for hot-path components.
- [ ] Remove provider components from `App.tsx` once `useContext` callers are gone.

## Stage 3. tableDataStore

- [ ] Move `applyMessage` calls into `wsBridge`; remove `useReducer` from `TableDataProvider`.
- [ ] Migrate pages (`Calls`, `Companies`, `OutgoingCall/*`) to `useTableSlice('calls')` etc.
- [ ] Keep `useTableDataContext` compat hook until the last consumer migrates.

## Stage 4. notificationsStore

- [ ] Replace `dispatchNotify` / `dispatchSosNotify` with `useNotificationsStore.getState().push(...)`.
- [ ] Subscribe toast/SOS components to `queue` / `sos` with `useShallow`.
- [ ] Delete `window` CustomEvent handlers and `wsEventHandlers.ts`.

## Stage 5. Dexie bridge for derived stores

- [ ] Enable `initDexieBridge(db)` from `initStores`.
- [ ] Replace `usePermissions` / `useUserSettings` / current-user readers with selector hooks.
- [ ] Remove `PermissionsProvider` and `UserSettingsProvider` from `App.tsx`.

## Stage 6. UI stores and persist

- [ ] Route help-center page, softphone logs, avatar invalidations through their stores.
- [ ] Move `sid`, `tableConfig:*`, `quickFilters:*`, `version` into `appSettingsStore`.
- [ ] Delete `localStorage` helpers in `src/utils/` once unused.

## Stage 7. Cleanup

- [ ] Remove `createEntityReducer`, `dispatchNotify`, `dispatchSosNotify`, `wsEventHandlers`.
- [ ] Reduce `App.tsx` to `<RouterProvider />` plus mount-effects.
- [ ] Drop hot tables (`calls_statistics`, `users_statuses_log`) from the Dexie schema on the next version bump.

## Feature flag (stages 2-4)

- [ ] Optional: gate switch with `VITE_USE_ZUSTAND` env flag; remove flag after one stable release.
