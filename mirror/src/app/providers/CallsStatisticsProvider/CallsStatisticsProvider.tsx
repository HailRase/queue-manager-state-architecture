import { ReceivedWebSocketMessage } from 'app/workers/types';
import {
  createContext,
  Dispatch,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { CallsStatistics } from 'shared/db-types';
import { createEntityReducer } from 'utils';

const reducer = createEntityReducer<CallsStatistics>();

const Context = createContext<{
  data: CallsStatistics[];
  dispatch: Dispatch<ReceivedWebSocketMessage>;
} | null>(null);

export const CallsStatisticsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(reducer, new Map());

  const data: CallsStatistics[] = useMemo(
    () => Array.from(state.values()),
    [state]
  );

  return (
    <Context.Provider value={{ data, dispatch }}>{children}</Context.Provider>
  );
};

export const useCallsStatistics = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('No CallsStatisticsProvider');
  return ctx;
};
