import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { AppUserProfile, UserRole } from '@/types'

interface AuthState {
  user: User | null
  profile: AppUserProfile | null
  role: UserRole | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: AppUserProfile | null) => void
  setLoading: (loading: boolean) => void
}

/** Holds the active Firebase user + Firestore profile (role source). */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  role: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile, role: profile?.role ?? null }),
  setLoading: (loading) => set({ loading }),
}))