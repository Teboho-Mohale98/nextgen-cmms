import { collection, doc, getDocs, limit, query, writeBatch } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { buildSeedPayload, type SeedDocument } from '@/utils/seed/seedPayload'

export interface SeedProgress {
  label: string
  pct: number
}

export interface SeedResult {
  skipped: boolean
  assets: number
  workOrders: number
  parts: number
  schedules: number
  monitoring: number
  total: number
}

/**
 * One-click demo dataset injector. Idempotent: if any assets exist it
 * does nothing unless `force` is set (explicit wipe-then-load).
 */
export async function seedDemoData(
  opts: { force?: boolean; onProgress?: (p: SeedProgress) => void } = {},
): Promise<SeedResult> {
  const { force = false, onProgress } = opts

  if (!force) {
    const existing = await getDocs(query(collection(db, 'assets'), limit(1)))
    if (!existing.empty) {
      return {
        skipped: true,
        assets: 0,
        workOrders: 0,
        parts: 0,
        schedules: 0,
        monitoring: 0,
        total: 0,
      }
    }
  }

  const payload = buildSeedPayload()
  const documents = payload.documents
  const counts = countByCollection(documents)

  // Firestore writeBatch caps at 500 ops per batch.
  const batches: SeedDocument[][] = []
  for (let i = 0; i < documents.length; i += 400) {
    batches.push(documents.slice(i, i + 400))
  }

  for (let b = 0; b < batches.length; b++) {
    const batchDocs = batches[b]
    const batch = writeBatch(db)
    for (const docDesc of batchDocs) {
      batch.set(doc(db, docDesc.collection, docDesc.id), docDesc.data, { merge: false })
    }
    onProgress?.({
      label: `Writing batch ${b + 1}/${batches.length}…`,
      pct: Math.round(((b + 1) / batches.length) * 100),
    })
    await batch.commit()
  }

  return {
    skipped: false,
    assets: counts.assets,
    workOrders: counts.workOrders,
    parts: counts.inventoryParts,
    schedules: counts.maintenanceSchedules,
    monitoring: counts.monitoring,
    total: documents.length,
  }
}

function countByCollection(documents: SeedDocument[]): Record<string, number> {
  const out: Record<string, number> = { assets: 0, workorders: 0, inventoryParts: 0, maintenanceSchedules: 0, monitoring: 0 }
  for (const d of documents) out[d.collection] = (out[d.collection] ?? 0) + 1
  return out
}