import {
  DEMO_ASSETS,
  DEMO_MONITORING,
  DEMO_PARTS,
  DEMO_SCHEDULES,
  DEMO_WORK_ORDERS,
} from './demoData'
import type { Asset, WorkOrder } from '../../types'

export interface SeedDocument {
  collection: 'assets' | 'workorders' | 'inventoryParts' | 'maintenanceSchedules' | 'monitoring'
  id: string
  data: Record<string, unknown>
}

export interface SeedPayload {
  documents: SeedDocument[]
  /** Maps seed keys (e.g. 'p101') to generated asset ids. */
  assetIds: Record<string, string>
}

/**
 * Resolves the pure demo dataset into Firestore documents. Asset seed
 * keys become deterministic ids (`ast_<key>`) and all references
 * (work orders, schedules, monitoring) are wired to the real ids.
 * Shared by the in-app injector and the CLI.
 */
export function buildSeedPayload(): SeedPayload {
  const documents: SeedDocument[] = []
  const assetIds: Record<string, string> = {}

  for (const asset of DEMO_ASSETS) {
    const id = `ast_${asset.key}`
    assetIds[asset.key] = id
  }
  for (const asset of DEMO_ASSETS) {
    const { key: _key, parentKey, ...rest } = asset
    const data: unknown = {
      ...rest,
      parentId: parentKey ? assetIds[parentKey] : null,
    }
    documents.push({ collection: 'assets', id: assetIds[asset.key], data: data as Record<string, unknown> })
  }

  const resolveAssetId = (ref: string): string => assetIds[ref] ?? ref

  for (const wo of DEMO_WORK_ORDERS) {
    const data: unknown = { ...wo, assetId: resolveAssetId(wo.assetId) }
    documents.push({
      collection: 'workorders',
      id: `wo_${hash(`${wo.assetId}:${wo.title}`)}`,
      data: data as Record<string, unknown>,
    })
  }

  for (const part of DEMO_PARTS) {
    const data: unknown = part
    documents.push({
      collection: 'inventoryParts',
      id: `prt_${hash(part.partNumber)}`,
      data: data as Record<string, unknown>,
    })
  }

  for (const sch of DEMO_SCHEDULES) {
    const data: unknown = { ...sch, assetId: resolveAssetId(sch.assetId) }
    documents.push({
      collection: 'maintenanceSchedules',
      id: `sch_${hash(sch.title)}`,
      data: data as Record<string, unknown>,
    })
  }

  for (const mon of DEMO_MONITORING) {
    const data: unknown = { ...mon, assetId: resolveAssetId(mon.assetId) }
    documents.push({
      collection: 'monitoring',
      id: resolveAssetId(mon.assetId),
      data: data as Record<string, unknown>,
    })
  }

  return { documents, assetIds }
}

/** Stable 6-char hex hash for deterministic ids. */
function hash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(16).padStart(6, '0').slice(0, 6)
}

export type { Asset }
export type { WorkOrder }