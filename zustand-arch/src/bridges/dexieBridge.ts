/**
 * - purpose: project Dexie -> currentUser/permissions/userSettings stores
 * - inputs: QmsDb instance
 * - outputs: teardown removing Dexie hooks and timers
 * - constraint: 50ms debounce per source table; permissions merged before set
 * - boundary: only place that reads db.<table>.hook in zustand-arch
 */

import type Dexie from 'dexie';

import type { QmsDb } from '../../../src/app/db';
import type { Role } from '../../../src/shared/db-types';
import type { ICurrentUser } from '../../../src/types/currentUser';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { usePermissionsStore } from '../stores/permissionsStore';
import { useUserSettingsStore } from '../stores/userSettingsStore';

const DEBOUNCE_MS = 50;

type Unsubscribe = () => void;

interface HookCarrier<T> {
  hook(
    event: 'creating',
    fn: (primKey: unknown, obj: T) => void
  ): (primKey: unknown, obj: T) => void;
  hook(
    event: 'updating',
    fn: (modifications: Partial<T>, primKey: unknown, obj: T) => void
  ): (modifications: Partial<T>, primKey: unknown, obj: T) => void;
  hook(
    event: 'deleting',
    fn: (primKey: unknown, obj: T) => void
  ): (primKey: unknown, obj: T) => void;
}

const createDebouncer = (fn: () => void, ms: number): {
  trigger: () => void;
  dispose: () => void;
} => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    trigger: () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    },
    dispose: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
};

const subscribeTable = <T>(
  table: HookCarrier<T>,
  notify: () => void
): Unsubscribe => {
  const onCreate = (): void => notify();
  const onUpdate = (): void => notify();
  const onDelete = (): void => notify();
  table.hook('creating', onCreate);
  table.hook('updating', onUpdate);
  table.hook('deleting', onDelete);
  return () => {
    const carrier = table as unknown as Dexie.Table<T>;
    carrier.hook('creating').unsubscribe(onCreate);
    carrier.hook('updating').unsubscribe(onUpdate);
    carrier.hook('deleting').unsubscribe(onDelete);
  };
};

const mergePermissions = (roles: readonly Role[]): string[] => {
  const merged: Record<string, true> = {};
  for (const role of roles) {
    if (!role.permissions) continue;
    for (const [key, value] of Object.entries(role.permissions)) {
      if (value) merged[key] = true;
    }
  }
  return Object.keys(merged).sort();
};

const refreshCurrentUser = async (db: QmsDb): Promise<ICurrentUser | null> => {
  const [first] = await db.current_user.toArray();
  return first ?? null;
};

const refreshPermissions = async (db: QmsDb, user: ICurrentUser | null): Promise<string[]> => {
  if (!user) return [];
  const fullUser = await db.users.get(user.id);
  if (!fullUser?.roles?.length) return [];
  const roles = await db.roles.where('title').anyOf(fullUser.roles).toArray();
  return mergePermissions(roles);
};

const refreshUserSettings = async (
  db: QmsDb,
  user: ICurrentUser | null
): Promise<void> => {
  if (!user) {
    useUserSettingsStore.getState().reset();
    return;
  }
  const record = await db.user_settings.get({ user_id: user.id });
  useUserSettingsStore.getState().set(record?.settings ?? {});
};

export const initDexieBridge = (db: QmsDb): (() => void) => {
  const recompute = async (): Promise<void> => {
    const user = await refreshCurrentUser(db);
    useCurrentUserStore.getState().set(user);
    const permissions = await refreshPermissions(db, user);
    usePermissionsStore.getState().set(permissions);
    await refreshUserSettings(db, user);
  };

  const trigger = createDebouncer(() => {
    void recompute();
  }, DEBOUNCE_MS);

  const offs: Unsubscribe[] = [
    subscribeTable(db.current_user as unknown as HookCarrier<ICurrentUser>, trigger.trigger),
    subscribeTable(db.users as unknown as HookCarrier<unknown>, trigger.trigger),
    subscribeTable(db.roles as unknown as HookCarrier<Role>, trigger.trigger),
    subscribeTable(db.user_settings as unknown as HookCarrier<unknown>, trigger.trigger),
  ];

  void recompute();

  return () => {
    trigger.dispose();
    for (const off of offs) off();
  };
};
