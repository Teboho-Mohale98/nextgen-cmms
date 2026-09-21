import { collection, doc, setDoc } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { uid } from '@/lib/utils'
import type { BreachCode, MonitoringDoc, SensorReading, SensorThresholds } from '@/types'

/**
 * Evaluates a raw telemetry reading against thresholds and returns the
 * breach codes (or NORMAL). Shared between the in-app simulator, the edge
 * gateway integration path and the Cloud Functions trigger engine.
 */
export function evaluateBreaches(
  reading: { temp: number; vibration: number; runHours: number },
  thresholds: SensorThresholds,
): BreachCode[] {
  const breached: BreachCode[] = []
  if (reading.temp > thresholds.tempMax) breached.push('HOT')
  if (reading.vibration > thresholds.vibrationMax) breached.push('VIBRATION')
  if (reading.runHours > thresholds.runHoursMax) breached.push('RUN_HOURS')
  if (!breached.length) breached.push('NORMAL')
  return breached
}

export function statusFromBreaches(breached: BreachCode[]): MonitoringDoc['status'] {
  if (breached.includes('HOT') || breached.includes('VIBRATION')) return 'down'
  if (breached.includes('RUN_HOURS')) return 'degraded'
  return 'operational'
}

export function monitoringRef() {
  return collection(db, 'monitoring')
}

export function sensorReadingsRef() {
  return collection(db, 'sensorReadings')
}

/**
 * Ingests one telemetry sample: updates the latest document
 * (`monitoring/{assetId}`) and appends to the append-only readings log.
 */
export async function ingestSensorReading(
  assetId: string,
  reading: { temp: number; vibration: number; runHours: number },
  thresholds: SensorThresholds,
  meta: { name: string; location: string },
): Promise<MonitoringDoc> {
  const breached = evaluateBreaches(reading, thresholds)
  const docData: MonitoringDoc = {
    assetId,
    name: meta.name,
    location: meta.location,
    temp: reading.temp,
    vibration: reading.vibration,
    runHours: reading.runHours,
    breached,
    thresholds,
    status: statusFromBreaches(breached),
    lastReadingAt: Date.now(),
    readCount: 1,
    enabled: true,
  }

  const last = await readMonitoring(assetId)
  if (last) {
    docData.readCount = last.readCount + 1
    docData.enabled = last.enabled
  }

  await setDoc(doc(db, 'monitoring', assetId), docData)

  const logEntry: SensorReading = {
    id: uid('rd'),
    assetId,
    temp: reading.temp,
    vibration: reading.vibration,
    runHours: reading.runHours,
    breached,
    ts: Date.now(),
  }
  await setDoc(doc(db, 'sensorReadings', logEntry.id), logEntry)

  return docData
}

export async function toggleMonitoring(assetId: string, enabled: boolean): Promise<void> {
  await setDoc(doc(db, 'monitoring', assetId), { enabled }, { merge: true })
}

async function readMonitoring(assetId: string): Promise<MonitoringDoc | null> {
  const { getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, 'monitoring', assetId))
  if (!snap.exists()) return null
  return { ...(snap.data() as MonitoringDoc) }
}