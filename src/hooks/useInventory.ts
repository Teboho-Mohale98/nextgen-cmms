import { orderBy, query } from 'firebase/firestore'
import { useCollectionLive } from '@/hooks/useFirestoreLive'
import { partsRef } from '@/services/inventory'
import type { InventoryPart } from '@/types'

export function useParts(): InventoryPart[] {
  return useCollectionLive<InventoryPart>('parts:all', () =>
    query(partsRef(), orderBy('partNumber', 'asc')),
  )
}

export interface PartHealth {
  part: InventoryPart
  belowReorder: boolean
  low: boolean
  value: number
  status: 'healthy' | 'low' | 'critical'
}

export function usePartHealth(parts: InventoryPart[]): PartHealth[] {
  return parts.map((part) => {
    const belowReorder = part.quantityOnHand < part.minReorderPoint
    const low = part.quantityOnHand < part.minReorderPoint * 1.5
    return {
      part,
      belowReorder,
      low,
      value: part.quantityOnHand * part.cost,
      status: belowReorder ? ('critical' as const) : low ? ('low' as const) : ('healthy' as const),
    }
  })
}

export function summarizeParts(parts: InventoryPart[]): {
  totalParts: number
  totalValue: number
  lowStock: number
  critical: number
} {
  let totalValue = 0
  let lowStock = 0
  let critical = 0
  for (const p of parts) {
    totalValue += p.quantityOnHand * p.cost
    if (p.quantityOnHand < p.minReorderPoint) {
      critical++
      lowStock++
    } else if (p.quantityOnHand < p.minReorderPoint * 1.5) {
      lowStock++
    }
  }
  return { totalParts: parts.length, totalValue, lowStock, critical }
}