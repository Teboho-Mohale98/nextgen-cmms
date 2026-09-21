import * as React from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import type { MaintenanceSchedule } from '@/types'
import { useAssets } from '@/hooks/useAssets'
import { useSchedules, useOverdueSchedules, useSchedulesDueSoon } from '@/hooks/useSchedules'
import { ScheduleTable } from '@/features/schedules/ScheduleTable'
import { ScheduleFormDialog } from '@/features/schedules/ScheduleFormDialog'
import { useDialog } from '@/hooks/useDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export function SchedulesPage() {
  const schedules = useSchedules()
  const assets = useAssets()
  const overdue = useOverdueSchedules(schedules)
  const dueSoon = useSchedulesDueSoon(schedules, 14)
  const form = useDialog()
  const [editing, setEditing] = React.useState<MaintenanceSchedule | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Maintenance Schedules</h2>
          <p className="text-sm text-muted-foreground">
            Calendar &amp; meter-based preventives. Due-next logic is automatic.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            form.open()
          }}
        >
          <Plus /> New schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CalendarClock className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm">Up next (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {dueSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing on the horizon.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {dueSoon.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{s.title}</span>
                    <Badge variant="warning">
                      {new Date(s.nextDue).toLocaleDateString()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CalendarClock className="size-4 text-destructive" />
            <CardTitle className="text-sm">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">All schedules are on track. Good work.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {overdue.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{s.title}</span>
                    <Badge variant="destructive">Overdue</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {schedules.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarClock}
                title="No schedules configured"
                description="Add a preventive schedule, or load the demo dataset from Settings."
                action={
                  <Button size="sm" onClick={form.open}>
                    <Plus /> New schedule
                  </Button>
                }
              />
            </div>
          ) : (
            <ScheduleTable
              schedules={schedules}
              onEdit={(s) => {
                setEditing(s)
                form.open()
              }}
            />
          )}
        </CardContent>
      </Card>

      <ScheduleFormDialog open={form.isOpen} onOpenChange={form.set} assets={assets} editing={editing} />
    </div>
  )
}