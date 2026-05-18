/**
 * Purpose: Combined Zustand store: IndexedDB hydrate + remote WS ops + devtools.
 * Inputs: `db`, `hydrateAllFromDb`, pure reducers.
 * Outputs: `useEntityStore`.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { db, createEmptyEntityBuckets } from '../db';
import { hydrateAllFromDb } from '../sync/hydrateAll';
import type { AllEntityBuckets } from '../domain/entityRows';
import { applyWsEntityMessages } from './applyWsEntityMessage';
import type { WsEntityMessage } from '../domain/entityMessages';

export type EntityHydrationStatus = 'idle' | 'loading' | 'ready' | 'error';

type BatchMeta = { count: number; at: number; ms: number };

type EntityStoreState = {
  entities: AllEntityBuckets;
  hydration: EntityHydrationStatus;
  hydrationError: string | null;
  lastRemoteBatch: BatchMeta | null;
};

type EntityStoreActions = {
  hydrateAllFromIndexedDb: () => Promise<void>;
  applyRemoteMessages: (messages: readonly WsEntityMessage[]) => void;
  resetVolatileEntities: () => void;
};

export type EntityStore = EntityStoreState & EntityStoreActions;

export const useEntityStore = create<EntityStore>()(
  devtools(
    (set) => ({
      entities: createEmptyEntityBuckets(),
      hydration: 'idle',
      hydrationError: null,
      lastRemoteBatch: null,

      hydrateAllFromIndexedDb: async () => {
        set({ hydration: 'loading', hydrationError: null });
        try {
          const entities = await hydrateAllFromDb(db);
          set({ entities, hydration: 'ready' });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Hydrate failed';
          set({ hydration: 'error', hydrationError: message });
        }
      },

      applyRemoteMessages: (messages) => {
        const t0 = performance.now();
        set((s) => ({
          entities: applyWsEntityMessages(s.entities, messages),
          lastRemoteBatch: {
            count: messages.length,
            at: t0,
            ms: performance.now() - t0,
          },
        }));
      },

      resetVolatileEntities: () => {
        set({ entities: createEmptyEntityBuckets(), lastRemoteBatch: null });
      },
    }),
    { name: 'EntityStore', enabled: import.meta.env.DEV },
  ),
);
