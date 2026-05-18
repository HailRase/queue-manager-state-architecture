/**
 * Purpose: Build empty `AllEntityBuckets` for store + hydrate base.
 * Inputs: `ENTITY_NAMES`.
 * Outputs: `createEmptyEntityBuckets`.
 */
import { ENTITY_NAMES } from '../constants/entityNames';
import type { AllEntityBuckets } from '../domain/entityRows';

export function createEmptyEntityBuckets(): AllEntityBuckets {
  const buckets = {} as AllEntityBuckets;
  for (const name of ENTITY_NAMES) {
    buckets[name] = {};
  }
  return buckets;
}
