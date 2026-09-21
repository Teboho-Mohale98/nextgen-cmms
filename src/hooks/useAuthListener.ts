import * as React from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/firebaseConfig'
import { useAuthStore } from '@/stores/authStore'
import type { AppUserProfile } from '@/types'

/**
 * Single source of truth for the auth session:
 *  - Firebase Auth state changes
 *  - Realtime profile document (drives the RBAC role for the UI)
 * Mount once at the app root.
 */
export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setLoading = useAuthStore((s) => s.setLoading)

  React.useEffect(() => {
    let unsubProfile: (() => void) | null = null

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setUser(user)
      if (unsubProfile) {
        unsubProfile()
        unsubProfile = null
      }

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        unsubProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            const profile: AppUserProfile | null = snap.exists()
              ? {
                  uid: user.uid,
                  email: user.email ?? '',
                  displayName: (snap.data()?.displayName as string) ?? null,
                  role: (snap.data()?.role as AppUserProfile['role']) ?? 'viewer',
                  status: 'active',
                  createdAt: (snap.data()?.createdAt as string) ?? new Date().toISOString(),
                }
              : null
            setProfile(profile)
            setLoading(false)
          },
          (err) => {
            console.warn('[cmms] profile listener error', err)
            setProfile(null)
            setLoading(false)
          },
        )
      } catch (err) {
        console.warn('[cmms] failed to attach profile listener', err)
        setLoading(false)
      }
    })

    return () => {
      unsubscribe()
      unsubProfile?.()
    }
  }, [setProfile, setLoading, setUser])
}