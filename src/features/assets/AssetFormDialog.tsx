import * as React from 'react'
import { Loader2, Save } from 'lucide-react'
import type { Asset } from '@/types'
import { createAsset, updateAsset, DEFAULT_THRESHOLDS } from '@/services/assets'
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

interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: Asset[]
  editing?: Asset | null
  defaultParentId?: string | null
}

export function AssetFormDialog({
  open,
  onOpenChange,
  assets,
  editing,
  defaultParentId,
}: AssetFormDialogProps) {
  const [name, setName] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [parentId, setParentId] = React.useState<string>('')
  const [tempMax, setTempMax] = React.useState(String(DEFAULT_THRESHOLDS.tempMax))
  const [vibrationMax, setVibrationMax] = React.useState(String(DEFAULT_THRESHOLDS.vibrationMax))
  const [runHoursMax, setRunHoursMax] = React.useState(String(DEFAULT_THRESHOLDS.runHoursMax))
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setLocation(editing?.location ?? '')
    setCategory(editing?.category ?? '')
    setParentId(editing?.parentId ?? defaultParentId ?? '')
    setTempMax(String(editing?.thresholds?.tempMax ?? DEFAULT_THRESHOLDS.tempMax))
    setVibrationMax(String(editing?.thresholds?.vibrationMax ?? DEFAULT_THRESHOLDS.vibrationMax))
    setRunHoursMax(String(editing?.thresholds?.runHoursMax ?? DEFAULT_THRESHOLDS.runHoursMax))
  }, [open, editing, defaultParentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      notify.warning('Name required', 'Give the asset a name.')
      return
    }
    setBusy(true)
    try {
      const thresholds = {
        tempMax: Number(tempMax) || DEFAULT_THRESHOLDS.tempMax,
        vibrationMax: Number(vibrationMax) || DEFAULT_THRESHOLDS.vibrationMax,
        runHoursMax: Number(runHoursMax) || DEFAULT_THRESHOLDS.runHoursMax,
      }

      if (editing) {
        await updateAsset(editing.id, {
          name: name.trim(),
          location: location.trim() || 'Unassigned location',
          category: category.trim() || 'Asset',
          parentId: parentId || null,
          thresholds,
        })
        notify.success('Asset updated', name.trim())
      } else {
        const id = await createAsset({
          name: name.trim(),
          location: location.trim() || 'Unassigned location',
          category: category.trim() || 'Asset',
          parentId: parentId || null,
          thresholds,
        })
        notify.success('Asset registered', name.trim())
        void id
      }
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      notify.error('Save failed', 'Could not save the asset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit asset' : 'Register asset'}</DialogTitle>
          <DialogDescription>
            Assets are part of the smart hierarchy. A QR code is generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ast-name">Name</Label>
              <Input
                id="ast-name"
                required
                placeholder="Compressor P-101"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ast-cat">Category</Label>
              <Input
                id="ast-cat"
                placeholder="Compressor, Conveyor…"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ast-loc">Location</Label>
              <Input
                id="ast-loc"
                placeholder="Production Line A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ast-parent">Parent asset</Label>
              <Select
                id="ast-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                options={[
                  { value: '', label: 'Root / no parent' },
                  ...assets
                    .filter((a) => a.id !== editing?.id)
                    .map((a) => ({ value: a.id, label: `${a.name} (${a.location})` })),
                ]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              IoT alert thresholds (used by the condition monitoring engine)
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ast-temp">Temp max (°C)</Label>
                <Input
                  id="ast-temp"
                  type="number"
                  value={tempMax}
                  onChange={(e) => setTempMax(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ast-vib">Vib max (mm/s)</Label>
                <Input
                  id="ast-vib"
                  type="number"
                  step="0.1"
                  value={vibrationMax}
                  onChange={(e) => setVibrationMax(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ast-run">Run hrs max</Label>
                <Input
                  id="ast-run"
                  type="number"
                  value={runHoursMax}
                  onChange={(e) => setRunHoursMax(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {editing ? 'Save changes' : 'Register asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}