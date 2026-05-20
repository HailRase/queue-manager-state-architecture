/**
 * - purpose: shallow equality for Map<K,V> by size + reference-equal values
 * - inputs: two Map instances (or any of unknown shape)
 * - outputs: boolean; treats undefined and identical references as equal
 * - constraint: O(n); does not deep-compare values
 * - usage: selectors that return Map slices
 */

export const shallowEqualMap = <K, V>(
  a: Map<K, V> | undefined,
  b: Map<K, V> | undefined
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (!b.has(key)) return false;
    if (b.get(key) !== value) return false;
  }
  return true;
};

export const shallowEqualSet = <T>(
  a: Set<T> | undefined,
  b: Set<T> | undefined
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
};
