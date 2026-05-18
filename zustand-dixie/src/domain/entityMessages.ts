/**
 * Purpose: Strict wire messages: entity + action + payload per row map.
 * Inputs: none.
 * Outputs: `WsEntityMessage`, parsers / guards.
 */
import { isEntityName, type EntityName } from '../constants/entityNames';
import type { EntityRowMap } from './entityRows';
import type { WsAction } from './wsActions';

type PutMsg<E extends EntityName> = {
  entity: E;
  action: 'put';
  payload: EntityRowMap[E];
};

type AddMsg<E extends EntityName> = {
  entity: E;
  action: 'add';
  payload: EntityRowMap[E];
};

type BulkPutMsg<E extends EntityName> = {
  entity: E;
  action: 'bulkPut';
  payload: EntityRowMap[E][];
};

type BulkAddMsg<E extends EntityName> = {
  entity: E;
  action: 'bulkAdd';
  payload: EntityRowMap[E][];
};

type DeleteMsg<E extends EntityName> = {
  entity: E;
  action: 'delete';
  payload: string;
};

type QueryMsg<E extends EntityName> = {
  entity: E;
  action: 'query';
  payload: Record<string, never>;
};

export type WsEntityMessage =
  | { [E in EntityName]: PutMsg<E> }[EntityName]
  | { [E in EntityName]: AddMsg<E> }[EntityName]
  | { [E in EntityName]: BulkPutMsg<E> }[EntityName]
  | { [E in EntityName]: BulkAddMsg<E> }[EntityName]
  | { [E in EntityName]: DeleteMsg<E> }[EntityName]
  | { [E in EntityName]: QueryMsg<E> }[EntityName];

export function isWsAction(value: unknown): value is WsAction {
  return (
    value === 'put' ||
    value === 'add' ||
    value === 'bulkPut' ||
    value === 'bulkAdd' ||
    value === 'delete' ||
    value === 'query'
  );
}

export function parseWsEntityMessage(raw: unknown): WsEntityMessage | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (!isEntityName(o.entity) || !isWsAction(o.action)) {
    return null;
  }
  if (!('payload' in o)) {
    return null;
  }
  return o as WsEntityMessage;
}
