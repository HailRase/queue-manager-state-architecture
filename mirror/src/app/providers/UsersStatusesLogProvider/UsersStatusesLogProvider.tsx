import { ReceivedWebSocketMessage } from 'app/workers/types';
import {
  createContext,
  Dispatch,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { ILogUserStatus } from 'shared/db-types';
import { createEntityReducer } from 'utils';

const reducer = createEntityReducer<ILogUserStatus>();

const Context = createContext<{
  data: ILogUserStatus[];
  dispatch: Dispatch<ReceivedWebSocketMessage>;
} | null>(null);

export const UsersStatusesLogProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(reducer, new Map());

  const data: ILogUserStatus[] = useMemo(
    () => Array.from(state.values()),
    [state]
  );

  return (
    <Context.Provider value={{ data, dispatch }}>{children}</Context.Provider>
  );
};

export const useUsersStatusesLog = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('No UsersStatusesLogProvider');
  return ctx;
};
