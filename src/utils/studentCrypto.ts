/**
 * Client-Side Cryptographic Device Identity using Web Crypto API (ECDSA P-256).
 * Signs student quiz submissions and discussion posts to prevent student impersonation
 * on shared local school Wi-Fi without requiring heavy external auth providers.
 */

const KEY_DB_NAME = 'RuangPintarDeviceCryptoIDB';
const KEY_STORE_NAME = 'student_device_keys';
const KEY_PAIR_ID = 'device_signing_keypair_v1';

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function openCryptoKeyDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(KEY_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
          db.createObjectStore(KEY_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

let cachedKeypair: { privateKey: CryptoKey; publicKeyBase64: string } | null = null;

export async function getOrCreateStudentKeypair(): Promise<{
  privateKey: CryptoKey;
  publicKeyBase64: string;
} | null> {
  if (cachedKeypair) return cachedKeypair;
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return null;
  }

  const db = await openCryptoKeyDb();
  if (db) {
    const existing = await new Promise<{
      privateKey: CryptoKey;
      publicKeyBase64: string;
    } | null>((resolve) => {
      try {
        const tx = db.transaction(KEY_STORE_NAME, 'readonly');
        const store = tx.objectStore(KEY_STORE_NAME);
        const req = store.get(KEY_PAIR_ID);
        req.onsuccess = () => {
          if (req.result && req.result.privateKey && req.result.publicKeyBase64) {
            resolve({
              privateKey: req.result.privateKey as CryptoKey,
              publicKeyBase64: req.result.publicKeyBase64 as string,
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    if (existing) {
      cachedKeypair = existing;
      return existing;
    }
  }

  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false, // non-extractable private key for hardware/browser boundary security
      ['sign']
    );

    const spkiDer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = bufferToBase64(spkiDer);

    const result = {
      privateKey: keyPair.privateKey,
      publicKeyBase64,
    };

    if (db) {
      try {
        const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(KEY_STORE_NAME);
        store.put({
          id: KEY_PAIR_ID,
          privateKey: keyPair.privateKey,
          publicKeyBase64,
          created: Date.now(),
        });
      } catch {
        // Suppress storage quota errors
      }
    }

    cachedKeypair = result;
    return result;
  } catch (err) {
    console.warn('[StudentCrypto] Web Crypto key generation failed, running unassisted:', err);
    return null;
  }
}

export async function signStudentPayload(
  payloadString: string
): Promise<{ signatureBase64: string; publicKeyBase64: string } | null> {
  const kp = await getOrCreateStudentKeypair();
  if (!kp || typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);
    const signatureBuffer = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      kp.privateKey,
      data
    );

    return {
      signatureBase64: bufferToBase64(signatureBuffer),
      publicKeyBase64: kp.publicKeyBase64,
    };
  } catch (err) {
    console.warn('[StudentCrypto] Failed to sign payload:', err);
    return null;
  }
}
