/**
 * - purpose: coalesce hot-path items into one flush per window
 * - inputs: flush callback (T[]) => void, optional window in ms (default 100)
 * - outputs: { push, flushNow, dispose, size }
 * - invariant: at most one pending timer; flushNow drains immediately
 * - usage: shared single instance inside wsBridge for all hot-path streams
 */

export interface Batcher<T> {
  push: (item: T) => void;
  pushMany: (items: readonly T[]) => void;
  flushNow: () => void;
  dispose: () => void;
  size: () => number;
}

const DEFAULT_WINDOW_MS = 100;

export const createBatcher = <T>(
  flush: (items: T[]) => void,
  windowMs: number = DEFAULT_WINDOW_MS
): Batcher<T> => {
  let buffer: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const drain = (): void => {
    timer = null;
    if (buffer.length === 0) return;
    const items = buffer;
    buffer = [];
    flush(items);
  };

  const schedule = (): void => {
    if (disposed || timer !== null) return;
    timer = setTimeout(drain, windowMs);
  };

  return {
    push: (item: T): void => {
      if (disposed) return;
      buffer.push(item);
      schedule();
    },
    pushMany: (items: readonly T[]): void => {
      if (disposed || items.length === 0) return;
      buffer.push(...items);
      schedule();
    },
    flushNow: (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      drain();
    },
    dispose: (): void => {
      disposed = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      buffer = [];
    },
    size: (): number => buffer.length,
  };
};
