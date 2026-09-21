import * as React from 'react'
import { Activity, Flame, Gauge, AlertTriangle, Bot, RadioTower } from 'lucide-react'
import { useMonitoring, useBreachCount } from '@/hooks/useSensors'
import { useIoTSensorEngine } from '@/features/monitoring/useIoTSensorEngine'
import { MonitoringGrid } from '@/features/monitoring/MonitoringGrid'
import { SensorSimulator } from '@/features/monitoring/SensorSimulator'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonitoringPage() {
  const monitoring = useMonitoring()
  const counts = useBreachCount(monitoring)
  const [engineOn, setEngineOn] = React.useState(true)
  const { triggered } = useIoTSensorEngine(engineOn)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Condition Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Live asset telemetry with automatic work order generation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={engineOn ? 'success' : 'muted'} className="gap-1.5">
            <Bot className="size-3.5" />
            Trigger engine {engineOn ? 'armed' : 'paused'}
            {triggered > 0 && (
              <span className="rounded bg-background/30 px-1 text-[10px]">{triggered} raised</span>
            )}
          </Badge>
          <Switch checked={engineOn} onCheckedChange={setEngineOn} aria-label="Toggle trigger engine" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={RadioTower} label="Monitored assets" value={counts.active} tone="muted" />
        <Kpi icon={Activity} label="Healthy" value={counts.healthy} tone="success" />
        <Kpi icon={Flame} label="Over temperature" value={counts.hot} tone="destructive" />
        <Kpi icon={Gauge} label="Vibration alerts" value={counts.vibration} tone="destructive" />
        <Kpi icon={AlertTriangle} label="Due on run hours" value={counts.runHours} tone="warning" />
      </div>

      <SensorSimulator />

      <MonitoringGrid monitoring={monitoring} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How the trigger engine works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Readings land in <code className="rounded bg-muted px-1">monitoring/&#123;assetId&#125;</code> - produced
            by the simulator, an edge gateway, or your own ingest service.
          </p>
          <p>
            2. Readings are compared against each asset's thresholds
            (<code className="rounded bg-muted px-1">assets/&#123;assetId&#125;/thresholds</code>).
          </p>
          <p>
            3. On breach, {engineOn ? 'the engine raises' : 'the engine would raise'} a work order unless an open
            IoT work order for the same asset + code already exists (storm protection).
          </p>
          <p className="text-xs text-muted-foreground/80">
            Production hardening: deploy <code className="rounded bg-muted px-1">functions/src/iot.ts</code> which
            performs the same check server-side for every telemetry write.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone: 'muted' | 'success' | 'destructive' | 'warning'
}) {
  const color = {
    muted: 'text-muted-foreground bg-muted',
    success: 'text-success bg-success/10',
    destructive: 'text-destructive bg-destructive/10',
    warning: 'text-warning bg-warning/10',
  }[tone]
return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}