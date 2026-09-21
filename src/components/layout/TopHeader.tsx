import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { CloudOff, CloudUpload, Wifi, UserCog, Settings, LogOut, Moon, Sun, Menu } from 'lucide-react'
import { auth } from '@/firebaseConfig'
import { useAuthStore } from '@/stores/authStore'
import { useConnectivity } from '@/stores/connectivityStore'
import { useOfflineQueue } from '@/stores/offlineQueueStore'
import { useTheme } from '@/stores/themeStore'
import { useUi } from '@/stores/uiStore'
import { ROLE_LABEL } from '@/config/roles'
import { notify } from '@/stores/toastStore'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown'

export function ConnectivityBadge() {
  const online = useConnectivity((s) => s.online)
  const firestoreConnected = useConnectivity((s) => s.firestoreConnected)
  const pendingWrites = useConnectivity((s) => s.pendingWrites)
  const queueLength = useOfflineQueue((s) => s.queue.length)
  const lastSyncAt = useConnectivity((s) => s.lastSyncAt)

  const connected = online && firestoreConnected
  const pending = pendingWrites > 0 || queueLength > 0

  const Icon = connected ? Wifi : CloudOff
  const label = connected ? 'Online' : 'Offline'

  return (
    <div className="flex items-center gap-2">
      <Badge variant={connected ? 'success' : 'destructive'} className="gap-1.5 sm:gap-2">
        <Icon className="size-3.5" />
        <span className="hidden sm:inline">{label}</span>
        {connected && <span className="text-muted-foreground/70">· synced</span>}
        <span className="sr-only">
          Last sync at {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'never'}
        </span>
      </Badge>
      {pending && (
        <Badge variant="warning" className="gap-1">
          <CloudUpload className="size-3.5" />
          {queueLength + (pendingWrites || 0)} pending
        </Badge>
      )}
    </div>
  )
}

export function TopHeader({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggleTheme)
  const toggleSidebar = useUi((s) => s.toggleSidebar)
  const navigate = useNavigate()

  const displayName =
    profile?.displayName ?? user?.displayName ?? user?.email?.split('@')[0] ?? 'user'

  const handleSignOut = async () => {
    await signOut(auth)
    notify.info('Signed out', 'Your session has ended.')
    navigate('/auth')
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        <Menu className="size-5" />
      </Button>

      <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <ConnectivityBadge />
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu
          align="end"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-accent"
              aria-label="User menu"
            >
              <Avatar name={displayName} src={profile?.photoURL ?? null} />
            </button>
          }
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile ? ROLE_LABEL[profile.role] : 'No role yet'}
            </p>
          </div>
          <DropdownSeparator />
          <DropdownItem onClick={() => navigate('/settings')}>
            <UserCog /> Account
          </DropdownItem>
          <DropdownItem onClick={() => navigate('/settings')}>
            <Settings /> System settings
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={handleSignOut}>
            <LogOut /> Sign out
          </DropdownItem>
        </DropdownMenu>
      </div>
    </header>
  )
}