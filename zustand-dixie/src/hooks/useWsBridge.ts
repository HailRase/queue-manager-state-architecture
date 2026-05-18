/**
 * Purpose: Bridge Web Worker WebSocket + batched entity ops into Zustand.
 * Inputs: optional `wsUrl` for real socket.
 * Outputs: `status`, `sendSimulated`, worker lifecycle.
 */
import { useEntityStore } from '../store';
import type { WsEntityMessage } from '../domain/entityMessages';
import type { MainToWorker, WorkerToMain } from '../workers/wireTypes';
import WsWorker from '../workers/wsWorker?worker';
import { useCallback, useEffect, useState } from 'react';

export function useWsBridge(wsUrl: string | undefined): {
  status: 'Init' | 'Open' | 'Closed';
  maxReconnects: boolean;
  sendSimulated: (batch: WsEntityMessage[]) => void;
} {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [status, setStatus] = useState<'Init' | 'Open' | 'Closed'>('Init');
  const [maxReconnects, setMaxReconnects] = useState(false);
  const applyRemoteMessages = useEntityStore((s) => s.applyRemoteMessages);

  useEffect(() => {
    const w = new WsWorker();
    setWorker(w);
    w.onmessage = (ev: MessageEvent<WorkerToMain>) => {
      const msg = ev.data;
      switch (msg.type) {
        case 'OPEN':
          setStatus('Open');
          setMaxReconnects(false);
          break;
        case 'CLOSE':
          setStatus('Closed');
          break;
        case 'ENTITY_BATCH':
          applyRemoteMessages(msg.data);
          break;
        case 'MAX_RECONNECTS_REACHED':
          setMaxReconnects(true);
          setStatus('Closed');
          break;
        case 'ERROR':
          break;
      }
    };
    return () => {
      w.postMessage({ type: 'DISCONNECT' } satisfies MainToWorker);
      w.terminate();
    };
  }, [applyRemoteMessages]);

  useEffect(() => {
    if (!worker || !wsUrl || wsUrl.length === 0) {
      return;
    }
    worker.postMessage({ type: 'CONNECT', data: wsUrl } satisfies MainToWorker);
    return () => {
      worker.postMessage({ type: 'DISCONNECT' } satisfies MainToWorker);
    };
  }, [worker, wsUrl]);

  const sendSimulated = useCallback(
    (batch: WsEntityMessage[]) => {
      worker?.postMessage({
        type: 'SEND_SIMULATED',
        data: batch,
      } satisfies MainToWorker);
    },
    [worker],
  );

  return { status, maxReconnects, sendSimulated };
}
