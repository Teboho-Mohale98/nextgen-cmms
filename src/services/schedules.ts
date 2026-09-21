import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { uid } from '@/lib/utils'
import { notify } from '@/stores/toastStore'
import type { MaintenanceSchedule } from '@/types'

export function schedulesRef() {
  return collection(db, 'maintenanceSchedules')
}

export interface NewScheduleInput {
  assetId: string
  assetName?: string
  title: string
  frequencyDays: number
  meterInterval: number | null
}

export async function createSchedule(input: NewScheduleInput): Promise<string> {
  const id = uid('sch')
  const nextDue = new Date(Date.now() + input.frequencyDays * 86_400_000).toISOString()
  const schedule: MaintenanceSchedule = {
    id,
    assetId: input.assetId,
    assetName: input.assetName,
    title: input.title,
    frequencyDays: input.frequencyDays,
    meterInterval: input.meterInterval ?? null,
    lastExecuted: null,
    nextDue,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(db, 'maintenanceSchedules', id), schedule)
  return id
}

export async function updateSchedule(id: string, patch: Partial<MaintenanceSchedule>): Promise<void> {
  await updateDoc(doc(db, 'maintenanceSchedules', id), {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteSchedule(id: string): Promise<void> {
  await deleteDoc(doc(db, 'maintenanceSchedules', id))
}

/**
 * Marks a schedule executed as of now and rolls the next due date
 * forward by `frequencyDays`.
 */
export async function completeScheduleRun(id: string, schedule: MaintenanceSchedule): Promise<void> {
  const now = new Date()
  const nextDue = new Date(now.getTime() + schedule.frequencyDays * 86_400_000).toISOString()
  await updateSchedule(id, {
    lastExecuted: now.toISOString(),
    nextDue,
  })
  notify.success('Schedule executed', `Next run planned for ${new Date(nextDue).toLocaleDateString()}.`)
}