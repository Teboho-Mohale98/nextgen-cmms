import { Outlet, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '@/config/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'
import { ToastViewport } from '@/components/ui/toast'

function titleFor(pathname: string): string {
  if (pathname.startsWith('/assets/')) return 'Asset Detail'
  const match = NAV_ITEMS.find(
    (item) =>
      item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
  )
  return match?.label ?? 'NextGen CMMS'
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-60">
        <TopHeader title={titleFor(pathname)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  )
}