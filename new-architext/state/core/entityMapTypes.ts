import { WebSocketActions } from 'app/workers/types/WebSocketActions';
import { EntityName } from 'types/settings';

export type EntityWithId = { id: string | number };

export type EntityMapPutMessage<
  T extends EntityWithId,
  E extends EntityName = EntityName,
> = {
  entity: E;
  action: Extract<WebSocketActions, 'put' | 'add'>;
  payload: T;
};

export type EntityMapDeleteMessage<
  T extends EntityWithId,
  E extends EntityName = EntityName,
> = {
  entity: E;
  action: Extract<WebSocketActions, 'delete'>;
  payload: T['id'];
};

export type EntityMapBulkPutMessage<
  T extends EntityWithId,
  E extends EntityName = EntityName,
> = {
  entity: E;
  action: Extract<WebSocketActions, 'bulkPut'>;
  payload: T[];
};

export type EntityMapBulkAddMessage<
  T extends EntityWithId,
  E extends EntityName = EntityName,
> = {
  entity: E;
  action: Extract<WebSocketActions, 'bulkAdd'>;
  payload: T[];
};

export type EntityMapMessage<
  T extends EntityWithId,
  E extends EntityName = EntityName,
> =
  | EntityMapPutMessage<T, E>
  | EntityMapDeleteMessage<T, E>
  | EntityMapBulkPutMessage<T, E>
  | EntityMapBulkAddMessage<T, E>;

export type EntityMapUpsertMessage<
  T extends EntityWithId,
  E extends EntityName = EntityName,
> = EntityMapPutMessage<T, E> | EntityMapBulkPutMessage<T, E> | EntityMapBulkAddMessage<T, E>;
