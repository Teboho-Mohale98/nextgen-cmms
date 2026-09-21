import { orderBy, query } from 'firebase/firestore'
import { useCollectionLive } from '@/hooks/useFirestoreLive'
import { schedulesRef } from '@/services/schedules'
import type { MaintenanceSchedule } from '@/types'

export function useSchedules(): MaintenanceSchedule[] {
  return useCollectionLive<MaintenanceSchedule>('schedules:all', () =>
    query(schedulesRef(), orderBy('nextDue', 'asc')),
  )
}

export function useOverdueSchedules(schedules: MaintenanceSchedule[]): MaintenanceSchedule[] {
  const now = Date.now()
  return schedules.filter((s) => new Date(s.nextDue).getTime() < now)
}

export function useSchedulesDueSoon(schedules: MaintenanceSchedule[], withinDays = 14): MaintenanceSchedule[] {
  const now = Date.now()
  const horizon = now + withinDays * 86_400_000
  return schedules.filter((s) => {
    const due = new Date(s.nextDue).getTime()
    return due >= now - 86_400_000 && due <= horizon
  })
}