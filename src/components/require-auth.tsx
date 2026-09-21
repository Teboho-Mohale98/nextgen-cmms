import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { can } from '@/config/roles'
import type { UserRole } from '@/types'
import { Loader2 } from 'lucide-react'

/** Waits for the session to load, then redirects anonymous users to /auth. */
export function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading session…</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

/** Route-level RBAC: requires an authenticated user with at least `role`. */
export function RequireRole({ role }: { role: UserRole }) {
  const roleOfUser = useAuthStore((s) => s.role)

  if (!roleOfUser || !can(roleOfUser, role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="text-4xl">🔒</div>
        <p className="text-sm font-medium">Access denied</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Your role (<code className="rounded bg-muted px-1">{roleOfUser ?? 'none'}</code>) does
          not allow viewing this page. Contact an administrator to request elevated access.
        </p>
      </div>
    )
  }

  return <Outlet />
}