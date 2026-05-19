/** Max UI commit rate for hot WS streams (~30 fps). */
export const HOT_STREAM_FLUSH_MS = 32;

/** Dexie worker already flushes at 150ms; in-memory stores can be faster. */
export const TABLE_STREAM_FLUSH_MS = 48;

/** Force flush when queue grows (burst protection). */
export const MAX_BATCH_QUEUE_SIZE = 2_000;

/** calls_statistics retention aligned with wsWorker filter. */
export const CALLS_STATISTICS_TTL_MS = 24 * 60 * 60 * 1000;
