import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { auth, db } from './index'

const ROLES = ['admin', 'manager', 'technician', 'viewer'] as const
type Role = (typeof ROLES)[number]

interface SetRoleRequest {
  targetUid: string
  role: Role
}

/**
 * setUserRole - Admin-only callable that grants a role.
 *
 * Roles are applied twice for defense in depth:
 *  1. Firebase Auth custom claims (read by firestore.rules at request time)
 *  2. The /users/{uid} profile document (read by the UI + cached role)
 */
export const setUserRole = onCall<SetRoleRequest, { ok: true }>(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')

  const callerClaims = caller.token?.role
  if (callerClaims !== 'admin') {
    throw new HttpsError('permission-denied', 'Only administrators can change roles.')
  }

  const { targetUid, role } = request.data
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required.')
  if (!ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Role must be one of ${ROLES.join(', ')}.`)
  }

  try {
    await auth.setCustomUserClaims(targetUid, { role })
    await db.collection('users').doc(targetUid).set(
      { role, status: 'active', updatedAt: new Date().toISOString() },
      { merge: true },
    )
    await db.collection('auditLog').add({
      actorUid: caller.uid,
      actorEmail: caller.token.email ?? 'unknown',
      action: 'role_change',
      target: `users/${targetUid}`,
      detail: `granted ${role}`,
      ts: Date.now(),
    })
  } catch (err) {
    logger.error('Failed to set role', err)
    throw new HttpsError('internal', 'Could not update role.')
  }

  return { ok: true }
})