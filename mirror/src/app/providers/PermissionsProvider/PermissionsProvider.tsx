import { usePermissions } from 'hooks/usePermissions';
import React, { createContext, ReactNode, useContext } from 'react';

interface IPermissionsContext {
  permissions: string[];
}
const PermissionsContext = createContext<IPermissionsContext | undefined>(
  undefined
);
export const usePermissionsContext = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error(
      'usePermissionsContext must be used within a PermissionsProvider'
    );
  }
  return context;
};
interface IWebSocketProvider {
  children: ReactNode;
}
export const PermissionsProvider: React.FC<IWebSocketProvider> = ({
  children,
}) => {
  const permissions = usePermissions();
  return (
    <PermissionsContext.Provider
      value={{
        permissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};
