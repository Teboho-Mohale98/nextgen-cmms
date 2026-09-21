import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions'
import { db } from './index'

interface Reading {
  assetId?: string
  temp?: number
  vibration?: number
  runHours?: number
  breached?: string[]
  ts?: number
}

/**
 * Server-side IoT trigger engine.
 *
 * Fires whenever a telemetry sample lands in `sensorReadings/`. For each
 * breached threshold it opens a work order - unless an open/in-progress
 * IoT work order already exists for the same asset + code combination
 * (alert storm protection). Client + server dedupe share the same rule,
 * so workloads never duplicate.
 */
export const onSensorReadingCreated = onDocumentCreated(
  'sensorReadings/{readingId}',
  async (event) => {
    const reading = event.data?.data() as Reading | undefined
    if (!reading?.assetId) return
    const breached: string[] = reading.breached ?? []
    if (!breached.length || breached.includes('NORMAL')) return

    const assetSnap = await db.collection('assets').doc(reading.assetId).get()
    if (!assetSnap.exists) return
    const asset = assetSnap.data() as { name?: string; location?: string; status?: string }

    for (const code of breached) {
      const existing = await db
        .collection('workorders')
        .where('assetId', '==', reading.assetId)
        .where('triggerType', '==', 'iot_sensor')
        .where('status', 'in', ['open', 'in_progress'])
        .get()

      if (existing.size > 0) {
        logger.info(`Dedup: open IoT work orders exist for ${reading.assetId} (${code}).`)
        continue
      }

      const now = new Date().toISOString()
      await db.collection('workorders').add({
        assetId: reading.assetId,
        assetName: asset.name ?? '',
        title: `IoT alert [${code}] — ${asset.name ?? 'Unknown asset'} at ${asset.location ?? '? location?'}`,
        description: `Raised server-side by the sensor reading trigger.\nReading: temp ${reading.temp}°C, vibration ${reading.vibration} mm/s, ${reading.runHours} run hours.`,
        priority: asset.status === 'down' ? 'critical' : 'high',
        status: 'open',
        assignedTo: 'Unassigned',
        triggerType: 'iot_sensor',
        offlineCreated: false,
        createdAt: now,
        completedAt: null,
        updatedAt: now,
      })

      logger.info(`Raised work order for ${reading.assetId} breach ${code}.`)
    }
  },
)