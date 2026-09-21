import * as React from 'react'
import { Plus } from 'lucide-react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAssets } from '@/hooks/useAssets'
import { Button } from '@/components/ui/button'
import { WorkOrderKanban } from '@/features/workorders/WorkOrderKanban'
import { WorkOrderFormDialog } from '@/features/workorders/WorkOrderFormDialog'
import type { WorkOrder } from '@/types'

export function WorkOrdersPage() {
  const workOrders = useWorkOrders()
  const assets = useAssets()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WorkOrder | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Work Orders</h2>
          <p className="text-sm text-muted-foreground">
            Drag cards between columns to update status. Works offline.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus /> New work order
        </Button>
      </div>

      <WorkOrderKanban
        workOrders={workOrders}
        onNew={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        onEdit={(wo) => {
          setEditing(wo)
          setFormOpen(true)
        }}
      />

      <WorkOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        assets={assets}
        editing={editing}
      />
    </div>
  )
}