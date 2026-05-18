import { UserIdSchema as User } from 'shared/api-types';

export function normalizeUserStatus(user: User): User {
  if (user.status.reason_id) {
    return user;
  }

  return {
    ...user,
    status: {
      ...user.status,
      reason_id: user.status.value,
    },
  };
}
