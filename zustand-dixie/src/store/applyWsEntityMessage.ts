/**
 * Purpose: Immutable application of one WS message onto entity buckets.
 * Inputs: current `AllEntityBuckets`, `WsEntityMessage`.
 * Outputs: new bucket map (structural sharing per touched entity).
 */
import type { EntityName } from '../constants/entityNames';
import type { AllEntityBuckets, EntityRowMap } from '../domain/entityRows';
import type { WsEntityMessage } from '../domain/entityMessages';

function cloneBucket<E extends EntityName>(
  entities: AllEntityBuckets,
  entity: E,
): Record<string, EntityRowMap[E]> {
  return { ...entities[entity] };
}

export function applyWsEntityMessage(
  entities: AllEntityBuckets,
  msg: WsEntityMessage,
): AllEntityBuckets {
  const entity = msg.entity;

  switch (msg.action) {
    case 'query':
      return entities;

    case 'delete': {
      const bucket = cloneBucket(entities, entity);
      const id = msg.payload;
      const { [id]: _, ...rest } = bucket;
      void _;
      return { ...entities, [entity]: rest };
    }

    case 'put':
    case 'add': {
      const bucket = cloneBucket(entities, entity);
      bucket[msg.payload.id] = msg.payload;
      return { ...entities, [entity]: bucket };
    }

    case 'bulkPut': {
      const bucket = cloneBucket(entities, entity);
      for (const row of msg.payload) {
        bucket[row.id] = row;
      }
      return { ...entities, [entity]: bucket };
    }

    case 'bulkAdd': {
      const bucket = cloneBucket(entities, entity);
      for (const row of msg.payload) {
        if (!(row.id in bucket)) {
          bucket[row.id] = row;
        }
      }
      return { ...entities, [entity]: bucket };
    }
  }
}

export function applyWsEntityMessages(
  entities: AllEntityBuckets,
  messages: readonly WsEntityMessage[],
): AllEntityBuckets {
  let next = entities;
  for (const m of messages) {
    next = applyWsEntityMessage(next, m);
  }
  return next;
}
