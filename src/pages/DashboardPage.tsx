import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  ClipboardList,
  AlertTriangle,
  Package,
  ArrowUpRight,
  Network,
  Activity,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkOrderStats } from '@/hooks/useWorkOrders'
import { useAssets } from '@/hooks/useAssets'
import { useParts, summarizeParts } from '@/hooks/useInventory'
import { useSchedules, useOverdueSchedules } from '@/hooks/useSchedules'
import { useMonitoring, useBreachCount } from '@/hooks/useSensors'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { assetStatusTone, priorityTone } from '@/lib/status'
import { ASSET_STATUS_LABEL, PRIORITY_LABEL, type WorkOrderPriority } from '@/types'
import { relativeTime, cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardPage() {
  const assets = useAssets()
  const workOrders = useWorkOrders()
  const parts = useParts()
  const schedules = useSchedules()
  const monitoring = useMonitoring()
  const breaches = useBreachCount(monitoring)

  const partsSummary = React.useMemo(() => summarizeParts(parts), [parts])
  const overdueSchedules = useOverdueSchedules(schedules)

  const { data: woStats } = useQuery({
    queryKey: ['wo-stats'],
    queryFn: fetchWorkOrderStats,
  })

  const assetsDown = assets.filter((a) => a.status !== 'operational')
  const recentWos = [...workOrders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)

  const byStatus = (s: string) => assets.filter((a) => a.status === s).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Operations Overview</h2>
          <p className="text-sm text-muted-foreground">
            Plant condition, work load and parts health at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/workorders"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            Open work orders
            <ArrowUpRight />
          </Link>
          <Link to="/workorders" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
            <ClipboardList /> New work order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={Box}
          label="Total assets"
          value={String(assets.length)}
          sub={`${byStatus('down')} down · ${byStatus('degraded')} degraded`}
          link="/assets"
          tone="warning"
        />
        <KpiTile
          icon={ClipboardList}
          label="Open work orders"
          value={String(woStats?.open ?? (workOrders.filter((w) => w.status === 'open').length || '—'))}
          sub={`${woStats?.inProgress ?? '—'} in progress · ${woStats?.critical ?? '—'} critical`}
          link="/workorders"
          tone="destructive"
        />
        <KpiTile
          icon={Package}
          label="Parts need reorder"
          value={String(partsSummary.critical)}
          sub={`${partsSummary.lowStock} below comfort · $${Math.round(partsSummary.totalValue).toLocaleString()} value`}
          link="/inventory"
          tone="destructive"
        />
        <KpiTile
          icon={Activity}
          label="Sensor alerts"
          value={String(breaches.offline)}
          sub={`${breaches.hot} hot · ${breaches.vibration} vibration`}
          link="/monitoring"
          tone="destructive"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm">Recent work orders</CardTitle>
              <CardDescription>The latest activity across the plant.</CardDescription>
            </div>
            <Link to="/workorders" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View board <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentWos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ClipboardList className="size-7 text-muted-foreground" />
                <p className="text-sm font-medium">No work orders</p>
                <p className="text-xs text-muted-foreground">
                  Create one on the Work Orders page or load the demo dataset.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {recentWos.map((wo) => (
                  <li key={wo.id}>
                    <div className="flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-accent/30">
                      <span className={cn('h-8 w-1 shrink-0 rounded-full', {
                        'bg-destructive': wo.priority === 'critical',
                        'bg-warning': wo.priority === 'high',
                        'bg-info': wo.priority === 'medium',
                        'bg-muted-foreground': wo.priority === 'low',
                      })} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{wo.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {wo.assetName ?? 'Unknown asset'} · {relativeTime(wo.createdAt)}
                        </p>
                      </div>
                      <Badge variant={priorityTone(wo.priority)}>{PRIORITY_LABEL[wo.priority]}</Badge>
                      <Badge variant={wo.status === 'completed' ? 'success' : wo.status === 'in_progress' ? 'info' : 'muted'} className="hidden sm:inline-flex">
                        {wo.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Network className="size-4 text-primary" /> Asset status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['operational', 'degraded', 'down'] as const).map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{ASSET_STATUS_LABEL[s]}</span>
                  <Badge variant={assetStatusTone(s)}>{byStatus(s)}</Badge>
                </div>
              ))}
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                <div className="bg-success transition-all" style={{ width: `${pct(byStatus('operational'), assets.length)}%` }} />
                <div className="bg-warning transition-all" style={{ width: `${pct(byStatus('degraded'), assets.length)}%` }} />
                <div className="bg-destructive transition-all" style={{ width: `${pct(byStatus('down'), assets.length)}%` }} />
              </div>
              {assetsDown.length > 0 && (
                <Link to="/assets" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline">
                  <AlertTriangle className="size-3.5" />
                  {assetsDown.length} asset{assetsDown.length > 1 ? 's' : ''} need attention
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-destructive" />
                Priority load
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as WorkOrderPriority[]).map((p) => {
                const open = workOrders.filter((w) => w.priority === p && w.status !== 'completed').length
                return (
                  <div key={p} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{PRIORITY_LABEL[p]}</span>
                    <span className="font-semibold">{open}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {overdueSchedules.length > 0 && (
            <Card className="border-warning/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-warning">
                  {overdueSchedules.length} overdue schedule{overdueSchedules.length > 1 ? 's' : ''}
                </CardTitle>
                <CardDescription className="text-xs">
                  <Link to="/schedules" className="font-medium text-primary hover:underline">
                    Review schedules
                  </Link>
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function pct(n: number, total: number): number {
  if (total === 0) return 0
  return Math.max(0, (n / total) * 100)
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  link,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  link: string
  tone: 'default' | 'warning' | 'destructive'
}) {
  const iconCls =
    tone === 'warning'
      ? 'bg-warning/10 text-warning'
      : tone === 'destructive'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary'
  return (
    <Card>
      <CardContent className="space-y-2.5 p-4">
        <div className="flex items-center justify-between">
          <div className={`flex size-9 items-center justify-center rounded-lg ${iconCls}`}>
            <Icon className="size-4" />
          </div>
          {value === '—' ? (
            <Skeleton className="size-5 w-10" />
          ) : (
            <Link to={link} className="text-muted-foreground transition-colors hover:text-foreground" aria-label={`View ${label}`}>
              <ArrowUpRight className="size-4" />
            </Link>
          )}
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground/80">{sub}</p>
      </CardContent>
    </Card>
  )
}