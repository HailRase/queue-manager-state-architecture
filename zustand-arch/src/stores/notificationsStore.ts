/**
 * - purpose: in-memory queue for toast and SOS notifications
 * - inputs: push/pushSos/dismiss/dismissSos actions from bridges and UI
 * - outputs: queue, sos arrays + setters; auto-dismiss via setTimeout in push
 * - constraint: NEVER dispatches window.CustomEvent
 * - replaces: dispatchNotify / dispatchSosNotify / window-event bus
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { withDevtools } from '../middleware/withDevtools';
import type { INotification, ISOSNotification } from '../types/notifications';

const DEFAULT_TTL_MS = 5000;

export interface NotificationsState {
  queue: INotification[];
  sos: ISOSNotification[];
  push: (n: INotification, ttlMs?: number) => void;
  pushSos: (n: ISOSNotification, ttlMs?: number) => void;
  dismiss: (id: INotification['id']) => void;
  dismissSos: (id: ISOSNotification['id']) => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  subscribeWithSelector(
    withDevtools('notificationsStore', (set, get) => ({
      queue: [],
      sos: [],
      push: (n, ttlMs) => {
        set((state) => ({ queue: [...state.queue, n] }));
        const ttl = typeof ttlMs === 'number' ? ttlMs : n.time ?? DEFAULT_TTL_MS;
        if (ttl > 0) {
          setTimeout(() => get().dismiss(n.id), ttl);
        }
      },
      pushSos: (n, ttlMs) => {
        set((state) => ({ sos: [...state.sos, n] }));
        const ttl = typeof ttlMs === 'number' ? ttlMs : DEFAULT_TTL_MS;
        if (ttl > 0) {
          setTimeout(() => get().dismissSos(n.id), ttl);
        }
      },
      dismiss: (id) => {
        set((state) => {
          const next = state.queue.filter((item) => item.id !== id);
          if (next.length === state.queue.length) return state;
          return { queue: next };
        });
      },
      dismissSos: (id) => {
        set((state) => {
          const next = state.sos.filter((item) => item.id !== id);
          if (next.length === state.sos.length) return state;
          return { sos: next };
        });
      },
      clear: () => set({ queue: [], sos: [] }),
    }))
  )
);
