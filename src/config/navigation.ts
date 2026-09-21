import {
  LayoutDashboard,
  Network,
  ClipboardList,
  Activity,
  Package,
  CalendarClock,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  section: 'ops' | 'intelligence' | 'system'
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'ops' },
  { to: '/assets', label: 'Asset Hierarchy', icon: Network, section: 'ops' },
  { to: '/workorders', label: 'Work Orders', icon: ClipboardList, section: 'ops' },
  { to: '/monitoring', label: 'Condition Monitoring', icon: Activity, section: 'intelligence' },
  { to: '/inventory', label: 'Parts Inventory', icon: Package, section: 'intelligence' },
  { to: '/schedules', label: 'Maintenance Schedules', icon: CalendarClock, section: 'ops' },
  { to: '/settings', label: 'Settings', icon: Settings, section: 'system' },
]

export const SECTION_LABEL: Record<NavItem['section'], string> = {
  ops: 'Operations',
  intelligence: 'Intelligence',
  system: 'System',
}