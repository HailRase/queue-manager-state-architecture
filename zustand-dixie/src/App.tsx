/**
 * Purpose: Root UI — entity map summary, hydrates DB, worker bridge, simulation.
 * Inputs: user actions, environment.
 * Outputs: rendered diagnostics + controls.
 */
import { ENTITY_NAMES, type EntityName } from './constants/entityNames';
import { buildSimulatedBatch } from './dev/buildSimulatedBatch';
import { useWsBridge } from './hooks/useWsBridge';
import { useEntityStore } from './store';
import { useEffect, useMemo, useState } from 'react';

export default function App() {
  const hydrateAllFromIndexedDb = useEntityStore(
    (s) => s.hydrateAllFromIndexedDb,
  );
  const entities = useEntityStore((s) => s.entities);
  const hydration = useEntityStore((s) => s.hydration);
  const hydrationError = useEntityStore((s) => s.hydrationError);
  const lastRemoteBatch = useEntityStore((s) => s.lastRemoteBatch);

  const [wsUrl, setWsUrl] = useState('');
  const activeUrl = useMemo(
    () => (wsUrl.trim().length > 0 ? wsUrl.trim() : undefined),
    [wsUrl],
  );
  const { status, maxReconnects, sendSimulated } = useWsBridge(activeUrl);

  useEffect(() => {
    void hydrateAllFromIndexedDb();
  }, [hydrateAllFromIndexedDb]);

  const totalByEntity = useMemo(() => {
    const map: Record<EntityName, number> = {} as Record<EntityName, number>;
    for (const name of ENTITY_NAMES) {
      map[name] = Object.keys(entities[name]).length;
    }
    return map;
  }, [entities]);

  const totalRows = useMemo(
    () => ENTITY_NAMES.reduce((s, n) => s + totalByEntity[n], 0),
    [totalByEntity],
  );

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>zustand-dixie</h1>
      <p style={{ color: '#444' }}>
        Архитектура: Web Worker + Dexie (батч flush) + Zustand (devtools) + строгие
        `WsEntityMessage` для {ENTITY_NAMES.length} сущностей.
      </p>

      {hydration === 'loading' && <p>Гидратация из IndexedDB…</p>}
      {hydration === 'error' && (
        <p role="alert" style={{ color: 'crimson' }}>
          {hydrationError}
        </p>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2>Состояние</h2>
        <p>
          Сокет: <strong>{status}</strong>
          {maxReconnects ? ' (лимит реконнектов)' : ''} · Всего строк в
          памяти: <strong>{totalRows}</strong>
        </p>
        {lastRemoteBatch ? (
          <p style={{ fontSize: 14, color: '#555' }}>
            Последний батч из воркера: {lastRemoteBatch.count} сообщений за{' '}
            {lastRemoteBatch.ms.toFixed(2)} ms
          </p>
        ) : null}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>WebSocket (опционально)</h2>
        <input
          value={wsUrl}
          onChange={(e) => {
            setWsUrl(e.target.value);
          }}
          placeholder="wss://example/ws"
          style={{ width: '100%', padding: 8, marginBottom: 8 }}
        />
        <p style={{ fontSize: 13, color: '#666' }}>
          Ожидаются JSON-кадры с полями `entity`, `action`, `payload` — см.
          `parseWsEntityMessage`.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Симуляция (без сервера)</h2>
        <button
          type="button"
          disabled={hydration !== 'ready'}
          onClick={() => {
            sendSimulated(buildSimulatedBatch());
          }}
        >
          Отправить демо-батч в worker
        </button>
        <p style={{ fontSize: 13, color: '#666' }}>
          Worker пишет в IndexedDB и шлёт `ENTITY_BATCH` на main для Zustand.
        </p>
      </section>

      <section>
        <h2>Счётчики по сущностям</h2>
        <ul
          style={{
            columns: 2,
            fontSize: 13,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {ENTITY_NAMES.map((name) => (
            <li key={name} style={{ breakInside: 'avoid', padding: '2px 0' }}>
              <code>{name}</code>: {totalByEntity[name]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
