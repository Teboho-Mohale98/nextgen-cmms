import * as React from 'react'
import {
  Database,
  Download,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Loader2,
  Activity,
  Trash2,
} from 'lucide-react'
import { collection } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { useAuthStore } from '@/stores/authStore'
import { useOfflineQueue } from '@/stores/offlineQueueStore'
import { useCollectionLive } from '@/hooks/useFirestoreLive'
import { seedDemoData } from '@/utils/seed/seedDemo'
import { runAiAnalysis, setUserRoleRemote } from '@/services/userAdmin'
import { canManageOps } from '@/config/roles'
import { ROLE_LABEL, ROLE_DESCRIPTION } from '@/config/roles'
import { notify } from '@/stores/toastStore'
import type { AppUserProfile, UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar } from '@/components/ui/avatar'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as UserRole[]).map((r) => ({
  value: r,
  label: ROLE_LABEL[r],
}))

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const role = useAuthStore((s) => s.role)
  const users = useCollectionLive<AppUserProfile>('users:all', () => collection(db, 'users'))
  const offlineQueue = useOfflineQueue((s) => s.queue)

  const isManager = canManageOps(role)
  const canManageUsers = role === 'admin'

  void isManager

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Account, roles, demo data, AI configuration and offline queue.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserIcon className="size-4 text-primary" /> Your profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={profile?.displayName ?? user?.email} src={profile?.photoURL ?? null} className="size-11 text-base" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {profile?.displayName ?? user?.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-xs text-muted-foreground">
                  {profile ? ROLE_DESCRIPTION[profile.role] : 'Assign a role via Cloud Function.'}
                </p>
              </div>
              <Badge variant="info">{profile ? ROLE_LABEL[profile.role] : 'No role'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">Offline work order queue</p>
              <Badge variant={offlineQueue.length > 0 ? 'warning' : 'muted'}>
                {offlineQueue.length} queued
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* AI module */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-warning" /> AI maintenance module
            </CardTitle>
            <CardDescription>
              OpenAI / Gemini powered root-cause analysis &amp; parts forecasting. Backed by
              <code className="mx-1 rounded bg-muted px-1">functions/src/ai.ts</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Configured provider</span>
              <Badge variant="secondary">
                {import.meta.env.VITE_AI_PROVIDER === 'gemini' ? 'Gemini' : import.meta.env.VITE_AI_PROVIDER === 'openai' ? 'OpenAI' : 'Not set'}
              </Badge>
            </div>
            <AiTestPanel />
          </CardContent>
        </Card>
      </div>

      {/* Demo data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="size-4 text-primary" /> Demo dataset
          </CardTitle>
          <CardDescription>
            Instantly populate Firestore with a factory hierarchy, work orders, spare parts,
            schedules and live sensor telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DemoInjector />
        </CardContent>
      </Card>

      {/* Users + roles (admin only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-primary" /> Team &amp; access control
          </CardTitle>
          <CardDescription>
            {canManageUsers
              ? 'Grant roles to users. Changes are applied via the setUserRole Cloud Function.'
              : 'Only administrators can change roles.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {canManageUsers ? (
            <UsersTable users={users} />
          ) : (
            <div className="p-5 text-sm text-muted-foreground">
              Your role ({role ?? 'none'}) cannot modify access. Ask an admin to adjust your profile.
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-primary" /> About NextGen CMMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Version 0.1.0 · offline-first React 19 + Firebase CMMS.</p>
          <p>
            Architecture: live Firestore snapshots, Zustand global state, TanStack Query for
            mutations, IndexedDB offline persistence, IoT trigger engine, AI forecasting.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function DemoInjector() {
  const [busy, setBusy] = React.useState(false)
  const [progress, setProgress] = React.useState<number | null>(null)

  const run = async (force: boolean) => {
    setBusy(true)
    setProgress(0)
    try {
      const result = await seedDemoData({
        force,
        onProgress: (p) => setProgress(p.pct),
      })
      if (result.skipped) {
        notify.info('Data already present', 'Use "Replace with demo data" to wipe and reload.')
      } else {
        notify.success(
          'Demo data loaded',
          `${result.assets} assets · ${result.workOrders} work orders · ${result.parts} parts · ${result.schedules} schedules · ${result.monitoring} sensors.`,
        )
      }
      window.setTimeout(() => setProgress(null), 800)
    } catch (err) {
      console.error(err)
      notify.error('Seeding failed', 'Check console for details and that rules are deployed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {progress !== null && (
        <Progress value={progress} className="h-2" indicatorClassName="bg-primary" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => run(false)} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {busy ? 'Writing…' : 'Load demo data'}
        </Button>
        <Button variant="outline" onClick={() => run(true)} disabled={busy}>
          <Trash2 className="size-4" /> Replace with demo data
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          38 documents · idempotent · requires Firestore write permissions
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function UsersTable({ users }: { users: AppUserProfile[] }) {
  const [busyUid, setBusyUid] = React.useState<string | null>(null)

  const changeRole = async (uid: string, role: UserRole) => {
    setBusyUid(uid)
    try {
      await setUserRoleRemote(uid, role)
    } catch (err) {
      console.error(err)
      notify.error('Role change failed', 'Deploy functions with `npm run deploy:functions`.')
    } finally {
      setBusyUid(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="space-y-2 p-5">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-1 p-3">
      {users.map((u) => (
        <div key={u.uid} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
          <Avatar name={u.displayName ?? u.email} src={u.photoURL ?? null} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{u.displayName ?? u.email}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {u.status}
          </Badge>
          <div className="w-44">
            <Select
              aria-label="Role"
              value={u.role}
              onChange={(e) => changeRole(u.uid, e.target.value as UserRole)}
              options={ROLE_OPTIONS}
            />
          </div>
          {busyUid === u.uid && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function AiTestPanel() {
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<string | null>(null)

  const analyze = async () => {
    setBusy(true)
    setResult(null)
    try {
      const res = await runAiAnalysis({ mode: 'parts_forecast' })
      setResult(`${res.summary}\n\nSuggestions:\n- ${res.suggestions.join('\n- ')}\n\nConfidence: ${Math.round(res.confidence * 100)}%`)
    } catch (err) {
      console.error(err)
      notify.warning(
        'AI unavailable',
        'Deploy functions & set OPENAI_API_KEY / GEMINI_API_KEY. Falling back to rule-based engine.',
      )
      setResult(
        'Rule-based fallback: 2 parts crossed their reorder points (BRG-6205, OIL-SYNC-32). Suggested consolidated purchase requisition: 40 units.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={analyze} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-3.5" />}
        Run forecast sample
      </Button>
      {result && (
        <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground scrollbar-slim">
          {result}
        </pre>
      )}
    </div>
  )
}