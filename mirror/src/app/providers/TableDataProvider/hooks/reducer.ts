import {
  TableDataState,
  TableWSMessage,
} from 'app/providers/TableDataProvider/model/types';
import dayjs from 'dayjs';

const initialEntityState = {
  items: [],
  page: 1,
  pages: 0,
  size: 10,
  total: 0,
  isLoading: false,
  updatedAt: Date.now(),
};
export const tableDataInitialState: TableDataState = {
  calls: initialEntityState,
  operator_status_history: initialEntityState,
  company: initialEntityState,
  strategy_call: initialEntityState,
  selection: initialEntityState,
  abonents_lists: initialEntityState,
};

export function tableDataReducer(
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
          updatedDate: now,
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
          updatedDate: now,
        },
      };
    }

    case 'add': {
      const item = msg.payload;

      const exists = currentState.items.some((i) => i.id === item.id);

      if (exists) {
        return state;
      }

      return {
        ...state,
        [msg.entity]: {
          ...currentState,
          items: [item, ...currentState.items],
          updatedDate: now,
        },
      };
    }

    case 'delete':
      return {
        ...state,
        [msg.entity]: {
          ...currentState,
          items: currentState.items.filter((i) => i.id !== msg.payload),
          updatedDate: now,
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
