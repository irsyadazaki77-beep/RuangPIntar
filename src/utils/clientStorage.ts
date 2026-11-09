/**
 * Client-Side Offline-First Persistence using IndexedDB with localStorage fallback.
 * Stores downloaded module chunk indices and binary WebRTC ArrayBuffer payloads
 * so student download progress survives browser tab reloads and offline sessions.
 */

const IDB_NAME = 'RuangPintarEdgeIDB';
const IDB_VERSION = 1;
const STORE_CHUNKS_META = 'peer_chunks_meta';
const STORE_BINARY_BLOBS = 'binary_chunks';
const LS_FALLBACK_KEY = 'ruangpintar_edge_peer_chunks_v1';
export const CUSTOM_HOST_URL_STORAGE_KEY = 'ruangpintar_custom_host_url';

export function saveCustomHostUrl(url: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    window.localStorage.setItem(CUSTOM_HOST_URL_STORAGE_KEY, cleanUrl);
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCustomHostUrl(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(CUSTOM_HOST_URL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearCustomHostUrl(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(CUSTOM_HOST_URL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export interface StoredBinaryChunkRecord {
  key: string; // `${moduleId}:${chunkIndex}`
  moduleId: string;
  chunkIndex: number;
  chunkHash: string;
  fromPeerId: string;
  byteLength: number;
  payloadText: string;
  savedAt: number;
}

function openEdgeDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_CHUNKS_META)) {
          db.createObjectStore(STORE_CHUNKS_META);
        }
        if (!db.objectStoreNames.contains(STORE_BINARY_BLOBS)) {
          db.createObjectStore(STORE_BINARY_BLOBS, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveClientDownloadedChunks(
  peerId: string,
  moduleChunks: Record<string, number[]>
): Promise<void> {
  // Always mirror to localStorage for instant synchronous fallback
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        `${LS_FALLBACK_KEY}_${peerId}`,
        JSON.stringify(moduleChunks)
      );
    } catch {
      // Ignore quota errors
    }
  }

  const db = await openEdgeDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_CHUNKS_META, 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS_META);
      store.put(moduleChunks, peerId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function loadClientDownloadedChunks(
  peerId: string
): Promise<Record<string, number[]> | null> {
  const db = await openEdgeDatabase();
  if (db) {
    const idbResult = await new Promise<Record<string, number[]> | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_CHUNKS_META, 'readonly');
        const store = tx.objectStore(STORE_CHUNKS_META);
        const req = store.get(peerId);
        req.onsuccess = () => {
          db.close();
          resolve((req.result as Record<string, number[]>) || null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
    if (idbResult) return idbResult;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(`${LS_FALLBACK_KEY}_${peerId}`);
      if (raw) {
        return JSON.parse(raw) as Record<string, number[]>;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

export async function saveBinaryChunkRecord(record: StoredBinaryChunkRecord): Promise<void> {
  const db = await openEdgeDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BINARY_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BINARY_BLOBS);
      store.put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}
