import {
  Activity,
  Box,
  Gauge,
  Clock,
  RadioTower,
} from 'lucide-react'
import type { MonitoringDoc } from '@/types'
import { relativeTime } from '@/lib/utils'
import { toggleMonitoring } from '@/services/sensors'
import { notify } from '@/stores/toastStore'
import { SensorGauge } from '@/features/monitoring/SensorGauge'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function breachBadgeVariant(code: string): 'destructive' | 'warning' {
  return code === 'HOT' || code === 'VIBRATION' ? 'destructive' : 'warning'
}

export function MonitoringGrid({ monitoring }: { monitoring: MonitoringDoc[] }) {
  if (monitoring.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <RadioTower className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">No telemetry yet</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Start the simulated IoT gateway (or hook up real sensors) to begin streaming
            condition data for auto-triggered work orders.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {monitoring.map((m) => (
        <MonitorCard key={m.assetId} monitoring={m} />
      ))}
    </div>
  )
}

function MonitorCard({ monitoring: m }: { monitoring: MonitoringDoc }) {
  return (
    <Card
      className={
        m.status === 'down'
          ? 'border-destructive/50 bg-destructive/[0.04]'
          : m.status === 'degraded'
            ? 'border-warning/50 bg-warning/[0.04]'
            : undefined
      }
    >
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Box className="size-4 text-muted-foreground" />
            <span className="truncate">{m.name}</span>
          </CardTitle>
          <CardDescription className="truncate">{m.location}</CardDescription>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge
            variant={
              m.status === 'operational'
                ? 'success'
                : m.status === 'degraded'
                  ? 'warning'
                  : 'destructive'
            }
          >
            <Activity className="size-3" />
            {m.status}
          </Badge>
          <Switch
            checked={m.enabled}
            onCheckedChange={async (v) => {
              await toggleMonitoring(m.assetId, v)
              notify.info(v ? 'Monitoring enabled' : 'Monitoring paused', m.name)
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {m.breached.map((code) => (
            <Badge key={code} variant={breachBadgeVariant(code)}>
              {code}
            </Badge>
          ))}
          {!m.breached.includes('NORMAL') && m.breached.length < 3 && (
            <span className="text-[10px] text-muted-foreground">breached thresholds</span>
          )}
        </div>

        <SensorGauge
          label="Temperature"
          value={m.temp}
          max={m.thresholds.tempMax}
          unit="°C"
          breached={m.breached.includes('HOT')}
        />
        <SensorGauge
          label="Vibration"
          value={m.vibration}
          max={m.thresholds.vibrationMax}
          unit="mm/s"
          breached={m.breached.includes('VIBRATION')}
        />
        <SensorGauge
          label="Run hours"
          value={m.runHours}
          max={m.thresholds.runHoursMax}
          unit="h"
          breached={m.breached.includes('RUN_HOURS')}
        />

        <div className="flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Gauge className="size-3.5" /> {m.readCount} readings
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {relativeTime(m.lastReadingAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}