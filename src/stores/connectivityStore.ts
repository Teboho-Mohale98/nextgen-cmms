import { create } from 'zustand'

interface ConnectivityState {
  online: boolean
  firestoreConnected: boolean
  pendingWrites: number
  offlineMode: boolean
  lastSyncAt: number | null
  setOnline: (online: boolean) => void
  setFirestoreConnected: (connected: boolean) => void
  setPendingWrites: (count: number) => void
  setLastSync: (ts: number | null) => void
}

/**
 * Tracks browser `online/offline`, Firestore connection state and the
 * number of locally queued writes. Powers the header connectivity badge
 * and the "sync" affordances throughout the app.
 */
export const useConnectivity = create<ConnectivityState>((set, get) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  firestoreConnected: false,
  pendingWrites: 0,
  offlineMode: false,
  lastSyncAt: null,
  setOnline: (online) =>
    set({
      online,
      offlineMode: !online || (!online && !get().firestoreConnected),
    }),
  setFirestoreConnected: (connected) =>
    set({
      firestoreConnected: connected,
      offlineMode: !connected && !get().online,
    }),
  setPendingWrites: (pendingWrites) => set({ pendingWrites }),
  setLastSync: (lastSyncAt) => set({ lastSyncAt }),
}))

/** Real-time browser connectivity listener. Wire once at app root. */
export function initConnectivityListeners(): () => void {
  const { setOnline } = useConnectivity.getState()

  const onOnline = () => setOnline(true)
  const onOffline = () => setOnline(false)

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}