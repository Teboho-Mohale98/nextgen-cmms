import { CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import type { MaintenanceSchedule } from '@/types'
import { completeScheduleRun, deleteSchedule } from '@/services/schedules'
import { notify } from '@/stores/toastStore'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ScheduleTableProps {
  schedules: MaintenanceSchedule[]
  onEdit: (schedule: MaintenanceSchedule) => void
}

export function ScheduleTable({ schedules, onEdit }: ScheduleTableProps) {
  const now = Date.now()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead className="hidden sm:table-cell">Frequency</TableHead>
          <TableHead className="hidden md:table-cell">Last executed</TableHead>
          <TableHead>Next due</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((s) => {
          const due = new Date(s.nextDue).getTime()
          const overdue = due < now
          const soon = !overdue && due < now + 3 * 86_400_000
          return (
            <TableRow key={s.id}>
              <TableCell className="max-w-[200px]">
                <p className="truncate font-medium">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {s.meterInterval ? `meter · every ${s.meterInterval} hrs` : 'calendar based'}
                </p>
              </TableCell>
              <TableCell>{s.assetName ?? '—'}</TableCell>
              <TableCell className="hidden sm:table-cell">every {s.frequencyDays}d</TableCell>
              <TableCell className="hidden md:table-cell">{formatDateTime(s.lastExecuted)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{formatDateTime(s.nextDue)}</span>
                  {overdue && <Badge variant="destructive">Overdue</Badge>}
                  {soon && !overdue && <Badge variant="warning">Due soon</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mark executed"
                    onClick={async () => {
                      await completeScheduleRun(s.id, s)
                    }}
                  >
                    <CheckCircle2 className="size-4 text-success" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Edit schedule" onClick={() => onEdit(s)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete schedule"
                    onClick={async () => {
                      await deleteSchedule(s.id)
                      notify.success('Schedule deleted', s.title)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}