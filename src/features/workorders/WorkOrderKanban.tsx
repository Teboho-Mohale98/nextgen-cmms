import * as React from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { ClipboardList } from 'lucide-react'
import type { WorkOrder } from '@/types'
import { WORK_ORDER_STATUSES, STATUS_LABEL, type WorkOrderStatus } from '@/types'
import { updateWorkOrderStatus } from '@/services/workOrders'
import { notify } from '@/stores/toastStore'
import { useConnectivity } from '@/stores/connectivityStore'
import { WorkOrderCard, DraggableColumn } from '@/features/workorders/WorkOrderCard'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const COLUMN_ACCENT: Record<WorkOrderStatus, string> = {
  open: 'bg-muted-foreground',
  in_progress: 'bg-info',
  completed: 'bg-success',
}

interface WorkOrderKanbanProps {
  workOrders: WorkOrder[]
  onEdit: (wo: WorkOrder) => void
  onNew: () => void
}

export function WorkOrderKanban({ workOrders, onEdit, onNew }: WorkOrderKanbanProps) {
  const online = useConnectivity((s) => s.online)
  const dragId = React.useRef<string | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')

  const handleDrop = async (
    e: React.DragEvent,
    status: WorkOrderStatus | '',
  ) => {
    e.preventDefault()
    const id = dragId.current ?? e.dataTransfer.getData('text/plain')
    if (!id || !status) return
    handleDropStatus(id, status)
  }

  const handleDropStatus = async (woId: string, status: WorkOrderStatus) => {
    const wo = workOrders.find((w) => w.id === woId)
    if (!wo || wo.status === status) return
    if (!online) {
      notify.warning('Offline', 'Status change queued - it syncs when connectivity returns.')
    }
    try {
      await updateWorkOrderStatus(woId, status)
    } catch (err) {
      console.error(err)
      notify.error('Update failed', 'Could not update the work order status.')
    }
  }

  const renderCol = (status: WorkOrderStatus) => {
    const items = workOrders.filter((w) => w.status === status)
    return (
      <DraggableColumn
        key={status}
        status={status}
        label={`${STATUS_LABEL[status]} · ${items.length}`}
        accent={COLUMN_ACCENT[status]}
        onDrop={(e, s) => handleDrop(e, s as WorkOrderStatus)}
      >
        {items.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Drop work orders here
          </div>
        ) : (
          items.map((wo) => (
            <WorkOrderCard
              key={wo.id}
              workOrder={wo}
              draggable
              onDragStart={(e, id) => {
                dragId.current = id
                e.dataTransfer.setData('text/plain', id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onEdit={onEdit}
            />
          ))
        )}
      </DraggableColumn>
    )
  }

  if (workOrders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No work orders yet"
        description="Create your first work order, or load the demo dataset from Settings."
        action={
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={onNew}
          >
            Create work order
          </button>
        }
      />
    )
  }

  if (isMobile) {
    return <div className="flex flex-col gap-4">{WORK_ORDER_STATUSES.map(renderCol)}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {WORK_ORDER_STATUSES.map(renderCol)}
    </div>
  )
}