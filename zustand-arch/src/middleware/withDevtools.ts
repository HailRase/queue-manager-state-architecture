/**
 * - purpose: enable redux-devtools for a store only in DEV builds
 * - inputs: store name + zustand StateCreator (with arbitrary mutators)
 * - outputs: same creator wrapped by devtools, no-op in production
 * - constraint: zero runtime overhead in prod via `enabled: false`
 * - usage: compose between subscribeWithSelector and immer in store files
 */

import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { devtools } from 'zustand/middleware';

const isDevEnvironment = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return Boolean(import.meta.env.DEV);
  }
  return false;
};

export const withDevtools = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  name: string,
  creator: StateCreator<T, Mps, Mcs>
) => devtools(creator, { name, enabled: isDevEnvironment() });
