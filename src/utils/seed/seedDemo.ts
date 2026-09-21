import { collection, doc, getDocs, limit, query, setDoc } from 'firebase/firestore'
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

  // Write one document per request. Batched writes evaluate the rules'
  // role lookup (get/exists) once per document and hit Firestore's
  // per-batched-write document-access limit, which surfaces as
  // "Missing or insufficient permissions". Sequential writes stay well
  // under the limit and let us report the exact failing collection.
  let written = 0
  for (const docDesc of documents) {
    try {
      await setDoc(doc(db, docDesc.collection, docDesc.id), docDesc.data, { merge: false })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed writing ${docDesc.collection}/${docDesc.id} - ${detail}`)
    }
    written++
    onProgress?.({
      label: `Writing ${written}/${documents.length}…`,
      pct: Math.round((written / documents.length) * 100),
    })
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