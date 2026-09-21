import { orderBy, query, where } from 'firebase/firestore'
import { useCollectionLive } from '@/hooks/useFirestoreLive'
import { workOrdersRef } from '@/services/workOrders'
import type { WorkOrder, WorkOrderStatus } from '@/types'

export function useWorkOrders(): WorkOrder[] {
  return useCollectionLive<WorkOrder>('workorders:all', () =>
    query(workOrdersRef(), orderBy('createdAt', 'desc')),
  )
}

export function useWorkOrdersByAsset(assetId: string): WorkOrder[] {
  const key = `workorders:asset:${assetId}`
  return useCollectionLive<WorkOrder>(key, () =>
    query(
      workOrdersRef(),
      where('assetId', '==', assetId),
      orderBy('createdAt', 'desc'),
    ),
  )
}

export function useWorkOrdersByStatus(status: WorkOrderStatus): WorkOrder[] {
  const key = `workorders:status:${status}`
  return useCollectionLive<WorkOrder>(key, () =>
    query(
      workOrdersRef(),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
    ),
  )
}

/** Cached aggregate for KPI cards. React Query refreshes on mutation. */
export async function fetchWorkOrderStats(): Promise<{
  open: number
  inProgress: number
  completed: number
  critical: number
}> {
  const { getDocs } = await import('firebase/firestore')
  const snap = await getDocs(workOrdersRef())
  let open = 0
  let inProgress = 0
  let completed = 0
  let critical = 0
  snap.forEach((d) => {
    const wo = d.data() as WorkOrder
    if (wo.status === 'open') open++
    if (wo.status === 'in_progress') inProgress++
    if (wo.status === 'completed') completed++
    if (wo.priority === 'critical') critical++
  })
  return { open, inProgress, completed, critical }
}