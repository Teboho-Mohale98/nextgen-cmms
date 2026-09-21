import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/firebaseConfig'
import type { AppUserProfile } from '@/types'

interface ProfileOverrides {
  email?: string
  displayName?: string
}

/**
 * Guarantees a `/users/{uid}` profile document exists for a signed-in user.
 *
 * - Idempotent: returns the existing profile untouched when present, so it is
 *   safe to call on every sign-in.
 * - Bootstrap: while no admin exists, the first account is promoted to admin.
 * - Self-healing: accounts whose profile write was blocked (e.g. created
 *   before the Firestore rules were deployed) get a profile on next sign-in.
 */
export async function ensureUserProfile(
  user: User,
  overrides: ProfileOverrides = {},
): Promise<AppUserProfile> {
  const ref = doc(db, 'users', user.uid)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    return existing.data() as AppUserProfile
  }

  const admins = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'admin'), limit(1)),
  )

  const profile: AppUserProfile = {
    uid: user.uid,
    email: overrides.email ?? user.email ?? '',
    displayName:
      overrides.displayName?.trim() || user.displayName || user.email?.split('@')[0] || 'User',
    role: admins.empty ? 'admin' : 'technician',
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  await setDoc(ref, profile)
  return profile
}
