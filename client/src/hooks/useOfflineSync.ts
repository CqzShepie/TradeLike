import { useCallback, useEffect, useMemo, useState } from "react";

import { apiClient, getToken } from "../services/apiClient";

const OUTBOX_KEY = "tradelike_delta_outbox";
const CONFLICTS_KEY = "tradelike_delta_conflicts";
const CURSOR_KEY = "tradelike_delta_cursor";
const SERVICE_WORKER_URL = "/sw.ts";
const SYNC_TAG = "tl-delta";
const SYNC_INTERVAL_MS = 30_000;

export interface OfflineMutation {
  clientChangeId: string;
  type: "customer" | "job" | "quote" | string;
  action: "upsert" | "delete" | string;
  id?: number | null;
  localId?: string | null;
  baseVersion?: string | null;
  payload: Record<string, unknown>;
}

export interface OfflineConflict {
  clientChangeId?: string | null;
  type: string;
  id?: number | null;
  localId?: string | null;
  reason: string;
  serverChange?: SyncChange | null;
}

export interface SyncChange {
  clientChangeId?: string | null;
  type: string;
  action: string;
  id?: number | null;
  localId?: string | null;
  version: string;
  changedAt: string;
  payload: Record<string, unknown>;
}

interface SyncPullResponse {
  cursor: string;
  changes: SyncChange[];
  tombstones: SyncChange[];
  conflicts: OfflineConflict[];
  pending: number;
}

interface SyncPushResponse {
  cursor: string;
  applied: SyncChange[];
  conflicts: OfflineConflict[];
  pending: number;
}

interface UseOfflineSyncOptions {
  enabled?: boolean;
  apiBaseUrl?: string;
}

type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
};

export function enqueueOfflineChange(change: Omit<OfflineMutation, "clientChangeId"> & { clientChangeId?: string }) {
  const outbox = readOfflineOutbox();
  const nextChange: OfflineMutation = {
    ...change,
    clientChangeId: change.clientChangeId ?? createClientChangeId(),
  };

  writeOfflineOutbox([...outbox, nextChange]);
  window.dispatchEvent(new CustomEvent("tradelike:offline-queue-changed"));

  return nextChange;
}

export function readOfflineOutbox(): OfflineMutation[] {
  return readJson<OfflineMutation[]>(OUTBOX_KEY, []);
}

export function readOfflineConflicts(): OfflineConflict[] {
  return readJson<OfflineConflict[]>(CONFLICTS_KEY, []);
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pendingCount, setPendingCount] = useState(() => readOfflineOutbox().length);
  const [conflicts, setConflicts] = useState<OfflineConflict[]>(() => readOfflineConflicts());
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const enabled = options.enabled ?? true;

  const refreshLocalState = useCallback(() => {
    setPendingCount(readOfflineOutbox().length);
    setConflicts(readOfflineConflicts());
  }, []);

  const syncNow = useCallback(async () => {
    if (!enabled || isSyncing || !navigator.onLine) {
      refreshLocalState();
      return;
    }

    setIsSyncing(true);

    try {
      const outbox = readOfflineOutbox();

      if (outbox.length > 0) {
        const pushResponse = await apiClient.post<SyncPushResponse>("/sync/changes", {
          lastPulledCursor: localStorage.getItem(CURSOR_KEY),
          changes: outbox,
        });

        localStorage.setItem(CURSOR_KEY, pushResponse.cursor);
        writeOfflineOutbox(removeAppliedChanges(outbox, pushResponse.applied, pushResponse.conflicts));
        writeOfflineConflicts(pushResponse.conflicts);
      }

      const cursor = localStorage.getItem(CURSOR_KEY);
      const pullResponse = await apiClient.get<SyncPullResponse>(
        `/sync/changes${cursor ? `?since=${encodeURIComponent(cursor)}` : ""}`
      );

      localStorage.setItem(CURSOR_KEY, pullResponse.cursor);
      dispatchSyncChanges([...pullResponse.changes, ...pullResponse.tombstones]);

      if (pullResponse.conflicts.length > 0) {
        writeOfflineConflicts(pullResponse.conflicts);
      }

      setLastSyncedAt(new Date());
    } finally {
      setIsSyncing(false);
      refreshLocalState();
    }
  }, [enabled, isSyncing, refreshLocalState]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleOnline() {
      setIsOnline(true);
      void syncNow();
    }

    function handleOffline() {
      setIsOnline(false);
      refreshLocalState();
    }

    function handleQueueChanged() {
      refreshLocalState();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("tradelike:offline-queue-changed", handleQueueChanged);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("tradelike:offline-queue-changed", handleQueueChanged);
    };
  }, [enabled, refreshLocalState, syncNow]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      void syncNow();
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, syncNow]);

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    async function registerServiceWorker() {
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
      const syncRegistration = registration as SyncCapableRegistration;

      if (cancelled) {
        return;
      }

      await syncRegistration.sync?.register(SYNC_TAG).catch(() => undefined);
      await syncRegistration.periodicSync?.register(SYNC_TAG, { minInterval: SYNC_INTERVAL_MS }).catch(() => undefined);

      const worker = navigator.serviceWorker.controller ??
        registration.active ??
        registration.waiting ??
        registration.installing;

      worker?.postMessage({
        type: "TL_DELTA_CONFIG",
        apiBaseUrl: options.apiBaseUrl ?? getApiBaseUrl(),
        token: getToken(),
        cursor: localStorage.getItem(CURSOR_KEY),
      });
    }

    void registerServiceWorker();

    return () => {
      cancelled = true;
    };
  }, [enabled, options.apiBaseUrl]);

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) {
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "TL_DELTA_TICK") {
        void syncNow();
      }

      if (event.data?.type === "TL_DELTA_CHANGES" && event.data.payload) {
        const payload = event.data.payload as SyncPullResponse;
        localStorage.setItem(CURSOR_KEY, payload.cursor);
        dispatchSyncChanges([...payload.changes, ...payload.tombstones]);
        refreshLocalState();
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [enabled, refreshLocalState, syncNow]);

  const clearConflicts = useCallback(() => {
    writeOfflineConflicts([]);
    setConflicts([]);
  }, []);

  return useMemo(() => ({
    isOnline,
    isSyncing,
    pendingCount,
    conflicts,
    lastSyncedAt,
    syncNow,
    clearConflicts,
  }), [clearConflicts, conflicts, isOnline, isSyncing, lastSyncedAt, pendingCount, syncNow]);
}

function removeAppliedChanges(
  outbox: OfflineMutation[],
  applied: SyncChange[],
  conflicts: OfflineConflict[]
) {
  const completedIds = new Set([
    ...applied.map(change => change.clientChangeId).filter(Boolean),
    ...conflicts.map(conflict => conflict.clientChangeId).filter(Boolean),
  ]);

  return outbox.filter(change => !completedIds.has(change.clientChangeId));
}

function dispatchSyncChanges(changes: SyncChange[]) {
  if (changes.length === 0) {
    return;
  }

  window.dispatchEvent(new CustomEvent("tradelike:delta-sync", { detail: { changes } }));
}

function writeOfflineOutbox(outbox: OfflineMutation[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

function writeOfflineConflicts(conflicts: OfflineConflict[]) {
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") {
    return fallback;
  }

  const raw = localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function createClientChangeId() {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");
}
