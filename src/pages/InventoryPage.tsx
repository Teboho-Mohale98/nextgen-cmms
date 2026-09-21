import * as React from 'react'
import { Package, DollarSign, AlertTriangle, Boxes, Plus, ShoppingCart } from 'lucide-react'
import type { InventoryPart } from '@/types'
import { useParts, usePartHealth, summarizeParts } from '@/hooks/useInventory'
import { InventoryTable } from '@/features/inventory/InventoryTable'
import { PartFormDialog } from '@/features/inventory/PartFormDialog'
import { useDialog } from '@/hooks/useDialog'
import { money } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'

export function InventoryPage() {
  const parts = useParts()
  const rows = usePartHealth(parts)
  const summary = React.useMemo(() => summarizeParts(parts), [parts])
  const form = useDialog()
  const [editing, setEditing] = React.useState<InventoryPart | null>(null)

  const reorderItems = rows.filter((r) => r.status === 'critical')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Spare Parts Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Auto-reorder indicators feed the AI parts forecaster.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            form.open()
          }}
        >
          <Plus /> Add part
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary icon={Package} label="Part SKUs" value={String(summary.totalParts)} />
        <Summary icon={DollarSign} label="Stock value" value={money(summary.totalValue)} />
        <Summary icon={AlertTriangle} label="Low stock" value={String(summary.lowStock)} tone="warning" />
        <Summary icon={Boxes} label="Need reorder" value={String(summary.critical)} tone="destructive" />
      </div>

      {reorderItems.length > 0 && (
        <Card className="border-warning/50 bg-warning/[0.04]">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <ShoppingCart className="size-4 text-warning" />
            <CardTitle className="text-sm">Automated purchase requisitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reorderItems.map(({ part }) => (
              <div key={part.id} className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{part.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {part.partNumber} · {part.quantityOnHand} on hand · band at {part.minReorderPoint}
                  </p>
                </div>
                <Badge variant="warning">Suggested qty {part.reorderQty ?? 5}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Package}
                title="Inventory is empty"
                description="Add spare parts, or load the demo dataset to see reorder logic in action."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null)
                      form.open()
                    }}
                  >
                    <Plus /> Add part
                  </Button>
                }
              />
            </div>
          ) : (
            <InventoryTable rows={rows} onEdit={(p) => {
              setEditing(p)
              form.open()
            }} />
          )}
        </CardContent>
      </Card>

      <PartFormDialog open={form.isOpen} onOpenChange={form.set} editing={editing} />
    </div>
  )
}

function Summary({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone?: 'default' | 'warning' | 'destructive'
}) {
  const iconCls =
    tone === 'warning'
      ? 'bg-warning/10 text-warning'
      : tone === 'destructive'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary'
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-9 items-center justify-center rounded-lg ${iconCls}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="truncate text-lg font-semibold leading-none">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}