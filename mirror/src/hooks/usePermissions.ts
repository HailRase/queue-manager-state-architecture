import { db } from 'app/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { PermissionsObject } from 'shared/db-types';

export const usePermissions = () => {
  const joinedPermissions =
    useLiveQuery(async () => {
      const [currentUser] = await db.current_user.toArray();
      if (!currentUser) return '';

      const user = await db.users.get(currentUser.id);
      if (!user?.roles?.length) return '';

      const roles = await db.roles.where('title').anyOf(user.roles).toArray();

      const mergedPermissions: PermissionsObject = {};
      for (const { permissions } of roles) {
        if (!permissions) continue;
        for (const [key, value] of Object.entries(permissions)) {
          if (value) mergedPermissions[key] = true;
        }
      }
      return Object.keys(mergedPermissions).sort().join(',');
    }, []) ?? '';
  return useMemo(() => joinedPermissions.split(','), [joinedPermissions]);
};
