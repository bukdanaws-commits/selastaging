'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingCart,
  ScanLine,
  Users,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  UserCog,
  DoorOpen,
  Wallet,
  RotateCcw,
  Building2,
  Armchair,
  Ticket,
  History,
  Gift,
  CircleCheckBig,
  Palette,
  Landmark,
  ArrowDownToLine,
  Receipt,
  FileCheck,
  FileText,
  UserPlus,
  Radio,
  Monitor,
  Store,
  UserCircle,
  Shield,
  ArrowLeftRight,
  Tag,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore, ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/auth-store'
import { isMockMode } from '@/lib/api'
import { useAdminEvents } from '@/hooks/use-api'
import { getNavSectionsForRole, type NavSection, type NavItem } from '@/lib/nav-config'
import type { UserRole } from '@/lib/types'

// ─── ICON MAP ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  CalendarDays,
  ShoppingCart,
  ScanLine,
  Users,
  Activity,
  BarChart3,
  Settings,
  UserCog,
  DoorOpen,
  Wallet,
  RotateCcw,
  Building2,
  Armchair,
  Ticket,
  History,
  Gift,
  CircleCheckBig,
  Palette,
  Landmark,
  ArrowDownToLine,
  Receipt,
  FileCheck,
  FileText,
  UserPlus,
  Radio,
  Monitor,
  Store,
  Tag,
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────

interface AdminLayoutProps {
  children: React.ReactNode
  onExit?: () => void
}

export function AdminLayout({ children, onExit }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout, hasRole, selectedEventId, setSelectedEvent, loginAsRole } = useAuthStore()

  // ─── Event selector data ─────────────────────────────────────────────
  // Always fetch events from API. In mock mode, the mock handler provides events.
  // In production, the real backend returns events with UUIDs.
  const { data: apiEvents, isLoading: eventsLoading, error: eventsError } = useAdminEvents()

  const eventsForSelector = useMemo(() => {
    if (apiEvents && Array.isArray(apiEvents)) {
      return (apiEvents as Record<string, unknown>[]).map((event) => ({
        id: String(event.id),
        name: String(event.title || event.slug || 'Unnamed Event'),
        slug: event.slug ? String(event.slug) : undefined,
      }))
    }
    return []
  }, [apiEvents])

  // Auto-select the first event if none is selected yet
  useEffect(() => {
    if (!selectedEventId && eventsForSelector.length > 0) {
      setSelectedEvent(eventsForSelector[0].id)
    }
  }, [selectedEventId, eventsForSelector, setSelectedEvent])

  const userRole = user?.role ?? 'SUPER_ADMIN'
  const userName = user?.name ?? 'User'
  const userEmail = user?.email ?? ''
  const userAvatar = user?.avatar
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // Get role-filtered navigation
  const navSections = getNavSectionsForRole(userRole)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  // ─── Role Switcher (Mock Mode) ─────────────────────────────────────────
  const handleSwitchRole = async (newRole: UserRole) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sele_mock_role', newRole)
    }
    await loginAsRole(newRole)
  }

  // isMockMode is imported from @/lib/api

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
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">
              SELEEVENT
            </span>
          </Link>
          <Badge
            className={cn(
              'text-[10px] px-1.5 py-0',
              ROLE_BADGE_COLORS[userRole] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            )}
          >
            {ROLE_LABELS[userRole]?.toUpperCase() ?? userRole}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Event Selector */}
        {(hasRole('ORGANIZER') || hasRole('SUPER_ADMIN')) && (
          <div className="px-3 py-2 border-b">
            <Select
              value={selectedEventId ?? eventsForSelector[0]?.id ?? ''}
              onValueChange={(val) => setSelectedEvent(val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={
                  eventsLoading ? 'Memuat event...' :
                  eventsError ? 'Gagal memuat event' :
                  eventsForSelector.length === 0 ? 'Tidak ada event' :
                  'Pilih event...'
                } />
              </SelectTrigger>
              <SelectContent>
                {eventsForSelector.map((event) => (
                  <SelectItem key={event.id} value={event.id} className="text-xs">
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
                    const IconComponent = ICON_MAP[item.icon] ?? LayoutDashboard
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
                        <IconComponent className="h-4 w-4 shrink-0" />
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

        {/* Sidebar Footer — User info */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-card">
          <div className="flex items-center gap-3 p-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={logout}
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

            <div className="flex items-center gap-3 ml-auto">
              {/* Role Switcher (Mock Mode Only) */}
              {isMockMode() && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Switch Role</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className={cn(userRole === 'SUPER_ADMIN' && 'bg-accent')}
                      onClick={() => handleSwitchRole('SUPER_ADMIN')}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Super Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn(userRole === 'ORGANIZER' && 'bg-accent')}
                      onClick={() => handleSwitchRole('ORGANIZER')}
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      Organizer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className={cn(userRole === 'COUNTER_STAFF' && 'bg-accent')}
                      onClick={() => { window.location.href = '/counter' }}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      Counter Staff
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn(userRole === 'GATE_STAFF' && 'bg-accent')}
                      onClick={() => { window.location.href = '/gate' }}
                    >
                      <DoorOpen className="mr-2 h-4 w-4" />
                      Gate Staff
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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
                      <AvatarImage src={userAvatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">{userName}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{userName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          ROLE_BADGE_COLORS[userRole]
                        )}
                      >
                        {ROLE_LABELS[userRole]}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {hasRole('SUPER_ADMIN') && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Pengaturan
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={logout}>
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
