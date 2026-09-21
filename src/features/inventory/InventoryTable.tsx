import { Minus, Plus, Pencil, Trash2 } from 'lucide-react'
import type { InventoryPart } from '@/types'
import type { PartHealth } from '@/hooks/useInventory'
import { adjustStock, deletePart } from '@/services/inventory'
import { notify } from '@/stores/toastStore'
import { money } from '@/lib/utils'
import { Bar } from '@/features/monitoring/SensorGauge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface InventoryTableProps {
  rows: PartHealth[]
  onEdit: (part: InventoryPart) => void
}

export function InventoryTable({ rows, onEdit }: InventoryTableProps) {
  const handleAdjust = async (part: InventoryPart, delta: number) => {
    try {
      const reordered = await adjustStock(part.id, delta, delta > 0 ? 'receiving' : 'consumption')
      if (reordered && delta < 0) {
        notify.warning('Reorder triggered', `${part.name} is below its reorder point.`)
      }
    } catch (err) {
      console.error(err)
      notify.error('Stock update failed', 'Could not adjust inventory.')
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Part</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead className="hidden md:table-cell">Unit cost</TableHead>
          <TableHead className="hidden md:table-cell">Stock value</TableHead>
          <TableHead className="hidden sm:table-cell">Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ part, status }) => (
          <TableRow key={part.id}>
            <TableCell className="max-w-[220px]">
              <p className="truncate font-medium">{part.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{part.partNumber}</p>
            </TableCell>
            <TableCell>
              <div className="w-32">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{part.quantityOnHand}</span>
                  <span className="text-muted-foreground">min {part.minReorderPoint}</span>
                </div>
                <div className="mt-1">
                  <Bar
                    value={part.quantityOnHand}
                    max={Math.max(part.minReorderPoint * 3, part.quantityOnHand, 1)}
                    color={status === 'critical' ? 'destructive' : status === 'low' ? 'warning' : 'success'}
                  />
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">{money(part.cost)}</TableCell>
            <TableCell className="hidden md:table-cell">{money(part.quantityOnHand * part.cost)}</TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge
                variant={status === 'critical' ? 'destructive' : status === 'low' ? 'warning' : 'success'}
              >
                {status === 'critical' ? 'Reorder now' : status === 'low' ? 'Low stock' : 'Healthy'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => handleAdjust(part, -1)} aria-label="Consume one">
                  <Minus className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleAdjust(part, 1)} aria-label="Add one">
                  <Plus className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(part)} aria-label="Edit part">
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    await deletePart(part.id)
                    notify.success('Part removed', part.name)
                  }}
                  aria-label="Delete part"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}