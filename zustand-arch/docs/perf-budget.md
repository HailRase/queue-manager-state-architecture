# Performance budgets

## Hot path (calls_statistics, users_statuses_log)

- Up to 100 inbound messages per second sustained.
- <= 10 rerenders per second on any single hot-path component.
- <= 16ms per `flush()` of the WS batcher (one frame at 60fps).
- Single shared `setTimeout` (100ms) for the entire hot path.
- Map/Set indices updated incrementally; `version` increments once per batch.

## Memory and references

- `byId` / `byQueue` / `byUser` instances are stable across batches; immer mutates in place.
- `Array.from(map.values())` happens only inside `useStableArrayFromMap` and only when `version` advances.
- Selector consumers use `useShallow` for object/array returns to keep referential equality.

## I/O

- Hot-path entities never hit IndexedDB; only the worker writes cold entities on its 150ms interval.
- Persist middleware writes only `{ sid, tableConfig, quickFilters, version }` to localStorage.

## Dexie bridge

- 50ms debounce per source table to coalesce cascades from `bulkPut`.
- Single async recompute path; permissions merge is O(roles * permissions per role).

## Failure modes to watch

- Buffer growth without flush -> investigate `setTimeout` cancellation.
- `version` not advancing despite `upsertBatch` -> consumer memo will hold stale array.
- `useShallow` with new array literals inside selector -> falls back to deep miss every render.

## Manual verification

- React Profiler under sustained 100 msg/sec: hot components must render at most ~10/sec.
- Source-tab timeline: each flush <= 16ms; long-task warnings forbidden.
- LocalStorage size: stays bounded; no hot data leaking through partializer.
