import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { collection, doc, getDocs, limit, query, setDoc } from 'firebase/firestore'
import { Activity, Loader2 } from 'lucide-react'
import { db, getAuthClient } from '@/firebaseConfig'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notify } from '@/stores/toastStore'
import type { AppUserProfile } from '@/types'

export function AuthPage() {
  const navigate = useNavigate()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const goHome = () => {
    navigate('/', { replace: true })
  }

  const ensureProfile = async (uid: string): Promise<void> => {
    // First account in the project becomes the bootstrap admin.
    const existing = await getDocs(query(collection(db, 'users'), limit(1)))
    const firstUser = existing.empty

    const profile: AppUserProfile = {
      uid,
      email,
      displayName: displayName.trim() || email.split('@')[0],
      role: firstUser ? 'admin' : 'technician',
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'users', uid), profile)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setBusy(true)
    try {
      await signInWithEmailAndPassword(getAuthClient(), email, password)
      notify.success('Welcome back', `Signed in as ${email}`)
      goHome()
    } catch (err) {
      console.error(err)
      notify.error('Sign in failed', friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(getAuthClient(), email, password)
      await ensureProfile(cred.user.uid)
      notify.success('Account created', 'You are signed in.')
      goHome()
    } catch (err) {
      console.error(err)
      notify.error('Could not create account', friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/25">
            <Activity className="size-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">NextGen CMMS</h1>
          <p className="text-sm text-muted-foreground">
            Offline-first maintenance operating system
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Access your workspace</CardTitle>
            <CardDescription>
              The first account you create is automatically an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email">Email</Label>
                    <Input
                      id="si-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="si-pass">Password</Label>
                    <Input
                      id="si-pass"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-name">Display name</Label>
                    <Input
                      id="su-name"
                      placeholder="Ada Lovelace"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-pass">Password</Label>
                    <Input
                      id="su-pass"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Create account &amp; sign in
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Requires a configured Firebase project - see{' '}
          <code className="rounded bg-muted px-1 py-0.5">.env.example</code> and README.
        </p>
      </div>
    </div>
  )
}

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with that email already exists.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    default:
      return 'Something went wrong. Please try again.'
  }
}