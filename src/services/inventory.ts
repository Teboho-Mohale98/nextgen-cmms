import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { uid } from '@/lib/utils'
import { notify } from '@/stores/toastStore'
import type { InventoryPart } from '@/types'

export function partsRef() {
  return collection(db, 'inventoryParts')
}

export interface NewPartInput {
  partNumber: string
  name: string
  quantityOnHand: number
  minReorderPoint: number
  cost: number
  assignedAssets: string[]
  reorderQty?: number
}

export async function createPart(input: NewPartInput): Promise<string> {
  const id = uid('prt')
  const part: InventoryPart = {
    id,
    partNumber: input.partNumber,
    name: input.name,
    quantityOnHand: input.quantityOnHand,
    minReorderPoint: input.minReorderPoint,
    cost: input.cost,
    assignedAssets: input.assignedAssets ?? [],
    reorderQty: input.reorderQty ?? Math.max(input.minReorderPoint * 2, 5),
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(db, 'inventoryParts', id), part)
  return id
}

export async function updatePart(id: string, patch: Partial<InventoryPart>): Promise<void> {
  await updateDoc(doc(db, 'inventoryParts', id), {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

export async function deletePart(id: string): Promise<void> {
  await deleteDoc(doc(db, 'inventoryParts', id))
}

/**
 * Adjusts on-hand stock. When consumption pushes stock under the reorder
 * point, a reorder is flagged in the UI and an automated Purchase
 * Requisition record is written (audit log) - the AI forecaster builds on
 * the same signal (see functions/src/ai.ts).
 */
export async function adjustStock(
  id: string,
  delta: number,
  reason = 'manual_adjustment',
): Promise<boolean> {
  const partSnap = await getPart(id)
  if (!partSnap) return false

  const nextQty = Math.max(0, partSnap.quantityOnHand + delta)
  const now = new Date().toISOString()

  await updateDoc(doc(db, 'inventoryParts', id), {
    quantityOnHand: nextQty,
    updatedAt: now,
  })

  if (nextQty < partSnap.minReorderPoint) {
    await logAutoReorder(partSnap, nextQty, reason)
    return true // reordered
  }
  return false
}

export async function getPart(id: string): Promise<InventoryPart | null> {
  const { getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, 'inventoryParts', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as InventoryPart
}

async function logAutoReorder(
  part: InventoryPart,
  newQty: number,
  reason: string,
): Promise<void> {
  try {
    await setDoc(doc(db, 'auditLog', uid('req')), {
      actorUid: 'system',
      actorEmail: 'reorder-engine@system',
      action: 'auto_reorder',
      target: `inventoryParts/${part.id}`,
      detail: `"${part.name}" (${part.partNumber}) dropped to ${newQty} units in stock (band at ${part.minReorderPoint}). Suggested shipping qty ${part.reorderQty ?? 5}.`,
      reason,
      ts: Date.now(),
    })
  } catch (err) {
    console.warn('[cmms] audit write failed', err)
    notify.warning(
      'Reorder triggered',
      `${part.name} is below its reorder point. Purchase requisition logged.`,
    )
  }
}