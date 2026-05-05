'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Shield,
  History,
  Activity,
  Search,
  BookOpen,
  Menu,
  X,
  User,
  LogOut,
  ChevronRight,
  // New icons for organizer pages
  CalendarDays,
  Ticket,
  Armchair,
  ShoppingCart,
  QrCode,
  Users,
  Store,
  DoorOpen,
  Wallet,
  Building2,
  Banknote,
  ClipboardList,
  CreditCard,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'

// ============================================================
// Navigation Config — Grouped sections
// ============================================================

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/organizer/dashboard', icon: LayoutDashboard },
      { title: 'My Event', href: '/organizer/my-event', icon: CalendarDays },
    ],
  },
  {
    label: 'Ticketing',
    items: [
      { title: 'Ticket Types', href: '/organizer/ticket-types', icon: Ticket },
      { title: 'Seat Layout', href: '/organizer/seat-layout', icon: Armchair },
      { title: 'My Orders', href: '/organizer/my-orders', icon: ShoppingCart },
      { title: 'My Tickets', href: '/organizer/my-tickets', icon: QrCode },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'My Staff', href: '/organizer/my-staff', icon: Users },
      { title: 'My Counters', href: '/organizer/my-counters', icon: Store },
      { title: 'My Gates', href: '/organizer/my-gates', icon: DoorOpen },
      { title: 'Live Monitor', href: '/organizer/live-monitor', icon: Activity },
      { title: 'Redeem', href: '/organizer/redeem', icon: Shield },
      { title: 'Redeem History', href: '/organizer/redeem-history', icon: History },
      { title: 'Check Ticket', href: '/organizer/check-ticket', icon: Search },
      { title: 'Wristband Guide', href: '/organizer/wristband-guide', icon: BookOpen },
    ],
  },
  {
    label: 'Finance',
    items: [
      { title: 'Finance', href: '/organizer/finance', icon: Wallet },
      { title: 'Bank Account', href: '/organizer/bank-account', icon: Building2 },
      { title: 'Withdraw', href: '/organizer/withdraw', icon: Banknote },
      { title: 'Withdrawal History', href: '/organizer/withdrawal-history', icon: ClipboardList },
      { title: 'Payment Logs', href: '/organizer/payment-logs', icon: CreditCard },
      { title: 'Refunds', href: '/organizer/refunds', icon: RotateCcw },
    ],
  },
]

// ============================================================
// Component
// ============================================================

interface OrganizerLayoutProps {
  children: React.ReactNode
}

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  const isActive = (href: string) => {
    if (href === '/organizer/dashboard') return pathname === '/organizer/dashboard'
    return pathname.startsWith(href)
  }

  const staffName = user?.name ?? 'Organizer'
  const staffRole = user?.role === 'ORGANIZER' ? 'Organizer' : (user?.role === 'ADMIN' ? 'Admin' : String(user?.role ?? ''))

  return (
    <div className="min-h-screen bg-[#0A0F0E]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-[#111918] border-r border-white/5 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header — Teal accent bar */}
        <div className="h-1.5 bg-[#00A39D]" />
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/5">
          <Link href="/organizer/dashboard" className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#00A39D]" />
            <span className="font-bold text-base tracking-tight text-white">
              SHEILA ON 7
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white/60 hover:text-white hover:bg-white/5"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Station Info */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#00A39D]/20 text-[#00A39D] text-xs font-bold">
                {staffName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{staffName}</p>
              <p className="text-[11px] text-[#7FB3AE] truncate">{staffRole}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <ScrollArea className="h-[calc(100vh-11rem)]">
          <nav className="p-3 space-y-4">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7FB3AE]/50">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          active
                            ? 'bg-[#00A39D] text-white'
                            : 'text-[#7FB3AE] hover:bg-white/5 hover:text-white'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {active && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 bg-[#111918]">
          <div className="px-4 py-3">
            <p className="text-[10px] text-[#7FB3AE]/60 text-center">
              Sheila On 7 — Tour 2026
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 h-14 bg-[#0A0F0E]/95 backdrop-blur border-b border-white/5">
          <div className="flex items-center justify-between h-full px-4">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/60 hover:text-white hover:bg-white/5"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3 ml-auto">
              {/* User info in header */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#7FB3AE]">
                <User className="w-3.5 h-3.5" />
                <span>{staffName}</span>
                <Separator orientation="vertical" className="h-3 bg-white/10" />
                <span className="text-[#00A39D] font-medium">{staffRole}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
