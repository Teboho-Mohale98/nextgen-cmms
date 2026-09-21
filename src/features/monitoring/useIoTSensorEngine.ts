import * as React from 'react'
import { useMonitoring } from '@/hooks/useSensors'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { createWorkOrder } from '@/services/workOrders'
import { notify } from '@/stores/toastStore'

const DEDUPE_WINDOW_MS = 5 * 60_000

/** Per (asset, breach-code) last auto-trigger attempt (module-level). */
const lastAttempt = new Map<string, number>()

/**
 * The automated Work Order Trigger Engine.
 *
 * Watches the `monitoring/` collection in real time. Whenever a sensor
 * reading breaches an asset's thresholds it raises a work order - but
 * only if no open/in-progress IoT work order already exists for that
 * asset+code (prevents alert storms). The same logic runs server-side in
 * Cloud Functions (`functions/src/iot.ts`) for gateway-ingested telemetry.
 */
export function useIoTSensorEngine(enabled: boolean) {
  const monitoring = useMonitoring()
  const workOrders = useWorkOrders()
  const [triggered, setTriggered] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) return
    const now = Date.now()

    for (const m of monitoring) {
      if (!m.enabled || m.status === 'operational') continue
      const code = m.breached.join('/')

      const alreadyOpen = workOrders.some(
        (wo) =>
          wo.assetId === m.assetId &&
          wo.triggerType === 'iot_sensor' &&
          wo.status !== 'completed' &&
          wo.title.includes(code),
      )
      if (alreadyOpen) continue

      const key = `${m.assetId}:${code}`
      const last = lastAttempt.get(key) ?? 0
      if (now - last < DEDUPE_WINDOW_MS) continue
      lastAttempt.set(key, now)

      createWorkOrder({
        assetId: m.assetId,
        assetName: m.name,
        title: `IoT alert [${code}] — ${m.name} at ${m.location}`,
        description: [
          'Automatically raised by the condition monitoring trigger engine.',
          `Telemetry: temp ${m.temp}°C · vibration ${m.vibration} mm/s · ${m.runHours} run hours.`,
          `Breached codes: ${m.breached.join(', ')}.`,
        ].join('\n'),
        priority: m.status === 'down' ? 'critical' : 'high',
        assignedTo: 'Unassigned',
        triggerType: 'iot_sensor',
      })
        .then(() => {
          setTriggered((n) => n + 1)
          notify.warning(
            `Work order raised · ${m.name}`,
            `Sensor breached ${code} - a ${m.status === 'down' ? 'critical' : 'high'} priority job was created.`,
          )
        })
        .catch((err) => console.error('[cmms] trigger engine write failed', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitoring, workOrders, enabled, triggered])

  React.useEffect(() => {
    if (!enabled) lastAttempt.clear()
  }, [enabled])

  return { triggered }
}