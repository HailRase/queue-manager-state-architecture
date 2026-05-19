import { create } from 'zustand';
import { Payload } from 'types/db';

import {
  OutboundWsPayload,
  PendingRequest,
  ProxyRestApiMessage,
  ProxyRestApiResponse,
  WsConnectionStatus,
} from '../core/types';

interface WsState {
  status: WsConnectionStatus;
  maxReconnectsReached: boolean;
  worker: Worker | null;

  setWorker: (worker: Worker | null) => void;
  setStatus: (status: WsConnectionStatus) => void;
  setMaxReconnectsReached: (value: boolean) => void;

  pendingRequests: Map<string, PendingRequest<unknown>>;
  registerPending: <TResponse>(
    id: string,
    pending: PendingRequest<TResponse>
  ) => void;
  resolvePending: (response: ProxyRestApiResponse) => void;

  postToWorker: (payload: OutboundWsPayload) => void;
  connect: (url: string) => void;
  disconnect: () => void;
}

export const useWsStore = create<WsState>((set, get) => ({
  status: 'Init',
  maxReconnectsReached: false,
  worker: null,

  setWorker: (worker) => set({ worker }),
  setStatus: (status) => set({ status }),
  setMaxReconnectsReached: (maxReconnectsReached) => set({ maxReconnectsReached }),

  pendingRequests: new Map(),

  registerPending: <TResponse>(id, pending) => {
    const wrapped: PendingRequest<unknown> = {
      resolve: (value) => {
        pending.resolve(value as TResponse);
      },
      reject: pending.reject,
    };
    const next = new Map(get().pendingRequests);
    next.set(id, wrapped);
    set({ pendingRequests: next });
  },

  resolvePending: (response) => {
    const { id, status, body } = response;
    const pending = get().pendingRequests.get(id);
    if (!pending) return;

    const next = new Map(get().pendingRequests);
    next.delete(id);
    set({ pendingRequests: next });

    if (status >= 200 && status < 300) {
      pending.resolve(body);
    } else {
      pending.reject(response);
    }
  },

  postToWorker: (payload) => {
    get().worker?.postMessage({ type: 'SEND', data: payload });
  },

  connect: (url) => {
    get().worker?.postMessage({ type: 'CONNECT', data: url });
  },

  disconnect: () => {
    get().worker?.postMessage({ type: 'DISCONNECT' });
  },
}));

export const buildWsOutbound = (
  command: OutboundWsPayload['command'],
  entity: OutboundWsPayload['entity'],
  payload: Payload | ProxyRestApiMessage
): OutboundWsPayload => ({
  command,
  entity,
  type: `${command}_${entity}`,
  payload,
});

export const sendRestViaStore = <TResponse = unknown>(
  command: OutboundWsPayload['command'],
  entity: OutboundWsPayload['entity'],
  msg: Omit<ProxyRestApiMessage, 'id'>,
  createId: () => string
): Promise<TResponse> => {
  const { worker, registerPending, postToWorker } = useWsStore.getState();
  if (!worker) {
    return Promise.reject(new Error('WS worker is not initialized'));
  }

  const id = createId();
  const payload: ProxyRestApiMessage = { id, ...msg };

  return new Promise<TResponse>((resolve, reject) => {
    registerPending<TResponse>(id, { resolve, reject });
    postToWorker(buildWsOutbound(command, entity, payload));
  });
};
