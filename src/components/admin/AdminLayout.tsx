'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  Ticket,
  Users,
  Monitor,
  BarChart3,
  Settings,
  Grid3X3,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  AlertCircle,
  Activity,
  Store,
  DoorOpen,
  UserCog,
  UserCheck,
  Wallet,
  CreditCard,
  RefreshCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ============================================================
// Navigation Config
// ============================================================

interface NavSection {
  label: string
  items: {
    title: string
    href: string
    icon: React.ElementType
    badge?: number | string
  }[]
}

const navSections: NavSection[] = [
  {
    label: 'Utama',
    items: [
      { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { title: 'Organizers', href: '/admin/organizers', icon: UserCheck },
      { title: 'Events', href: '/admin/events', icon: Calendar },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { title: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { title: 'Tickets & Gelang', href: '/admin/tickets', icon: Ticket },
      { title: 'Kursi & Layout', href: '/admin/seats', icon: Grid3X3 },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { title: 'Crew & Gates', href: '/admin/crew-gates', icon: Users },
      { title: 'Kelola Konter', href: '/admin/counters', icon: Store },
      { title: 'Kelola Gate', href: '/admin/gate-management', icon: DoorOpen },
      { title: 'Staff & Role', href: '/admin/staff', icon: UserCog },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { title: 'Withdrawals', href: '/admin/withdrawals', icon: Wallet },
      { title: 'Payment Logs', href: '/admin/payment-logs', icon: CreditCard },
      { title: 'Refunds', href: '/admin/refunds', icon: RefreshCcw },
    ],
  },
  {
    label: 'D-Day',
    items: [
      {
        title: 'Gate Monitoring',
        href: '/admin/gate-monitoring',
        icon: Monitor,
        badge: 4,
      },
      { title: 'Live Monitor', href: '/admin/live-monitor', icon: Activity },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [{ title: 'Settings', href: '/admin/settings', icon: Settings }],
  },
]

// ============================================================
// Component
// ============================================================

interface AdminLayoutProps {
  children: React.ReactNode
  onExit?: () => void
}

export function AdminLayout({ children, onExit }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg tracking-tight">
                SHEILA ON 7
              </span>
            </div>
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
              ADMIN
            </Badge>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="p-3 space-y-4">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant={active ? 'secondary' : 'destructive'}
                            className={cn(
                              'text-[10px] px-1.5 py-0 min-w-[20px] justify-center',
                              active && 'bg-primary-foreground/20 text-primary-foreground'
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-card">
          <div className="flex items-center gap-3 p-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                SA
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Super Admin</p>
              <p className="text-xs text-muted-foreground truncate">
                raka@sheilaon7.com
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between h-full px-4">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-4 ml-auto">
              {/* Notification Bell */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>

              {/* Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        SA
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">Super Admin</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Pengaturan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
