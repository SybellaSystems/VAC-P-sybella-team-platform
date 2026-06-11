'use client';

import { useCallback, useEffect, useState } from 'react';
import { getOfflineQueue, syncOfflineQueue } from '@/lib/offline';

const isBrowser = () => typeof window !== 'undefined';

export function useOfflineSync() {
  const [online, setOnline] = useState(isBrowser() ? navigator.onLine : true);
  const [queue, setQueue] = useState(getOfflineQueue());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refreshQueue = useCallback(() => setQueue(getOfflineQueue()), []);

  const attemptSync = useCallback(async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      refreshQueue();
      if (result.synced > 0) {
        setLastSyncedAt(new Date().toISOString());
      }
    } finally {
      setSyncing(false);
    }
  }, [online, refreshQueue, syncing]);

  useEffect(() => {
    if (!isBrowser()) return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (online) {
      void attemptSync();
    }
  }, [online, attemptSync]);

  return {
    isOnline: online,
    queue,
    syncing,
    lastSyncedAt,
    refreshQueue,
    attemptSync,
  };
}
