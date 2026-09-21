import * as React from 'react'
import { Loader2, Save } from 'lucide-react'
import type { Asset, WorkOrder, WorkOrderPriority, WorkOrderTrigger } from '@/types'
import { PRIORITY_LABEL } from '@/types'
import { createWorkOrder, updateWorkOrder } from '@/services/workOrders'
import { notify } from '@/stores/toastStore'
import { useConnectivity } from '@/stores/connectivityStore'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface WorkOrderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: Asset[]
  defaultAssetId?: string
  editing?: WorkOrder | null
  onSaved?: () => void
}

const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABEL) as WorkOrderPriority[]).map((p) => ({
  value: p,
  label: PRIORITY_LABEL[p],
}))

const TRIGGER_OPTIONS: { value: WorkOrderTrigger; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'calendar', label: 'Calendar schedule' },
  { value: 'meter', label: 'Meter reading' },
  { value: 'iot_sensor', label: 'IoT sensor' },
]

export function WorkOrderFormDialog({
  open,
  onOpenChange,
  assets,
  defaultAssetId,
  editing,
  onSaved,
}: WorkOrderFormDialogProps) {
  const online = useConnectivity((s) => s.online)

  const [assetId, setAssetId] = React.useState(defaultAssetId ?? '')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [priority, setPriority] = React.useState<WorkOrderPriority>('medium')
  const [assignedTo, setAssignedTo] = React.useState('')
  const [triggerType, setTriggerType] = React.useState<WorkOrderTrigger>('manual')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setAssetId(editing?.assetId ?? defaultAssetId ?? '')
    setTitle(editing?.title ?? '')
    setDescription(editing?.description ?? '')
    setPriority(editing?.priority ?? 'medium')
    setAssignedTo(editing?.assignedTo ?? '')
    setTriggerType(editing?.triggerType ?? 'manual')
  }, [open, editing, defaultAssetId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !assetId) {
      notify.warning('Incomplete form', 'A title and an asset are required.')
      return
    }
    setBusy(true)
    try {
      const asset = assets.find((a) => a.id === assetId)
      if (editing) {
        await updateWorkOrder(editing.id, {
          assetId,
          assetName: asset?.name,
          title: title.trim(),
          description,
          priority,
          assignedTo: assignedTo.trim() || 'Unassigned',
          triggerType,
        })
        notify.success('Work order updated', title.trim())
      } else {
        const result = await createWorkOrder({
          assetId,
          assetName: asset?.name,
          title: title.trim(),
          description,
          priority,
          assignedTo: assignedTo.trim() || 'Unassigned',
          triggerType,
        })
        if (result.offline && !result.created) {
          notify.warning('Saved offline', 'This work order is queued and will sync when you\'re back online.')
        } else {
          notify.success('Work order created', title.trim())
        }
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      console.error(err)
      notify.error('Save failed', online ? 'Something went wrong while saving.' : 'You are offline - it has been queued locally.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit work order' : 'Create work order'}</DialogTitle>
          <DialogDescription>
            {online
              ? 'Creates a work order in the cloud.'
              : 'You are offline - the work order is saved locally and syncs automatically.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="wo-title">Title</Label>
            <Input
              id="wo-title"
              required
              placeholder="Replace bearing, inspect drive belt…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wo-asset">Asset</Label>
              <Select
                id="wo-asset"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                options={[
                  { value: '', label: 'Select an asset…' },
                  ...assets.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-priority">Priority</Label>
              <Select
                id="wo-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
                options={PRIORITY_OPTIONS}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wo-assign">Assigned to</Label>
              <Input
                id="wo-assign"
                placeholder="Technician name"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-trigger">Trigger</Label>
              <Select
                id="wo-trigger"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as WorkOrderTrigger)}
                options={TRIGGER_OPTIONS}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wo-desc">Description</Label>
            <Textarea
              id="wo-desc"
              placeholder="Symptoms, safety notes, tools required…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="px-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {editing ? 'Save changes' : online ? 'Create work order' : 'Queue locally'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}