import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { uid } from '@/lib/utils'
import type { Asset, AssetMetrics, AssetStatus, SensorThresholds } from '@/types'

export const DEFAULT_THRESHOLDS: SensorThresholds = {
  tempMax: 75,
  vibrationMax: 5,
  runHoursMax: 120,
}

export interface NewAssetInput {
  name: string
  location: string
  parentId: string | null
  category?: string
  thresholds?: Partial<SensorThresholds>
}

export function assetsRef() {
  return collection(db, 'assets')
}

export async function createAsset(input: NewAssetInput): Promise<string> {
  const id = uid('ast')
  const now = new Date().toISOString()
  const asset: Asset = {
    id,
    name: input.name,
    location: input.location,
    parentId: input.parentId ?? null,
    category: input.category ?? 'Asset',
    status: 'operational',
    qrCode: `NGCMNS-${id.toUpperCase()}`,
    healthScore: 100,
    thresholds: { ...DEFAULT_THRESHOLDS, ...input.thresholds },
    metrics: { runHours: 0, temp: 24, vibration: 0.4, updatedAt: now },
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(doc(db, 'assets', id), asset)
  return id
}

export async function updateAsset(id: string, patch: Partial<Asset>): Promise<void> {
  await updateDoc(doc(db, 'assets', id), { ...patch, updatedAt: new Date().toISOString() })
}

export async function patchAssetMetrics(id: string, metrics: Partial<AssetMetrics>): Promise<void> {
  await updateDoc(doc(db, 'assets', id), {
    metrics: { ...metrics, updatedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  })
}

export async function setAssetStatus(id: string, status: AssetStatus): Promise<void> {
  await updateDoc(doc(db, 'assets', id), { status, updatedAt: new Date().toISOString() })
}

export async function deleteAsset(id: string): Promise<void> {
  await deleteDoc(doc(db, 'assets', id))
}

export async function deleteAssetWithChildren(id: string, assets: Asset[]): Promise<void> {
  // Recursively delete an asset + descendants (explicitly chosen operation).
  const descendants = new Set<string>()
  const queue = [id]
  while (queue.length) {
    const current = queue.shift()!
    descendants.add(current)
    assets.forEach((a) => {
      if (a.parentId === current && !descendants.has(a.id)) queue.push(a.id)
    })
  }
  await Promise.all([...descendants].map((aId) => deleteAsset(aId)))
}

export async function assetExists(id: string | null): Promise<boolean> {
  if (!id) return true // root (null parent) is always valid
  const snap = await getDoc(doc(db, 'assets', id))
  return snap.exists()
}