import {
  TableDataState,
  TableWSMessage,
} from 'app/providers/TableDataProvider/model/types';
import dayjs from 'dayjs';

import { getTableMessageCoalesceKey } from './tableDataHelpers';
export { tableDataInitialState } from './tableDataInitialState';

/** Immutable single-message apply (ported from TableDataProvider reducer). */
export function applyTableDataMessage(
  state: TableDataState,
  msg: TableWSMessage
): TableDataState {
  const { entity, action } = msg;
  if (!(entity in state)) {
    console.warn(`Unprocessable entity: ${entity}`);
    return state;
  }

  const now = dayjs().toDate();
  const currentState = state[entity];

  switch (action) {
    case 'bulkPut':
      return {
        ...state,
        [msg.entity]: {
          ...currentState,
          items: msg.payload.items,
          page: msg.payload.page,
          pages: msg.payload.pages,
          size: msg.payload.size,
          total: msg.payload.total,
          isLoading: false,
          updatedAt: now.getTime(),
        },
      };

    case 'put': {
      const item = msg.payload;
      const index = currentState.items.findIndex((i) => i.id === item.id);
      const nextItems =
        index !== -1
          ? [
              item,
              ...currentState.items.slice(0, index),
              ...currentState.items.slice(index + 1),
            ]
          : [item, ...currentState.items];

      return {
        ...state,
        [msg.entity]: {
          ...currentState,
          items: nextItems,
          updatedAt: now.getTime(),
        },
      };
    }

    case 'add': {
      const item = msg.payload;
      if (currentState.items.some((i) => i.id === item.id)) {
        return state;
      }
      return {
        ...state,
        [msg.entity]: {
          ...currentState,
          items: [item, ...currentState.items],
          updatedAt: now.getTime(),
        },
      };
    }

    case 'delete':
      return {
        ...state,
        [msg.entity]: {
          ...currentState,
          items: currentState.items.filter((i) => i.id !== msg.payload),
          updatedAt: now.getTime(),
        },
      };

    case 'query':
      return {
        ...state,
        [msg.entity]: {
          ...currentState,
          isLoading: true,
        },
      };

    default:
      return state;
  }
}

/**
 * Applies many table messages in one pass (one React/Zustand commit).
 * bulkPut replaces entity bucket; put/add/delete coalesce per item id.
 */
export function applyTableDataMessageBatch(
  state: TableDataState,
  messages: TableWSMessage[]
): TableDataState {
  let next = state;

  const bulkByEntity = new Map<string, TableWSMessage>();
  const deltasByEntity = new Map<string, TableWSMessage[]>();

  for (const msg of messages) {
    if (msg.action === 'bulkPut') {
      bulkByEntity.set(msg.entity, msg);
      deltasByEntity.delete(msg.entity);
      continue;
    }
    if (bulkByEntity.has(msg.entity)) continue;

    const list = deltasByEntity.get(msg.entity) ?? [];
    list.push(msg);
    deltasByEntity.set(msg.entity, list);
  }

  for (const msg of bulkByEntity.values()) {
    next = applyTableDataMessage(next, msg);
  }

  for (const [, deltas] of deltasByEntity) {
    const coalesced = coalesceTableDeltas(deltas);
    for (const msg of coalesced) {
      next = applyTableDataMessage(next, msg);
    }
  }

  return next;
}

function coalesceTableDeltas(messages: TableWSMessage[]): TableWSMessage[] {
  const lastByKey = new Map<string, TableWSMessage>();
  for (const msg of messages) {
    lastByKey.set(getTableMessageCoalesceKey(msg), msg);
  }
  return [...lastByKey.values()];
}
