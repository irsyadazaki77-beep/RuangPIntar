import { useState, useEffect, useCallback, useRef } from 'react';
import type { StudentSubmission } from '../utils/edgeEngine';
import { useMeshNetwork } from '../context/MeshNetworkContext';

const OFFLINE_QUEUE_KEY = 'ruangpintar_offline_pending_submissions_v1';

export function useOfflineSync() {
  const { isOfflineActive, applyServerState, setStatusBanner } = useMeshNetwork();
  const [pendingQueue, setPendingQueue] = useState<StudentSubmission[]>(() => {
    try {
      const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const flushingRef = useRef(false);

  // Persist queue updates to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pendingQueue));
    } catch {}
  }, [pendingQueue]);

  const queueSubmission = useCallback((sub: StudentSubmission) => {
    setPendingQueue((prev) => {
      // Avoid duplicate sub IDs
      const filtered = prev.filter((item) => item.id !== sub.id);
      return [...filtered, sub];
    });
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushingRef.current || isOfflineActive || pendingQueue.length === 0) return;
    flushingRef.current = true;
    setIsSyncingPending(true);

    try {
      const itemsToSync = [...pendingQueue];
      let syncedCount = 0;
      const failedItems: StudentSubmission[] = [];

      for (const item of itemsToSync) {
        try {
          const res = await fetch('/api/students/sync-submission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.state) applyServerState(data.state);
            syncedCount++;
          } else {
            failedItems.push(item);
          }
        } catch {
          failedItems.push(item);
        }
      }

      setPendingQueue(failedItems);

      if (syncedCount > 0) {
        setStatusBanner(
          `Sinkronisasi Otomatis Sukses: ${syncedCount} nilai kuis offline berhasil dikirim ke Simpul Guru!`
        );
      }
    } finally {
      setIsSyncingPending(false);
      flushingRef.current = false;
    }
  }, [applyServerState, isOfflineActive, pendingQueue, setStatusBanner]);

  // Auto flush when coming back online
  useEffect(() => {
    if (!isOfflineActive && pendingQueue.length > 0) {
      void flushQueue();
    }
  }, [flushQueue, isOfflineActive, pendingQueue.length]);

  return {
    pendingQueue,
    pendingCount: pendingQueue.length,
    isSyncingPending,
    queueSubmission,
    flushQueue,
  };
}
