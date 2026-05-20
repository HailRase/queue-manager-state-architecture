/**
 * - purpose: WS transport store (status, pending RPCs, sender API)
 * - inputs: command/entity/payload from React; worker injected by wsBridge
 * - outputs: { status, maxAttemptsReconnectReached, pending, command, sendRestApiMessage, sendRotatorMessage, setWorker, setStatus }
 * - constraint: pending Map is a field, not a subscription target
 * - replaces: WebSocketProvider + useWSWorker
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { COMMAND_NAMES } from '../../../src/constants/api';
import { ENTITY_NAMES } from '../../../src/constants/settings';
import { withDevtools } from '../middleware/withDevtools';
import type {
  CommandName,
  EntityName,
  Payload,
  PendingRequest,
  ProxyRestApiMessage,
  WsStatus,
} from '../types/ws';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

interface WsState {
  worker: Worker | null;
  status: WsStatus;
  maxAttemptsReconnectReached: boolean;
  pending: Map<string, PendingRequest>;
  setWorker: (worker: Worker | null) => void;
  setStatus: (patch: Partial<Pick<WsState, 'status' | 'maxAttemptsReconnectReached'>>) => void;
  connect: (url: string) => void;
  disconnect: () => void;
  command: (command: CommandName, entity: EntityName, payload: Payload) => void;
  sendRestApiMessage: (
    command: CommandName,
    entity: EntityName,
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<unknown>;
  sendRotatorMessage: (msg: Omit<ProxyRestApiMessage, 'id'>) => Promise<unknown>;
  resolvePending: (id: string, value: unknown) => void;
  rejectPending: (id: string, reason: unknown) => void;
}

const postToWorker = (worker: Worker | null, payload: unknown): void => {
  if (!worker) return;
  worker.postMessage({ type: 'SEND', data: payload });
};

export const useWsStore = create<WsState>()(
  subscribeWithSelector(
    withDevtools('wsStore', (set, get) => ({
      worker: null,
      status: 'Init',
      maxAttemptsReconnectReached: false,
      pending: new Map(),
      setWorker: (worker) => set({ worker }),
      setStatus: (patch) => set(patch),
      connect: (url) => {
        const { worker } = get();
        if (!worker) return;
        worker.postMessage({ type: 'CONNECT', data: url });
      },
      disconnect: () => {
        const { worker } = get();
        if (!worker) return;
        worker.postMessage({ type: 'DISCONNECT' });
      },
      command: (command, entity, payload) => {
        const { worker } = get();
        const type = `${command}_${entity}`;
        postToWorker(worker, { command, entity, type, payload });
      },
      sendRestApiMessage: (command, entity, msg) => {
        const { worker, pending } = get();
        if (!worker) return Promise.reject(new Error('WS worker not initialised'));
        const id = generateId();
        const type = `${command}_${entity}`;
        return new Promise<unknown>((resolve, reject) => {
          pending.set(id, { resolve, reject });
          worker.postMessage({
            type: 'SEND',
            data: { command, entity, type, payload: { id, ...msg } },
          });
        });
      },
      sendRotatorMessage: (msg) =>
        get().sendRestApiMessage(COMMAND_NAMES.PROXY, ENTITY_NAMES.ROTATOR, msg),
      resolvePending: (id, value) => {
        const { pending } = get();
        const entry = pending.get(id);
        if (!entry) return;
        entry.resolve(value);
        pending.delete(id);
      },
      rejectPending: (id, reason) => {
        const { pending } = get();
        const entry = pending.get(id);
        if (!entry) return;
        entry.reject(reason);
        pending.delete(id);
      },
    }))
  )
);
