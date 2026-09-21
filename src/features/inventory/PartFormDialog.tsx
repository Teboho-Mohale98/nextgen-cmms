import * as React from 'react'
import { Loader2, Save } from 'lucide-react'
import type { InventoryPart } from '@/types'
import { createPart, updatePart } from '@/services/inventory'
import { notify } from '@/stores/toastStore'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PartFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: InventoryPart | null
}

export function PartFormDialog({ open, onOpenChange, editing }: PartFormDialogProps) {
  const [partNumber, setPartNumber] = React.useState('')
  const [name, setName] = React.useState('')
  const [quantityOnHand, setQuantityOnHand] = React.useState('10')
  const [minReorderPoint, setMinReorderPoint] = React.useState('5')
  const [cost, setCost] = React.useState('0')
  const [reorderQty, setReorderQty] = React.useState('10')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setPartNumber(editing?.partNumber ?? '')
    setName(editing?.name ?? '')
    setQuantityOnHand(String(editing?.quantityOnHand ?? 10))
    setMinReorderPoint(String(editing?.minReorderPoint ?? 5))
    setCost(String(editing?.cost ?? 0))
    setReorderQty(String(editing?.reorderQty ?? Math.max((editing?.minReorderPoint ?? 5) * 2, 5)))
  }, [open, editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !partNumber.trim()) {
      notify.warning('Missing fields', 'Part name and number are required.')
      return
    }
    setBusy(true)
    try {
      if (editing) {
        await updatePart(editing.id, {
          partNumber: partNumber.trim(),
          name: name.trim(),
          quantityOnHand: Math.max(0, Number(quantityOnHand) || 0),
          minReorderPoint: Math.max(0, Number(minReorderPoint) || 0),
          cost: Math.max(0, Number(cost) || 0),
          reorderQty: Math.max(1, Number(reorderQty) || 1),
        })
        notify.success('Part updated', name.trim())
      } else {
        await createPart({
          partNumber: partNumber.trim(),
          name: name.trim(),
          quantityOnHand: Math.max(0, Number(quantityOnHand) || 0),
          minReorderPoint: Math.max(0, Number(minReorderPoint) || 0),
          cost: Math.max(0, Number(cost) || 0),
          assignedAssets: [],
          reorderQty: Math.max(1, Number(reorderQty) || 1),
        })
        notify.success('Part added to inventory', name.trim())
      }
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      notify.error('Save failed', 'Could not save the part.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit part' : 'Add spare part'}</DialogTitle>
          <DialogDescription>
            Stock below the reorder point auto-flags a purchase requisition.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pt-num">Part number</Label>
              <Input
                id="pt-num"
                required
                placeholder="BRG-6205-2RS"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-name">Name</Label>
              <Input
                id="pt-name"
                required
                placeholder="Deep groove ball bearing"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="pt-qty">On hand</Label>
              <Input id="pt-qty" type="number" value={quantityOnHand} onChange={(e) => setQuantityOnHand(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-min">Reorder at</Label>
              <Input id="pt-min" type="number" value={minReorderPoint} onChange={(e) => setMinReorderPoint(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-cost">Unit cost</Label>
              <Input id="pt-cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-req">Reorder qty</Label>
              <Input id="pt-req" type="number" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="px-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {editing ? 'Save changes' : 'Add part'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}