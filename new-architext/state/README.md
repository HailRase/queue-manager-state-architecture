# `app/state` — эталонный Zustand-слой (не подключён к App по умолчанию)

- Purpose: replace Context reducers for hot WS streams with batched Zustand stores
- Inputs: worker `postMessage` events, outbound WS commands
- Outputs: selectors for dashboard/calls tables, WS status, REST proxy promises
- Constraint: Dexie remains SSOT for persisted entities; worker `wsWorker.ts` unchanged
- High load: coalescing + 32–48ms flush caps React commits at ~20–30/s under 100+ msg/s
- Typing: discriminated unions (`EntityMapMessage`, `WorkerBridgeMessage`), runtime guards in `core/typeGuards.ts`, no `any`

## Structure

```
state/
  core/           batching, reducers ported from providers
  stores/         zustand slices
  bridge/         worker onmessage router + WsBridge
  hooks/          useWs, useHotStreams (migration adapters)
  integration/    AppStateRoot
```

## Adoption

See [MIGRATION.md](./MIGRATION.md) and [ARCHITECTURE.ru.md](./ARCHITECTURE.ru.md).
