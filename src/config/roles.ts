import type { UserRole } from '@/types'

/**
 * Role-based access matrix. Mirrors `firestore.rules` and drives the UI
 * (route guards, button visibility). Order matters: ascending privilege.
 */
export const ROLE_HIERARCHY: UserRole[] = ['viewer', 'technician', 'manager', 'admin']

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Maintenance Manager',
  technician: 'Field Technician',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: 'Full control: users, roles, data & audit trail.',
  manager: 'Create & manage assets, work orders, parts, schedules.',
  technician: 'Execute work orders & update asset runtime state.',
  viewer: 'Read-only visibility for reporting.',
}

export function can(
  actorRole: UserRole | undefined | null,
  required: UserRole,
): boolean {
  if (!actorRole) return false
  return ROLE_HIERARCHY.indexOf(actorRole) >= ROLE_HIERARCHY.indexOf(required)
}

export const canManageOps = (role: UserRole | undefined | null): boolean =>
  can(role, 'manager')

export const canExecuteWork = (role: UserRole | undefined | null): boolean =>
  can(role, 'technician')