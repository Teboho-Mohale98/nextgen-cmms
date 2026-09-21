import * as React from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, getAuthClient, isFirebaseConfigured } from '@/firebaseConfig'
import { ensureUserProfile } from '@/services/profile'
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
  const healing = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false)
      return
    }

    let unsubProfile: (() => void) | null = null

    const unsubscribe = onAuthStateChanged(getAuthClient(), (user: User | null) => {
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
            if (!snap.exists()) {
              // Self-heal: provision a profile for accounts whose initial
              // write was blocked (e.g. created before the rules were live).
              if (!healing.current.has(user.uid)) {
                healing.current.add(user.uid)
                void ensureUserProfile(user).catch((err) => {
                  console.warn('[cmms] profile provisioning failed', err)
                  healing.current.delete(user.uid)
                })
              }
              setProfile(null)
              setLoading(false)
              return
            }

            const profile: AppUserProfile = {
              uid: user.uid,
              email: user.email ?? '',
              displayName: (snap.data()?.displayName as string) ?? null,
              role: (snap.data()?.role as AppUserProfile['role']) ?? 'viewer',
              status: 'active',
              createdAt: (snap.data()?.createdAt as string) ?? new Date().toISOString(),
            }
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