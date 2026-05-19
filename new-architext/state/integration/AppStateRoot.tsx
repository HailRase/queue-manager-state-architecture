import { FC, ReactNode } from 'react';

import { WsBridge } from '../bridge/WsBridge';

interface AppStateRootProps {
  children: ReactNode;
}

/**
 * Target root wrapper (replaces 4 nested providers + WebSocketProvider).
 *
 * Usage (after migration):
 *   <AppStateRoot>
 *     <PermissionsProvider> ... optional until permissions store
 *       <RouterProvider />
 *   </AppStateRoot>
 *
 * Dexie + useLiveQuery stay unchanged for entity CRUD.
 */
export const AppStateRoot: FC<AppStateRootProps> = ({ children }) => (
  <WsBridge>{children}</WsBridge>
);
