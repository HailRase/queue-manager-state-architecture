/**
 * Purpose: Web Worker — WebSocket client, Dexie batched flush, Zustand sync batches.
 * Inputs: `CONNECT` URL, `SEND_SIMULATED` message batches, server JSON frames.
 * Outputs: `WorkerToMain` (`OPEN`, `CLOSE`, `ENTITY_BATCH`, errors).
 */
/// <reference lib="webworker" />

import { db } from '../db/schema';
import type { EntityName } from '../constants/entityNames';
import type { EntityRowMap } from '../domain/entityRows';
import {
  parseWsEntityMessage,
  type WsEntityMessage,
} from '../domain/entityMessages';
import type { MainToWorker, WorkerToMain } from './wireTypes';
import type { Table } from 'dexie';

const MAX_RECONNECT = 12;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let isReconnecting = false;
let maxReconnectsReached = false;
let flushIntervalId: ReturnType<typeof setInterval> | undefined;
let mainTimer: ReturnType<typeof setTimeout> | null = null;

type Cache = Partial<
  Record<EntityName, { data: Record<string, EntityRowMap[EntityName]> }>
>;

let cache: Cache = {};
const pendingMain: WsEntityMessage[] = [];

function post(msg: WorkerToMain): void {
  self.postMessage(msg);
}

function tableFor<E extends EntityName>(entity: E): Table<EntityRowMap[E]> {
  return db[entity] as Table<EntityRowMap[E]>;
}

function scheduleMainFlush(): void {
  if (mainTimer !== null) {
    return;
  }
  mainTimer = setTimeout(() => {
    mainTimer = null;
    const batch = pendingMain.splice(0, pendingMain.length);
    if (batch.length > 0) {
      post({ type: 'ENTITY_BATCH', data: batch });
    }
  }, 0);
}

function queueMain(msg: WsEntityMessage): void {
  pendingMain.push(msg);
  scheduleMainFlush();
}

function updateCacheAndDb(msg: WsEntityMessage): void {
  const entity = msg.entity;

  switch (msg.action) {
    case 'query':
      return;

    case 'delete': {
      void tableFor(entity).delete(msg.payload);
      return;
    }

    case 'put':
    case 'add': {
      let slice = cache[entity];
      if (!slice) {
        slice = { data: {} };
        cache[entity] = slice;
      }
      slice.data[msg.payload.id] = msg.payload;
      return;
    }

    case 'bulkPut':
    case 'bulkAdd': {
      let slice = cache[entity];
      if (!slice) {
        slice = { data: {} };
        cache[entity] = slice;
      }
      const bucket = slice.data;
      for (const row of msg.payload) {
        if (msg.action === 'bulkAdd' && row.id in bucket) {
          continue;
        }
        bucket[row.id] = row;
      }
      return;
    }
  }
}

function handleParsedMessage(msg: WsEntityMessage): void {
  updateCacheAndDb(msg);
  queueMain(msg);
}

async function flushCacheOnce(): Promise<void> {
  if (Object.keys(cache).length === 0) {
    return;
  }
  const snapshot = cache;
  cache = {};

  for (const entity of Object.keys(snapshot) as EntityName[]) {
    const slice = snapshot[entity];
    if (!slice) {
      continue;
    }
    const items = Object.values(slice.data);
    if (items.length === 0) {
      continue;
    }
    try {
      await tableFor(entity).bulkPut(items);
    } catch {
      const prev = cache[entity]?.data ?? {};
      for (const row of items) {
        prev[row.id] = row;
      }
      cache[entity] = { data: prev };
    }
  }
}

function processSocketPayload(raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return;
  }

  const msg = parseWsEntityMessage(parsed);
  if (msg) {
    handleParsedMessage(msg);
  }
}

function connectWebSocket(url: string): void {
  const reconnect = (u: string) => {
    if (isReconnecting || maxReconnectsReached) {
      return;
    }
    isReconnecting = true;
    reconnectAttempts += 1;
    if (reconnectAttempts > MAX_RECONNECT) {
      maxReconnectsReached = true;
      post({ type: 'MAX_RECONNECTS_REACHED' });
      return;
    }
    setTimeout(() => {
      connectWebSocket(u);
    }, 5000);
  };

  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempts = 0;
    maxReconnectsReached = false;
    isReconnecting = false;
    flushIntervalId = setInterval(() => {
      void flushCacheOnce();
    }, 150);
    post({ type: 'OPEN' });
  };

  ws.onclose = () => {
    if (flushIntervalId !== undefined) {
      clearInterval(flushIntervalId);
      flushIntervalId = undefined;
    }
    post({ type: 'CLOSE' });
    reconnect(url);
  };

  ws.onerror = (e) => {
    isReconnecting = false;
    post({ type: 'ERROR', data: e });
    post({ type: 'CLOSE' });
    reconnect(url);
  };

  ws.onmessage = (ev: MessageEvent) => {
    processSocketPayload(String(ev.data));
  };
}

self.onmessage = (event: MessageEvent<MainToWorker>) => {
  const message = event.data;
  switch (message.type) {
    case 'CONNECT':
      if (message.data.length > 0) {
        connectWebSocket(message.data);
      }
      break;
    case 'DISCONNECT':
      if (flushIntervalId !== undefined) {
        clearInterval(flushIntervalId);
        flushIntervalId = undefined;
      }
      ws?.close();
      ws = null;
      break;
    case 'SEND_SIMULATED':
      for (const m of message.data) {
        handleParsedMessage(m);
      }
      void flushCacheOnce();
      break;
  }
};

export {};
