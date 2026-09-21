import * as React from 'react'
import { Loader2, Save } from 'lucide-react'
import type { Asset, MaintenanceSchedule } from '@/types'
import { createSchedule, updateSchedule } from '@/services/schedules'
import { notify } from '@/stores/toastStore'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ScheduleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: Asset[]
  editing?: MaintenanceSchedule | null
}

export function ScheduleFormDialog({ open, onOpenChange, assets, editing }: ScheduleFormDialogProps) {
  const [assetId, setAssetId] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [frequencyDays, setFrequencyDays] = React.useState('30')
  const [meterInterval, setMeterInterval] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setAssetId(editing?.assetId ?? '')
    setTitle(editing?.title ?? '')
    setFrequencyDays(String(editing?.frequencyDays ?? 30))
    setMeterInterval(editing?.meterInterval ? String(editing.meterInterval) : '')
  }, [open, editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !assetId) {
      notify.warning('Incomplete form', 'Choose an asset and describe the task.')
      return
    }
    setBusy(true)
    try {
      const asset = assets.find((a) => a.id === assetId)
      const input = {
        assetId,
        assetName: asset?.name,
        title: title.trim(),
        frequencyDays: Math.max(1, Number(frequencyDays) || 1),
        meterInterval: meterInterval ? Math.max(1, Number(meterInterval) || 1) : null,
      }
      if (editing) {
        await updateSchedule(editing.id, input)
        notify.success('Schedule updated', title.trim())
      } else {
        await createSchedule(input)
        notify.success('Schedule created', title.trim())
      }
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      notify.error('Save failed', 'Could not save the schedule.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit schedule' : 'New maintenance schedule'}</DialogTitle>
          <DialogDescription>
            Preventive maintenance recurs by calendar days or meter intervals.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="sch-title">Task</Label>
            <Input
              id="sch-title"
              required
              placeholder="Quarterly bearing inspection"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sch-asset">Asset</Label>
            <Select
              id="sch-asset"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              options={[
                { value: '', label: 'Select an asset…' },
                ...assets.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sch-days">Every (days)</Label>
              <Input id="sch-days" type="number" min={1} value={frequencyDays} onChange={(e) => setFrequencyDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-meter">Meter interval (hrs, optional)</Label>
              <Input id="sch-meter" type="number" value={meterInterval} onChange={(e) => setMeterInterval(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="px-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {editing ? 'Save changes' : 'Create schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}