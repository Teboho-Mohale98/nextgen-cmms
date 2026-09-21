import type { AssetStatus, WorkOrderPriority, WorkOrderTrigger } from '@/types'

export type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'muted'

export function assetStatusTone(status: AssetStatus): Tone {
  switch (status) {
    case 'operational':
      return 'success'
    case 'degraded':
      return 'warning'
    case 'down':
      return 'destructive'
  }
}

export function priorityTone(priority: WorkOrderPriority): Tone {
  switch (priority) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'warning'
    case 'medium':
      return 'info'
    case 'low':
      return 'muted'
  }
}

export function priorityBarClass(priority: WorkOrderPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-destructive'
    case 'high':
      return 'bg-warning'
    case 'medium':
      return 'bg-info'
    case 'low':
      return 'bg-muted-foreground'
  }
}

export function healthTone(score: number): Tone {
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'destructive'
}

export function triggerLabel(trigger: WorkOrderTrigger): string {
  switch (trigger) {
    case 'calendar':
      return 'Calendar'
    case 'meter':
      return 'Meter'
    case 'iot_sensor':
      return 'IoT sensor'
    case 'manual':
      return 'Manual'
  }
}

export function assetHealthScore(asset: {
  metrics?: { temp?: number; vibration?: number; runHours?: number }
  thresholds?: { tempMax?: number; vibrationMax?: number; runHoursMax?: number }
  status?: AssetStatus
}): number {
  if (!asset.metrics || !asset.thresholds) return 100
  const { temp, vibration, runHours } = asset.metrics
  const { tempMax, vibrationMax, runHoursMax } = asset.thresholds
  const tempSafe = temp ?? 0
  const vibrationSafe = vibration ?? 0
  const runHoursSafe = runHours ?? 0
  const base = Math.max(
    0,
    Math.min(
      100,
      100 -
        (tempSafe / (tempMax || 1) - 1) * 55 -
        (vibrationSafe / (vibrationMax || 1) - 1) * 65 -
        (runHoursSafe / (runHoursMax || 1) - 1) * 30,
    ),
  )
  if (asset.status === 'down') return Math.min(base, 20)
  return Math.round(base)
}