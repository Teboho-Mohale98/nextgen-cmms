/** Core domain types for the NextGen CMMS. Mirrors the Firestore schema. */

export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer'

export type AssetStatus = 'operational' | 'degraded' | 'down'

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical'

export type WorkOrderStatus = 'open' | 'in_progress' | 'completed'

export type WorkOrderTrigger = 'calendar' | 'meter' | 'iot_sensor' | 'manual'

export type BreachCode = 'HOT' | 'VIBRATION' | 'RUN_HOURS' | 'NORMAL'

export interface AssetMetrics {
  runHours: number
  temp: number
  vibration: number
  updatedAt: string
}

export interface SensorThresholds {
  tempMax: number
  vibrationMax: number
  runHoursMax: number
}

export interface Asset {
  id: string
  name: string
  location: string
  parentId: string | null
  category?: string
  status: AssetStatus
  qrCode: string
  healthScore: number
  thresholds: SensorThresholds
  metrics: AssetMetrics
  createdAt: string
  updatedAt: string
}

export interface WorkOrder {
  id: string
  assetId: string
  assetName?: string
  title: string
  description?: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  assignedTo: string
  triggerType: WorkOrderTrigger
  offlineCreated: boolean
  notes?: string
  createdAt: string
  completedAt: string | null
  updatedAt: string
}

export interface InventoryPart {
  id: string
  partNumber: string
  name: string
  quantityOnHand: number
  minReorderPoint: number
  cost: number
  assignedAssets: string[]
  reorderQty?: number
  updatedAt: string
}

export interface MaintenanceSchedule {
  id: string
  assetId: string
  assetName?: string
  title: string
  frequencyDays: number
  meterInterval: number | null
  lastExecuted: string | null
  nextDue: string
  updatedAt: string
}

export interface SensorReading {
  id: string
  assetId: string
  temp: number
  vibration: number
  runHours: number
  breached: BreachCode[]
  ts: number
}

export interface MonitoringDoc {
  assetId: string
  name: string
  location: string
  temp: number
  vibration: number
  runHours: number
  breached: BreachCode[]
  thresholds: SensorThresholds
  status: AssetStatus
  lastReadingAt: number
  readCount: number
  enabled: boolean
}

export interface AuditLogEntry {
  id: string
  actorUid: string
  actorEmail: string
  action: string
  target: string
  detail?: string
  ts: number
}

export interface AppUserProfile {
  uid: string
  email: string
  displayName?: string
  role: UserRole
  status: 'active' | 'pending' | 'disabled'
  photoURL?: string
  createdAt: string
}

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant: 'default' | 'destructive' | 'success' | 'warning'
  dismissible?: boolean
}

export interface OfflineWorkOrderDraft {
  id: string
  createdAt: number
  queuedAt: number
  payload: Omit<WorkOrder, 'id' | 'createdAt' | 'completedAt' | 'updatedAt'>
}

/** Human + machine labels shared across modules. */
export const WORK_ORDER_STATUSES: WorkOrderStatus[] = ['open', 'in_progress', 'completed']

export const PRIORITY_ORDER: WorkOrderPriority[] = ['low', 'medium', 'high', 'critical']

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
}