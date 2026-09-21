import * as React from 'react'
import { Activity, Pause, Play, Radio, Zap } from 'lucide-react'
import { useAssets } from '@/hooks/useAssets'
import { ingestSensorReading } from '@/services/sensors'
import { useConnectivity } from '@/stores/connectivityStore'
import { notify } from '@/stores/toastStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Mode = 'calm' | 'stress'

/**
 * Synthetic telemetry generator. Simulates an IoT gateway pushing
 * vibration/temp/run-hours readings for every asset. In `stress` mode the
 * values drift above thresholds so the trigger engine visibly raises work
 * orders. Purely a dev/ demo utility - real deployments feed the same
 * `monitoring/{assetId}` docs from actual sensors.
 */
export function SensorSimulator() {
  const assets = useAssets()
  const online = useConnectivity((s) => s.online)

  const [running, setRunning] = React.useState(
    () => import.meta.env.VITE_ENABLE_SENSOR_SIMULATOR === 'true' && assets.length > 0,
  )
  const [mode, setMode] = React.useState<Mode>('calm')
  const [readCount, setReadCount] = React.useState(0)
  const lastReadings = React.useRef<Record<string, { temp: number; vibration: number; runHours: number }>>(
    {},
  )

  const tick = async () => {
    for (const asset of assets) {
      const prev = lastReadings.current[asset.id] ?? {
        temp: asset.metrics?.temp ?? 30,
        vibration: asset.metrics?.vibration ?? 0.5,
        runHours: asset.metrics?.runHours ?? 10,
      }

      const stress = mode === 'stress'
      const temp =
        prev.temp +
        (Math.random() - 0.42) * (stress ? 9 : 3.5) +
        (stress && Math.random() < 0.15 ? 18 : 0)
      const vibration =
        Math.max(0, prev.vibration + (Math.random() - 0.48) * (stress ? 2.2 : 0.7)) +
        (stress && Math.random() < 0.12 ? 2.6 : 0)
      const runHours = prev.runHours + 0.6 + Math.random() * (stress ? 3 : 1.2)

      const reading = {
        temp: Math.max(10, Math.min(150, temp)),
        vibration: Math.max(0, Math.min(25, vibration)),
        runHours: Math.max(0, runHours),
      }
      lastReadings.current[asset.id] = reading

      try {
        await ingestSensorReading(asset.id, reading, asset.thresholds, {
          name: asset.name,
          location: asset.location,
        })
        setReadCount((n) => n + 1)
      } catch (err) {
        console.warn('[cmms] simulator write failed', err)
      }
    }
  }

  React.useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => void tick(), 3500)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, assets])

  React.useEffect(() => {
    if (assets.length === 0) setRunning(false)
  }, [assets.length])

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="size-4 text-primary" /> Simulated IoT gateway
          </CardTitle>
          <CardDescription>
            Feed synthetic telemetry so the trigger engine &amp; dashboards stay alive.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={running ? 'success' : 'muted'} className="gap-1">
            <Activity className="size-3 animate-pulse" />
            {readCount} reads
          </Badge>
          <Switch
            checked={running}
            onCheckedChange={(v) => {
              setRunning(v)
              if (v && !online) notify.warning('Offline', 'Reads will queue and sync later.')
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mode:</span>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              options={[
                { value: 'calm', label: 'Calm (stable operation)' },
                { value: 'stress', label: 'Stress (push past thresholds)' },
              ]}
            />
          </div>
          <Button
            size="sm"
            variant={running ? 'outline' : 'success'}
            onClick={() => setRunning(!running)}
          >
            {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {running ? 'Pause gateway' : 'Start gateway'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void tick().then(() => {
                notify.info('Telemetry pushed', 'One reading per asset written to Firestore.')
              })
            }}
          >
            <Zap className="size-3.5" /> Push now
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {mode === 'stress'
              ? 'Expect breach alerts and auto-created work orders shortly.'
              : 'Values hover within safe operating ranges.'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}