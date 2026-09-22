import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Inizializzazione Firestore in memoria per garantire piena stabilita multi-scheda e multi-dispositivo
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, firebaseConfig.firestoreDatabaseId);

/**
 * Pulisce ricorsivamente un oggetto da salvare in Firestore eliminando
 * categoricamente tutti i campi con valore 'undefined' che manderebbero in crash Firestore.
 */
export function sanitizeFirestorePayload<T = any>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestorePayload(item)) as any;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = sanitizeFirestorePayload(value);
      }
    }
    return clean as any;
  }
  return data;
}


