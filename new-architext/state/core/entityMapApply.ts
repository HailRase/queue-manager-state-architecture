import { EntityName } from 'types/settings';

import {
  EntityMapMessage,
  EntityWithId,
} from './entityMapTypes';

/**
 * Applies WS entity message to an in-memory Map (mutates target).
 * Same semantics as utils/createEntityReducer, without new Map per message.
 */
export function applyEntityMapMessage<T extends EntityWithId>(
  target: Map<T['id'], T>,
  msg: EntityMapMessage<T>
): void {
  switch (msg.action) {
    case 'put':
    case 'add':
      target.set(msg.payload.id, msg.payload);
      break;
    case 'delete':
      target.delete(msg.payload);
      break;
    case 'bulkPut':
      for (const item of msg.payload) {
        target.set(item.id, item);
      }
      break;
    case 'bulkAdd':
      for (const item of msg.payload) {
        if (!target.has(item.id)) {
          target.set(item.id, item);
        }
      }
      break;
    default: {
      const _exhaustive: never = msg;
      return _exhaustive;
    }
  }
}

export const getEntityMapCoalesceKey = <T extends EntityWithId>(
  msg: EntityMapMessage<T>
): string => {
  switch (msg.action) {
    case 'bulkPut':
    case 'bulkAdd':
      return `${msg.entity}:${msg.action}`;
    case 'delete':
      return `${msg.entity}:delete:${String(msg.payload)}`;
    case 'put':
    case 'add':
      return `${msg.entity}:${msg.action}:${String(msg.payload.id)}`;
    default: {
      const _exhaustive: never = msg;
      return _exhaustive;
    }
  }
};

/** Last message per entity+id wins within one flush window. */
export function coalesceEntityMapMessages<
  T extends EntityWithId,
  E extends EntityName = EntityName,
>(messages: EntityMapMessage<T, E>[]): EntityMapMessage<T, E>[] {
  const bulkByEntity = new Map<string, EntityMapMessage<T, E>>();
  const lastByKey = new Map<string, EntityMapMessage<T, E>>();

  for (const msg of messages) {
    if (msg.action === 'bulkPut' || msg.action === 'bulkAdd') {
      bulkByEntity.set(`${msg.entity}:${msg.action}`, msg);
      continue;
    }

    lastByKey.set(getEntityMapCoalesceKey(msg), msg);
  }

  return [...bulkByEntity.values(), ...lastByKey.values()];
}

export function mapToRecord<T>(map: Map<string, T>): Record<string, T> {
  const record: Record<string, T> = {};
  for (const [id, value] of map) {
    record[id] = value;
  }
  return record;
}
