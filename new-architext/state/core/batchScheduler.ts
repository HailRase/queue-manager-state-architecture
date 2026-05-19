type FlushHandler<T> = (items: T[]) => void;

export interface MessageBatcherOptions<T> {
  flushIntervalMs: number;
  maxQueueSize: number;
  onFlush: FlushHandler<T>;
  /** Collapse queue before flush (e.g. last message per key). */
  coalesce?: (items: T[]) => T[];
}

/**
 * Buffers high-frequency events and flushes on a timer.
 * Uses requestAnimationFrame when interval aligns with ~16ms, else setTimeout.
 */
export function createMessageBatcher<T>(options: MessageBatcherOptions<T>) {
  let queue: T[] = [];
  let scheduled = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let destroyed = false;

  const runFlush = () => {
    scheduled = false;
    timerId = null;
    rafId = null;
    if (queue.length === 0) return;

    const batch = queue;
    queue = [];
    const payload = options.coalesce ? options.coalesce(batch) : batch;
    if (payload.length > 0) {
      options.onFlush(payload);
    }
  };

  const schedule = () => {
    if (scheduled || destroyed) return;
    scheduled = true;

    if (options.flushIntervalMs <= 20 && typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(runFlush);
      return;
    }

    timerId = setTimeout(runFlush, options.flushIntervalMs);
  };

  const flushNow = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    scheduled = false;
    runFlush();
  };

  return {
    push(item: T) {
      if (destroyed) return;
      queue.push(item);
      if (queue.length >= options.maxQueueSize) {
        flushNow();
        return;
      }
      schedule();
    },
    pushMany(items: T[]) {
      if (destroyed || items.length === 0) return;
      queue.push(...items);
      if (queue.length >= options.maxQueueSize) {
        flushNow();
        return;
      }
      schedule();
    },
    flushNow,
    destroy() {
      destroyed = true;
      flushNow();
      queue = [];
    },
    get queueSize() {
      return queue.length;
    },
  };
}
