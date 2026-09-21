import * as React from 'react'
import { GripVertical, Clock, User, Radar, CalendarDays, Gauge, Pencil } from 'lucide-react'
import type { WorkOrder } from '@/types'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/types'
import { cn } from '@/lib/utils'
import { priorityBarClass, triggerLabel } from '@/lib/status'
import { relativeTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const TRIGGER_ICONS = {
  calendar: CalendarDays,
  meter: Gauge,
  iot_sensor: Radar,
  manual: Pencil,
}

interface WorkOrderCardProps {
  workOrder: WorkOrder
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, id: string) => void
  onEdit?: (workOrder: WorkOrder) => void
}

export function WorkOrderCard({ workOrder: wo, draggable, onDragStart, onEdit }: WorkOrderCardProps) {
  const TriggerIcon = TRIGGER_ICONS[wo.triggerType]

  return (
    <div
      draggable={draggable}
      onDragStart={
        draggable && onDragStart ? (e) => onDragStart(e, wo.id) : undefined
      }
      className="group cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-ring/40 active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={cn('flex items-center gap-1.5')}>
          <span className={cn('h-4 w-1 rounded-full', priorityBarClass(wo.priority))} />
          <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {PRIORITY_LABEL[wo.priority]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {wo.offlineCreated && (
            <Badge variant="warning" className="px-1.5 text-[10px]">
              Offline
            </Badge>
          )}
          <GripVertical className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      <p className="text-sm font-medium leading-snug">{wo.title}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{wo.assetName ?? 'Unassigned asset'}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <TriggerIcon className="size-3.5" />
          {triggerLabel(wo.triggerType)}
        </span>
        <span className="inline-flex items-center gap-1">
          <User className="size-3.5" />
          {wo.assignedTo}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {relativeTime(wo.createdAt)}
        </span>
      </div>

      {onEdit && (
        <div className="mt-3 flex items-center justify-between border-t pt-2.5">
          <Badge
            variant={
              wo.status === 'completed'
                ? 'success'
                : wo.status === 'in_progress'
                  ? 'info'
                  : 'muted'
            }
          >
            {STATUS_LABEL[wo.status]}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(wo)}>
            <Pencil className="size-3" /> Edit
          </Button>
        </div>
      )}
    </div>
  )
}

export function DraggableColumn({
  status,
  label,
  accent,
  onDrop,
  children,
}: {
  status: string
  label: string
  accent: string
  onDrop: (e: React.DragEvent, status: string) => void
  children: React.ReactNode
}) {
  const [over, setOver] = React.useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onDrop(e, status)
      }}
      className={cn(
        'flex min-h-[70vh] flex-col gap-2 rounded-lg border p-3 transition-colors',
        over ? 'border-primary/60 bg-primary/5' : 'border-border bg-card/40',
      )}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', accent)} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}