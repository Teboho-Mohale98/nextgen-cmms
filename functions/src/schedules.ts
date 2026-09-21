import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { db } from './index'

/**
 * Calendar / meter maintenance scheduler.
 *
 * Runs daily. For every maintenance schedule whose `nextDue` has passed,
 * it raises a calendar-triggered work order and rolls the schedule
 * forward by `frequencyDays`. Meter-interval schedules are left to the
 * meter-reading workflow.
 */
export const runScheduler = onSchedule('every day 01:00', async () => {
  const now = new Date()
  const snap = await db.collection('maintenanceSchedules').where('nextDue', '<=', now.toISOString()).get()

  if (snap.empty) {
    logger.info('No schedules due.')
    return
  }

  let created = 0
  for (const doc of snap.docs) {
    const s = doc.data() as {
      assetId?: string
      assetName?: string
      title?: string
      frequencyDays?: number
      meterInterval?: number | null
    }

    // Skip pure meter-interval schedules here (handled on meter entry).
    if (s.meterInterval && s.frequencyDays == null) continue

    const createdAt = new Date().toISOString()
    await db.collection('workorders').add({
      assetId: s.assetId ?? '',
      assetName: s.assetName ?? '',
      title: `${s.title ?? 'Scheduled maintenance'} (auto)`,
      description: `Raised by the maintenance scheduler.`,
      priority: 'medium',
      status: 'open',
      assignedTo: 'Unassigned',
      triggerType: 'calendar',
      offlineCreated: false,
      createdAt,
      completedAt: null,
      updatedAt: createdAt,
    })

    // Roll forward.
    const next = new Date(now.getTime() + (s.frequencyDays ?? 30) * 86_400_000)
    await doc.ref.update({
      lastExecuted: createdAt,
      nextDue: next.toISOString(),
    })
    created++
  }

  logger.info(`Scheduler created ${created} work order(s).`)
})