'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ScanLine, Clock, Info, Activity, LogOut, BookOpen, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useCounterStatus } from '@/hooks/use-api'
import { useAuthStore } from '@/lib/auth-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// ============================================================
// Navigation Config
// ============================================================

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { title: 'Scan', href: '/counter', icon: ScanLine },
  { title: 'Riwayat', href: '/counter/riwayat', icon: Clock },
  { title: 'Status', href: '/counter/status', icon: Info },
  { title: 'Panduan', href: '/counter/guide', icon: BookOpen },
  { title: 'Bantuan', href: '/counter/help', icon: HelpCircle },
]

// ============================================================
// Component
// ============================================================

interface CounterLayoutProps {
  children: React.ReactNode
}

export function CounterLayout({ children }: CounterLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: statusData } = useCounterStatus()

  const isActive = (href: string) => {
    if (href === '/counter') return pathname === '/counter'
    return pathname.startsWith(href)
  }

  // Get staff/counter info from API
  const counterInfo = statusData?.counter as Record<string, unknown> | undefined
  const statsInfo = statusData?.stats as Record<string, unknown> | undefined

  const staffName = user?.name ?? (statsInfo?.staffName as string) ?? 'Counter Staff'
  const counterName = (counterInfo?.name as string) ?? 'Counter'
  const shift = (statsInfo?.shift as string) ?? ''

  const initials = staffName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[#0A0F0E] flex flex-col">
      {/* ── Compact Top Header ── */}
      <header className="sticky top-0 z-40 bg-[#111918]/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Brand + Counter info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm tracking-tight text-foreground">
                SHEILA ON 7
              </span>
            </div>
            <Separator orientation="vertical" className="h-5 bg-border/50" />
            <Badge
              variant="outline"
              className="text-[11px] px-2 py-0 border-primary/30 text-primary bg-primary/5"
            >
              {counterName}
            </Badge>
          </div>

          {/* Right: Staff info + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-foreground">
                {staffName}
              </span>
              <span className="text-[10px] text-muted-foreground">{shift}</span>
            </div>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#111918] border-border/50">
                <AlertDialogHeader>
                  <AlertDialogTitle>Keluar dari sesi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anda akan keluar dari dashboard counter. Pastikan semua
                    penukaran gelang sudah selesai diproses.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => router.push('/')}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Keluar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* ── Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111918]/98 backdrop-blur border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 w-full h-full transition-colors relative',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-b-full" />
                )}
                <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    active && 'font-semibold'
                  )}
                >
                  {item.title}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
