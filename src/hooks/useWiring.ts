import * as React from 'react'
import { collection, limit, onSnapshot, query } from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from '@/firebaseConfig'
import { useConnectivity } from '@/stores/connectivityStore'
import { flushOfflineQueue } from '@/services/workOrders'

/**
 * Tracks real Firestore connectivity (not just navigator.onLine) by
 * listening to snapshot metadata (`fromCache`, `hasPendingWrites`).
 */
export function useFirestoreStatus() {
  const setFirestoreConnected = useConnectivity((s) => s.setFirestoreConnected)
  const setPendingWrites = useConnectivity((s) => s.setPendingWrites)
  const setLastSync = useConnectivity((s) => s.setLastSync)

  React.useEffect(() => {
    if (!isFirebaseConfigured()) return
    const db = getDb()
    const q = query(collection(db, 'monitoring'), limit(1))
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setFirestoreConnected(!snap.metadata.fromCache)
        const pending = snap.metadata.hasPendingWrites ? 1 : 0
        setPendingWrites(pending)
        if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
          setLastSync(Date.now())
        }
      },
      () => {
        setFirestoreConnected(false)
      },
    )
    return unsub
  }, [setFirestoreConnected, setLastSync, setPendingWrites])
}

/**
 * Flushes the local offline work-order queue every time the browser or
 * Firestore connection returns.
 */
export function useOfflineSync() {
  const online = useConnectivity((s) => s.online)
  const firestoreConnected = useConnectivity((s) => s.firestoreConnected)

  React.useEffect(() => {
    if (!isFirebaseConfigured()) return
    if (online && firestoreConnected) {
      void flushOfflineQueue()
    }
  }, [online, firestoreConnected])
}