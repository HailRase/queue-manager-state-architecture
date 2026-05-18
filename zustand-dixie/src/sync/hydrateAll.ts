/**
 * Purpose: Load all Dexie tables into typed entity buckets.
 * Inputs: `AppDb` instance.
 * Outputs: `AllEntityBuckets`.
 */
import type { EntityName } from '../constants/entityNames';
import { ENTITY_NAMES } from '../constants/entityNames';
import type {
  AllEntityBuckets,
  EntityBucket,
  EntityRowMap,
} from '../domain/entityRows';
import { createEmptyEntityBuckets } from '../db/emptyBuckets';
import type { AppDb } from '../db/schema';
import type { Table } from 'dexie';

function assignBucket<E extends EntityName>(
  target: AllEntityBuckets,
  name: E,
  bucket: EntityBucket<E>,
): void {
  // Mapped-type variance: runtime-safe assignment for each concrete `name`.
  Reflect.set(target, name, bucket);
}

async function loadBucket<E extends EntityName>(
  database: AppDb,
  name: E,
): Promise<EntityBucket<E>> {
  const table = database[name] as Table<EntityRowMap[E]>;
  const rows = await table.toArray();
  const bucket: EntityBucket<E> = {};
  for (const row of rows) {
    bucket[row.id] = row;
  }
  return bucket;
}

export async function hydrateAllFromDb(database: AppDb): Promise<AllEntityBuckets> {
  const buckets = createEmptyEntityBuckets();
  for (const name of ENTITY_NAMES) {
    assignBucket(buckets, name, await loadBucket(database, name));
  }
  return buckets;
}
