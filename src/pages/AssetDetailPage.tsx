import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Box,
  Flame,
  Gauge,
  Clock,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Activity,
} from 'lucide-react'
import type { AssetStatus } from '@/types'
import { ASSET_STATUS_LABEL } from '@/types'
import { useAsset, useAssets } from '@/hooks/useAssets'
import { useWorkOrdersByAsset } from '@/hooks/useWorkOrders'
import { setAssetStatus, updateAsset } from '@/services/assets'
import { assetStatusTone, healthTone } from '@/lib/status'
import { useDialog } from '@/hooks/useDialog'
import { notify } from '@/stores/toastStore'
import { toFixedSafe } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { QrCode as QrCodeRender } from '@/components/qr/QrCode'
import { AssetFormDialog } from '@/features/assets/AssetFormDialog'
import { WorkOrderFormDialog } from '@/features/workorders/WorkOrderFormDialog'

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const asset = useAsset(id)
  const assets = useAssets()
  const workOrders = useWorkOrdersByAsset(id ?? '')
  const editDialog = useDialog()
  const newWoDialog = useDialog()

  const [editingThresholds, setEditingThresholds] = React.useState(false)
  const [tempMax, setTempMax] = React.useState('')
  const [vibrationMax, setVibrationMax] = React.useState('')
  const [runHoursMax, setRunHoursMax] = React.useState('')

  React.useEffect(() => {
    if (asset) {
      setTempMax(String(asset.thresholds.tempMax))
      setVibrationMax(String(asset.thresholds.vibrationMax))
      setRunHoursMax(String(asset.thresholds.runHoursMax))
    }
  }, [asset?.thresholds, asset?.id])

  if (!asset) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const children = assets.filter((a) => a.parentId === asset.id)
  const score = asset.healthScore

  const saveThresholds = async () => {
    await updateAsset(asset.id, {
      thresholds: {
        tempMax: Number(tempMax) || asset.thresholds.tempMax,
        vibrationMax: Number(vibrationMax) || asset.thresholds.vibrationMax,
        runHoursMax: Number(runHoursMax) || asset.thresholds.runHoursMax,
      },
    })
    setEditingThresholds(false)
    notify.success('Thresholds updated', `${asset.name} sensors re-calibrated.`)
  }

  const changeStatus = async (status: AssetStatus) => {
    await setAssetStatus(asset.id, status)
    notify.success('Status updated', `${asset.name} is now ${ASSET_STATUS_LABEL[status].toLowerCase()}.`)
  }

  return (
    <div className="space-y-5">
      <Link
        to="/assets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Asset hierarchy
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-info/15 text-info">
            <Box className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{asset.name}</h2>
              <Badge variant={assetStatusTone(asset.status)}>
                {ASSET_STATUS_LABEL[asset.status]}
              </Badge>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {asset.location} · {asset.category}
              <span className="font-mono text-xs text-muted-foreground/70">· {asset.qrCode}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={editDialog.open}>
            <Pencil /> Edit
          </Button>
          <Button onClick={newWoDialog.open}>
            <Plus /> Work order
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Health + metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4 text-primary" /> Live condition
            </CardTitle>
            <CardDescription>Health score from live telemetry vs thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <HealthRing score={score} />
              <div>
                <p className="text-sm font-medium">Asset health</p>
                <p className="text-xs text-muted-foreground">
                  Auto-computed from sensor deltas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Metric
                icon={Flame}
                label="Temperature"
                value={`${toFixedSafe(asset.metrics?.temp)} °C`}
                threshold={`Max ${asset.thresholds.tempMax} °C`}
                tone={asset.metrics?.temp > asset.thresholds.tempMax ? 'destructive' : 'default'}
              />
              <Metric
                icon={Gauge}
                label="Vibration"
                value={`${toFixedSafe(asset.metrics?.vibration)} mm/s`}
                threshold={`Max ${asset.thresholds.vibrationMax} mm/s`}
                tone={
                  asset.metrics?.vibration > asset.thresholds.vibrationMax
                    ? 'destructive'
                    : 'default'
                }
              />
              <Metric
                icon={Clock}
                label="Run hours"
                value={`${toFixedSafe(asset.metrics?.runHours, 0)} h`}
                threshold={`Max ${asset.thresholds.runHoursMax} h`}
                tone={
                  asset.metrics?.runHours > asset.thresholds.runHoursMax
                    ? 'warning'
                    : 'default'
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* QR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <QrCode className="size-4 text-primary" /> Asset tag
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <QrCodeRender value={asset.qrCode} size={130} />
            <p className="text-center text-xs text-muted-foreground">
              Print this tag at the asset. Technicians scan it with the field QR scanner.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Thresholds + status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">IoT thresholds &amp; state</CardTitle>
            <CardDescription>These drive the automated trigger engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingThresholds ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Temp max</Label>
                    <Input type="number" value={tempMax} onChange={(e) => setTempMax(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vib max</Label>
                    <Input type="number" step="0.1" value={vibrationMax} onChange={(e) => setVibrationMax(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Run hrs</Label>
                    <Input type="number" value={runHoursMax} onChange={(e) => setRunHoursMax(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveThresholds}>
                    Save thresholds
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingThresholds(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingThresholds(true)}
              >
                <Gauge className="size-3.5" /> Edit thresholds
              </Button>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Manual status:</span>
              <Button
                size="sm"
                variant={asset.status === 'operational' ? 'success' : 'outline'}
                onClick={() => changeStatus('operational')}
              >
                Operational
              </Button>
              <Button
                size="sm"
                variant={asset.status === 'degraded' ? 'secondary' : 'outline'}
                onClick={() => changeStatus('degraded')}
              >
                Degraded
              </Button>
              <Button
                size="sm"
                variant={asset.status === 'down' ? 'destructive' : 'outline'}
                onClick={() => changeStatus('down')}
              >
                Down
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Child assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Child assets · {children.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-xs text-muted-foreground">This asset has no children.</p>
            ) : (
              <ul className="space-y-1.5">
                {children.map((child) => (
                  <li key={child.id}>
                    <Link
                      to={`/assets/${child.id}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/40"
                    >
                      <span className="flex items-center gap-2">
                        <Box className="size-4 text-muted-foreground" />
                        {child.name}
                      </span>
                      <Badge variant={assetStatusTone(child.status)}>
                        {ASSET_STATUS_LABEL[child.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Work orders for this asset */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Work history</CardTitle>
            <CardDescription>{workOrders.length} work orders for this asset.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {workOrders.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No work orders yet"
              description="Schedule maintenance, or let the IoT engine create one when thresholds are exceeded."
            />
          ) : (
            <ul className="space-y-1.5">
              {workOrders.slice(0, 8).map((wo) => (
                <li key={wo.id}>
                  <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{wo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {wo.status} · {wo.priority} · assigned to {wo.assignedTo}
                      </p>
                    </div>
                    <Link
                      to="/workorders"
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      View board
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AssetFormDialog open={editDialog.isOpen} onOpenChange={editDialog.set} assets={assets} editing={asset} />
      <WorkOrderFormDialog
        open={newWoDialog.isOpen}
        onOpenChange={newWoDialog.set}
        assets={assets}
        defaultAssetId={asset.id}
      />
    </div>
  )
}

function HealthRing({ score }: { score: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  const tone = healthTone(pct)
  const color =
    tone === 'success' ? 'var(--success)' : tone === 'warning' ? 'var(--warning)' : 'var(--destructive)'

  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c - (c * pct) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{pct}</span>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  threshold,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  threshold: string
  tone: 'default' | 'destructive' | 'warning'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border px-3 py-2',
        tone === 'destructive' && 'border-destructive/50 bg-destructive/5',
        tone === 'warning' && 'border-warning/50 bg-warning/5',
      )}
    >
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-md',
          tone === 'destructive'
            ? 'bg-destructive/15 text-destructive'
            : tone === 'warning'
              ? 'bg-warning/15 text-warning'
              : 'bg-info/15 text-info',
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
      <span className="ml-auto truncate text-[10px] text-muted-foreground">{threshold}</span>
    </div>
  )
}