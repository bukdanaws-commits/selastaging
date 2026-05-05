'use client'

import { usePathname, useRouter } from 'next/navigation'
import { QrCode, List, Shield, User, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGateProfile } from '@/hooks/use-api'
import { useAuthStore } from '@/lib/auth-store'
import type React from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  activePath: string
}

const navItems: NavItem[] = [
  { href: '/gate', label: 'Scan', icon: <QrCode className="h-5 w-5" />, activePath: '/gate' },
  { href: '/gate/log', label: 'Log', icon: <List className="h-5 w-5" />, activePath: '/gate/log' },
  { href: '/gate/status', label: 'Status', icon: <BarChart3 className="h-5 w-5" />, activePath: '/gate/status' },
  { href: '/gate/profil', label: 'Profil', icon: <User className="h-5 w-5" />, activePath: '/gate/profil' },
]

export function GateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: profileData } = useGateProfile()

  const profile = profileData as Record<string, unknown> | undefined
  const gateInfo = profile?.gate as Record<string, unknown> | undefined
  const staffInfo = profile?.staff as Record<string, unknown> | undefined

  const gateName = (gateInfo?.name as string) ?? 'Gate'
  const gateLocation = (gateInfo?.location as string) ?? ''
  const gateStatus = (gateInfo?.status as string) ?? 'active'
  const gateType = (gateInfo?.type as string) ?? 'both'
  const staffName = user?.name ?? (staffInfo?.name as string) ?? 'Gate Staff'

  const getGateTypeBadge = (type: string) => {
    switch (type) {
      case 'entry':
        return { label: 'MASUK', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
      case 'exit':
        return { label: 'KELUAR', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
      default:
        return { label: 'MASUK / KELUAR', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
    }
  }

  const gateTypeBadge = getGateTypeBadge(gateType)

  return (
    <div className="flex flex-col h-dvh bg-[#0A0F0E] text-white max-w-md mx-auto relative overflow-hidden">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-4 py-3 bg-[#111918] border-b border-white/5">
        <div className="flex items-center justify-between">
          {/* Left: Gate info */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#00A39D]/15">
              <Shield className="h-5 w-5 text-[#00A39D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight">{gateName}</h1>
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                    gateTypeBadge.color
                  )}
                >
                  {gateTypeBadge.label}
                </span>
              </div>
              <p className="text-[11px] text-[#7FB3AE] leading-tight">
                {gateLocation} · {gateStatus === 'active' ? 'Aktif' : 'Nonaktif'}
              </p>
            </div>
          </div>

          {/* Right: Staff avatar */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium leading-tight">{staffName}</p>
              <p className="text-[10px] text-[#7FB3AE]">Gate Staff</p>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#00A39D]/20 text-[#00A39D] text-xs font-bold">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* ── BOTTOM NAVIGATION ────────────────────────────────────────────── */}
      <nav className="shrink-0 bg-[#111918] border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {navItems.map((item) => {
            const isActive =
              item.href === '/gate'
                ? pathname === '/gate'
                : pathname.startsWith(item.activePath)
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative',
                  isActive
                    ? 'text-[#00A39D]'
                    : 'text-[#7FB3AE] hover:text-white'
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00A39D] rounded-full" />
                )}
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
