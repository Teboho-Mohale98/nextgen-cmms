import { cn } from '@/lib/utils'

interface SensorGaugeProps {
  label: string
  value: number
  max: number
  unit: string
  breached?: boolean
}

export function SensorGauge({ label, value, max, unit, breached }: SensorGaugeProps) {
  const pct = Math.min(100, (value / max) * 100)
  const tone = breached ? 'bg-destructive' : pct >= 90 ? 'bg-warning' : pct >= 70 ? 'bg-info' : 'bg-success'

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">
          {value.toFixed(1)} <span className="text-[10px] text-muted-foreground">{unit}</span>
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-700', tone)} style={{ width: `${pct}%` }} />
        <span className="absolute top-[-3px] h-2.5 w-0.5 bg-foreground/60" style={{ left: `${Math.min(100, (max / max) * 100)}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">limit {max} {unit}</p>
    </div>
  )
}

export function Bar({ value, max, color }: { value: number; max: number; color: 'success' | 'warning' | 'destructive' }) {
  const pct = Math.max(2, Math.min(100, (value / Math.max(1, max)) * 100))
  const cls = {
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
  }[color]
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full', cls)} style={{ width: `${pct}%` }} />
    </div>
  )
}