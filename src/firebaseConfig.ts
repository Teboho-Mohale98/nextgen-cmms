import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

/**
 * Firebase config sourced from Vite env vars (`VITE_FIREBASE_*`).
 * See `.env.example`. When these are not configured the app renders
 * an inline setup wizard (see `pages/SetupPage.tsx`).
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
} as const

export const isFirebaseConfigured = (): boolean => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let _app: FirebaseApp | null = null
let _db: Firestore | null = null

function getApp(): FirebaseApp {
  if (_app) return _app
  if (getApps().length) {
    _app = getApps()[0]
    return _app
  }
  _app = initializeApp(firebaseConfig)
  return _app
}

/**
 * Initializes Firestore with IndexedDB offline persistence.
 * Backs off to an in-memory instance when a persistence tab is already
 * locked, or the environment does not support IndexedDB (opaque origins,
 * private browsing, etc.).
 */
export function getDb(): Firestore {
  if (_db) return _db
  const current = getApp()

  try {
    _db = initializeFirestore(current, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch (e) {
    // Already initialized previously (HMR), or persistence unavailable.
    _db = getFirestore(current)
  }
  return _db
}

export const app: FirebaseApp = getApp()
export const db: Firestore = getDb()
export const auth: Auth = getAuth(app)
export const storage: FirebaseStorage = getStorage(app)

/** True when the browser supports IndexedDB-backed offline cache. */
export const supportsOfflineCache = typeof indexedDB !== 'undefined'

export default app