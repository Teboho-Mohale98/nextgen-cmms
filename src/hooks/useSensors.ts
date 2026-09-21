import { query } from 'firebase/firestore'
import { useCollectionLive } from '@/hooks/useFirestoreLive'
import { monitoringRef } from '@/services/sensors'
import type { MonitoringDoc } from '@/types'

export function useMonitoring(): MonitoringDoc[] {
  return useCollectionLive<MonitoringDoc>('monitoring:all', () => query(monitoringRef()))
}

export function useBreachCount(monitoring: MonitoringDoc[]): {
  active: number
  hot: number
  vibration: number
  runHours: number
  healthy: number
  offline: number
} {
  let active = 0
  let hot = 0
  let vibration = 0
  let runHours = 0
  let healthy = 0
  for (const m of monitoring) {
    if (!m.enabled) continue
    active++
    if (m.breached.includes('HOT')) hot++
    if (m.breached.includes('VIBRATION')) vibration++
    if (m.breached.includes('RUN_HOURS')) runHours++
    if (m.status === 'operational') healthy++
  }
  return { active, hot, vibration, runHours, healthy, offline: active - healthy }
}