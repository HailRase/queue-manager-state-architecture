/**
 * - purpose: memoize Array.from(map.values()) keyed by a monotonic version
 * - inputs: map<K,V>, version: number
 * - outputs: readonly V[] stable until version changes
 * - constraint: NEVER called inside setState; consumer-side only
 * - usage: hot-path consumers that need an array view of Map state
 */

import { useMemo } from 'react';

export const useStableArrayFromMap = <K, V>(
  map: ReadonlyMap<K, V>,
  version: number
): readonly V[] => {
  return useMemo(() => Array.from(map.values()), [map, version]);
};

export const arrayFromMap = <K, V>(map: ReadonlyMap<K, V>): V[] =>
  Array.from(map.values());
