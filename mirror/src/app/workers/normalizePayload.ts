export const normalizePayload = <T>(payload): T[] => {
  const value = payload?.items ?? payload?.data ?? payload;

  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value !== null) {
    return [value as T];
  }

  return [];
};
