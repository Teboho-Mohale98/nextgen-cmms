import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { uid } from '@/lib/utils'
import { useOfflineQueue } from '@/stores/offlineQueueStore'
import { notify } from '@/stores/toastStore'
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus } from '@/types'

export function workOrdersRef() {
  return collection(db, 'workorders')
}

export interface NewWorkOrderInput {
  assetId: string
  assetName?: string
  title: string
  description?: string
  priority: WorkOrderPriority
  assignedTo: string
  triggerType: WorkOrder['triggerType']
}

export interface CreateWorkOrderResult {
  id: string
  created: boolean
  offline: boolean
}

/**
 * Creates a work order using a locally-generated id (setDoc) so the
 * offline queue can be reconciled by id when connectivity returns.
 *
 * - online:  write is written directly (may still queue locally while a
 *            snapshot is in flight).
 * - offline: the SDK queues the write locally and we mirror it into the
 *            local queue store for a visible "pending sync" indicator.
 */
export async function createWorkOrder(
  input: NewWorkOrderInput,
  opts: { offline?: boolean } = {},
): Promise<CreateWorkOrderResult> {
  const id = uid('wo')
  const now = new Date().toISOString()
  const payload: WorkOrder = {
    id,
    assetId: input.assetId,
    assetName: input.assetName,
    title: input.title,
    description: input.description,
    priority: input.priority,
    status: 'open',
    assignedTo: input.assignedTo,
    triggerType: input.triggerType,
    offlineCreated: opts.offline ?? !navigator.onLine,
    createdAt: now,
    completedAt: null,
    updatedAt: now,
  }

  let created = false
  try {
    await setDoc(doc(db, 'workorders', id), payload)
    created = true
  } catch (err) {
    // Write failed (likely unreachable backend) - keep the local draft.
    console.warn('[cmms] write queued or failed locally', err)
  }

  const wasOffline = opts.offline || !navigator.onLine || !created
  if (wasOffline) {
    useOfflineQueue.getState().enqueue({
      id,
      createdAt: Date.now(),
      queuedAt: Date.now(),
      payload,
    })
  }

  return { id, created, offline: wasOffline }
}

export async function updateWorkOrderStatus(
  id: string,
  status: WorkOrderStatus,
  extra: Partial<WorkOrder> = {},
): Promise<void> {
  const now = new Date().toISOString()
  await updateDoc(doc(db, 'workorders', id), {
    status,
    completedAt: status === 'completed' ? now : null,
    updatedAt: now,
    ...extra,
  })
}

export async function updateWorkOrder(id: string, patch: Partial<WorkOrder>): Promise<void> {
  await updateDoc(doc(db, 'workorders', id), {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteWorkOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, 'workorders', id))
}

/**
 * Reconciles locally-queued work orders against Firestore. Runs on
 * reconnect (see `useOfflineSync`). Entries whose doc now exists are
 * dropped from the queue; remaining entries are re-pushed.
 */
export async function flushOfflineQueue(): Promise<void> {
  const { queue, remove, clear } = useOfflineQueue.getState()
  if (!queue.length) return

  let synced = 0
  let failed = 0

  for (const draft of queue) {
    try {
      await setDoc(doc(db, 'workorders', draft.id), {
        ...draft.payload,
        updatedAt: new Date().toISOString(),
      })
      remove(draft.id)
      synced++
    } catch (err) {
      failed++
      console.warn('[cmms] flush failed for', draft.id, err)
    }
  }

  if (queue.length > 0 && failed === 0) clear()

  if (synced > 0) {
    notify.success('Offline work orders synced', `${synced} work order${synced > 1 ? 's' : ''} pushed to the cloud.`)
  } else if (failed > 0) {
    notify.warning('Sync incomplete', `${failed} work order${failed > 1 ? 's' : ''} still waiting. You are offline.`)
  }
}