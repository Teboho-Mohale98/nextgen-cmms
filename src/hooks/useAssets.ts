import { doc, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { useCollectionLive, useDocumentLive } from '@/hooks/useFirestoreLive'
import { assetsRef } from '@/services/assets'
import type { Asset } from '@/types'

export function useAssets(): Asset[] {
  return useCollectionLive<Asset>('assets:all', () =>
    query(assetsRef(), orderBy('name', 'asc')),
  )
}

export function useAsset(id?: string): Asset | undefined {
  const safe = id ?? '__none__'
  return useDocumentLive<Asset>(`asset:${safe}`, () => doc(db, 'assets', safe))
}

export function useAssetChildren(parentId: string | null): Asset[] {
  const all = useAssets()
  return all.filter((a) => a.parentId === parentId)
}

/** Builds the parent->child adjacency map once and exposes flat helpers. */
export function useAssetTree(): Asset[] {
  return useAssets()
}

/** Root nodes are assets without a parent or whose parent no longer exists. */
export function rootAssets(assets: Asset[]): Asset[] {
  const ids = new Set(assets.map((a) => a.id))
  return assets.filter((a) => !a.parentId || !ids.has(a.parentId))
}

export function descendantsOf(assets: Asset[], parentId: string): Asset[] {
  const result: Asset[] = []
  const stack = [...assets.filter((a) => a.parentId === parentId)]
  while (stack.length) {
    const current = stack.pop()!
    result.push(current)
    assets.filter((a) => a.parentId === current.id).forEach((a) => stack.push(a))
  }
  return result
}

export function findAssetByQr(assets: Asset[], qr: string): Asset | undefined {
  const norm = qr.trim().toUpperCase()
  return assets.find((a) => a.qrCode.toUpperCase() === norm)
}