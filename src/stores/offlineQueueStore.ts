import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OfflineWorkOrderDraft } from '@/types'

interface OfflineQueueState {
  queue: OfflineWorkOrderDraft[]
  enqueue: (draft: OfflineWorkOrderDraft) => void
  remove: (id: string) => void
  clear: () => void
}

/**
 * Local-first queue of work orders created while offline (or failed to
 * write). Every draft is also written to Firestore - the SDK queues the
 * write locally and syncs when connectivity returns. This store gives us
 * a guaranteed local copy + a visible "n pending" indicator.
 */
export const useOfflineQueue = create<OfflineQueueState>()(
  persist(
    (set) => ({
      queue: [],
      enqueue: (draft) => set((state) => ({ queue: [draft, ...state.queue] })),
      remove: (id) =>
        set((state) => ({ queue: state.queue.filter((d) => d.id !== id) })),
      clear: () => set({ queue: [] }),
    }),
    { name: 'ngcmm-offline-queue' },
  ),
)