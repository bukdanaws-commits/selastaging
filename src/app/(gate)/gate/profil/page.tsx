'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  User,
  Shield,
  MapPin,
  QrCode,
  Gauge,
  Phone,
  Headphones,
  Terminal,
  LogOut,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useGateProfile, useGateLogs } from '@/hooks/use-api'
import { useMemo } from 'react'

function getGateTypeBadge(type: string) {
  switch (type) {
    case 'entry': return { label: 'MASUK', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
    case 'exit': return { label: 'KELUAR', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
    default: return { label: 'MASUK / KELUAR', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
  }
}

export default function GateProfilPage() {
  const router = useRouter()
  const { data: profileData, isLoading: profileLoading } = useGateProfile()
  const { data: logsData } = useGateLogs()

  const profile = profileData as Record<string, unknown> | undefined
  const gateInfo = profile?.gate as Record<string, unknown> | undefined
  const staffInfo = profile?.staff as Record<string, unknown> | undefined
  const todayScans = (profile?.todayScans as number) ?? 0

  const staffName = (staffInfo?.name as string) ?? 'Gate Staff'
  const staffId = (staffInfo?.id as string) ?? ''
  const staffShift = (staffInfo?.shift as string) ?? ''
  const staffTotalScans = (staffInfo?.totalScans as number) ?? 0

  const gateName = (gateInfo?.name as string) ?? 'Gate'
  const gateLocation = (gateInfo?.location as string) ?? ''
  const gateType = (gateInfo?.type as string) ?? 'both'

  const gateTypeBadge = getGateTypeBadge(gateType)

  // Calculate avg from logs
  const gateLogs = useMemo(() => {
    const data = logsData as { data: unknown[] } | undefined
    return (data?.data ?? []) as Record<string, unknown>[]
  }, [logsData])

  const avgPerHour = useMemo(() => {
    if (gateLogs.length === 0) return '0'
    const timestamps = gateLogs.map(l => {
      const ts = String(l.scannedAt ?? l.timestamp ?? '')
      return ts ? new Date(ts).getHours() : 0
    })
    const hours = new Set(timestamps).size || 1
    return (gateLogs.length / hours).toFixed(1)
  }, [gateLogs])

  const initials = staffName
    .split(' ')
    .map(n => n[0])
    .join('')

  if (profileLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">
          {/* ── PAGE TITLE ── */}
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#00A39D]" />
            <h2 className="text-base font-bold">Profil</h2>
          </div>

          {/* ── PROFILE HEADER CARD ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#00A39D]/20 text-[#00A39D] text-2xl font-bold mb-3 ring-2 ring-[#00A39D]/30 ring-offset-2 ring-offset-[#111918]">
                    {initials}
                  </div>
                  <h3 className="text-lg font-bold">{staffName}</h3>
                  <p className="text-sm text-[#7FB3AE] mt-0.5">Gate Staff</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#00A39D]/15 text-[#00A39D] border border-[#00A39D]/20">
                      Shift {staffShift ? staffShift.charAt(0).toUpperCase() + staffShift.slice(1) : '-'}
                    </span>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      Aktif
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7FB3AE]/60 mt-2 font-mono">ID: {staffId}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── GATE ASSIGNMENT CARD ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-[#00A39D]" />
                  <h3 className="text-sm font-semibold">Penempatan Gate</h3>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7FB3AE]">Gate Saat Ini</span>
                    <span className="text-sm font-semibold">{gateName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7FB3AE]">Lokasi</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#7FB3AE]" />
                      <span className="text-sm">{gateLocation}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7FB3AE]">Tipe Gate</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${gateTypeBadge.color}`}>
                      {gateTypeBadge.label}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── SESSION STATS CARD ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <QrCode className="h-4 w-4 text-[#00A39D]" />
                  <h3 className="text-sm font-semibold">Statistik Sesi</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <QrCode className="h-5 w-5 text-[#00A39D] mx-auto mb-1.5" />
                    <p className="text-lg font-bold">{todayScans || gateLogs.length}</p>
                    <p className="text-[10px] text-[#7FB3AE]">Total Scan Hari Ini</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <Gauge className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
                    <p className="text-lg font-bold">{avgPerHour}</p>
                    <p className="text-[10px] text-[#7FB3AE]">Rata-rata / Jam</p>
                  </div>
                </div>
                <Separator className="bg-white/5 my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#7FB3AE]">Total Scan (karir)</span>
                  <span className="text-sm font-semibold">{staffTotalScans.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── CONTACT & SUPPORT CARD ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Headphones className="h-4 w-4 text-[#00A39D]" />
                  <h3 className="text-sm font-semibold">Kontak & Bantuan</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00A39D]/10 shrink-0">
                      <User className="h-4 w-4 text-[#00A39D]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#7FB3AE]">Supervisor</p>
                      <p className="text-sm font-medium">Command Center</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-[#7FB3AE]" />
                        <p className="text-xs text-[#7FB3AE]">Hubungi via radio</p>
                      </div>
                    </div>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
                      <Phone className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#7FB3AE]">Event Hotline</p>
                      <p className="text-sm font-medium">021-555-0123</p>
                    </div>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 shrink-0">
                      <Terminal className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#7FB3AE]">Command Center</p>
                      <p className="text-sm font-medium">Ext. 100</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── LOGOUT BUTTON ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Button
              variant="outline"
              className="w-full h-11 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 gap-2"
              onClick={() => router.push('/')}
            >
              <LogOut className="h-4 w-4" />
              Keluar / Logout
            </Button>
          </motion.div>
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  )
}
