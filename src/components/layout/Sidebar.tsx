import { NavLink, useLocation } from 'react-router-dom'
import { Activity, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, SECTION_LABEL } from '@/config/navigation'
import { useUi } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'

export function Sidebar() {
  const open = useUi((s) => s.sidebarOpen)
  const setOpen = useUi((s) => s.setSidebarOpen)
  const location = useLocation()

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/20">
          <Activity className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
            NextGen CMMS
          </p>
          <p className="text-[11px] text-muted-foreground">Maintenance OS</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-2 scrollbar-slim">
        {(['ops', 'intelligence', 'system'] as const).map((section) => (
          <div key={section}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {SECTION_LABEL[section]}
            </p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.filter((i) => i.section === section).map((item) => {
                const active =
                  item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                      )}
                    >
                      <item.icon className={cn('size-4 shrink-0', active && 'text-primary')} />
                      {item.label}
                      {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-3 py-2.5">
          <div className="flex size-7 items-center justify-center rounded bg-info/15 text-info">
            <Activity className="size-3.5" />
          </div>
          <p className="text-[11px] leading-tight text-muted-foreground">
            Offline-first · IoT-driven
            <br />
            <span className="text-sidebar-foreground">v0.1.0</span>
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar shadow-2xl animate-slide-in-top">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}