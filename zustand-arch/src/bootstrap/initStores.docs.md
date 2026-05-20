<!--
- purpose: where and how to invoke initStores
- inputs: QmsDb + optional Worker (for tests)
- outputs: single teardown function
- usage: call once in src/index.tsx BEFORE ReactDOM.createRoot(...).render(...)
- HMR: store teardown in module scope and call on import.meta.hot.dispose
-->

- Import `initStores` from `zustand-arch/src/bootstrap/initStores`.
- Call `const teardown = initStores({ db })` before rendering React.
- Pass a custom `worker` only in tests; production code lets the bridge construct it.
- Persist `teardown` to invoke on hot-module reload (`import.meta.hot.dispose(teardown)`).
- Do NOT call from inside a React component or effect.
- Bridges expose their own teardowns; `initStores` already composes them.
