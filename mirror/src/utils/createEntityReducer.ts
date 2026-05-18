import { ReceivedWebSocketMessage } from 'app/workers/types';

export function createEntityReducer<T extends { id: string | number }>() {
  return (state: Map<T['id'], T>, msg: ReceivedWebSocketMessage) => {
    const next = new Map(state);

    switch (msg.action) {
      case 'put':
      case 'add': {
        const item = msg.payload as T;
        next.set(item.id, item);
        break;
      }

      case 'delete': {
        const id = msg.payload as unknown as T['id'];
        next.delete(id);
        break;
      }

      case 'bulkPut': {
        const items = msg.payload as T[];
        for (const item of items) {
          next.set(item.id, item);
        }
        break;
      }

      case 'bulkAdd': {
        const items = msg.payload as T[];
        for (const item of items) {
          if (!next.has(item.id)) {
            next.set(item.id, item);
          }
        }
        break;
      }
    }

    return next;
  };
}
