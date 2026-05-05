'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Shield,
  MapPin,
  Activity,
  Clock,
  RotateCcw,
  Gauge,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useGateStatus, useGateLogs, useGateProfile } from '@/hooks/use-api'
import { formatTime } from '@/lib/utils'

function getGateTypeBadge(type: string) {
  switch (type) {
    case 'entry': return { label: 'MASUK', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
    case 'exit': return { label: 'KELUAR', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
    default: return { label: 'MASUK / KELUAR', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
  }
}

export default function GateStatusPage() {
  const { data: statusData, isLoading: statusLoading } = useGateStatus()
  const { data: logsData } = useGateLogs()
  const { data: profileData } = useGateProfile()

  // Extract gate info from profile
  const profile = profileData as Record<string, unknown> | undefined
  const gateInfo = profile?.gate as Record<string, unknown> | undefined
  const staffInfo = profile?.staff as Record<string, unknown> | undefined

  // Extract status data
  const gateStatus = statusData as Record<string, unknown> | undefined
  const statsInfo = gateStatus?.stats as Record<string, unknown> | undefined
  const gateDetail = gateStatus?.gate as Record<string, unknown> | undefined

  // Extract logs from paginated response
  const gateLogs = useMemo(() => {
    const data = logsData as { data: unknown[] } | undefined
    return (data?.data ?? []) as Record<string, unknown>[]
  }, [logsData])

  const gateName = (gateDetail?.name as string) ?? (gateInfo?.name as string) ?? 'Gate'
  const gateLocation = (gateDetail?.location as string) ?? (gateInfo?.location as string) ?? '-'
  const gateType = (gateDetail?.type as string) ?? (gateInfo?.type as string) ?? 'both'
  const gateStatusVal = (gateDetail?.status as string) ?? (gateInfo?.status as string) ?? 'active'
  const gateCapacity = (gateDetail?.capacityPerMin as number) ?? 0
  const gateTotalIn = (gateDetail?.totalIn as number) ?? (statsInfo?.totalIn as number) ?? 0
  const lastScan = (gateDetail?.lastScan as string) ?? (statsInfo?.lastScan as string) ?? ''
  const staffName = (staffInfo?.name as string) ?? 'Gate Staff'
  const staffShift = (staffInfo?.shift as string) ?? '-'

  const gateTypeBadge = getGateTypeBadge(gateType)

  const stats = useMemo(() => {
    const totalMasuk = gateLogs.filter(l => String(l.action) === 'IN').length
    const totalKeluar = gateLogs.filter(l => String(l.action) === 'OUT').length
    const reentryCount = gateLogs.filter(l => (l.reentryCount as number) > 0).length
    return { totalMasuk, totalKeluar, inside: totalMasuk - totalKeluar, reentryCount }
  }, [gateLogs])

  // Group logs by hour for chart
  const hourlyData = useMemo(() => {
    const hourMap: Record<string, { in: number; out: number }> = {}
    for (let h = 16; h <= 22; h++) {
      hourMap[String(h)] = { in: 0, out: 0 }
    }
    gateLogs.forEach(log => {
      const ts = String(log.scannedAt ?? log.timestamp ?? '')
      if (!ts) return
      const hour = new Date(ts).getHours()
      const key = String(hour)
      if (hourMap[key]) {
        if (String(log.action) === 'IN') hourMap[key].in++
        else hourMap[key].out++
      }
    })
    return hourMap
  }, [gateLogs])

  const maxHourly = Math.max(
    ...Object.values(hourlyData).map(h => h.in + h.out),
    1
  )

  const { avgScanSpeed, peakHour } = useMemo(() => {
    if (gateLogs.length === 0) return { avgScanSpeed: '0', peakHour: '-' }
    const timestamps = gateLogs.map(l => {
      const ts = String(l.scannedAt ?? l.timestamp ?? '')
      return ts ? new Date(ts).getHours() : 0
    })
    const hours = new Set(timestamps).size || 1
    const avgScanSpeed = (gateLogs.length / hours).toFixed(1)

    let peakH = 16
    let peakCount = 0
    Object.entries(hourlyData).forEach(([h, data]) => {
      const total = data.in + data.out
      if (total > peakCount) {
        peakCount = total
        peakH = parseInt(h)
      }
    })
    return {
      avgScanSpeed,
      peakHour: `${String(peakH).padStart(2, '0')}:00`,
    }
  }, [gateLogs, hourlyData])

  const quickStats = [
    { label: 'Re-entry', value: stats.reentryCount, icon: <RotateCcw className="h-4 w-4 text-amber-400" /> },
    { label: 'Avg Speed', value: `${avgScanSpeed}/jam`, icon: <Gauge className="h-4 w-4 text-[#00A39D]" /> },
    { label: 'Peak Hour', value: peakHour, icon: <TrendingUp className="h-4 w-4 text-purple-400" /> },
  ]

  if (statusLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-48 w-full" />
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
            <Activity className="h-5 w-5 text-[#00A39D]" />
            <h2 className="text-base font-bold">Status Gate</h2>
          </div>

          {/* ── 3 BIG STAT CARDS ── */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-3 text-center">
                  <ArrowDownToLine className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-emerald-400">{stats.totalMasuk}</p>
                  <p className="text-[10px] text-[#7FB3AE]">Total Masuk</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-3 text-center">
                  <ArrowUpFromLine className="h-5 w-5 text-red-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-red-400">{stats.totalKeluar}</p>
                  <p className="text-[10px] text-[#7FB3AE]">Total Keluar</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="bg-[#00A39D]/10 border-[#00A39D]/20">
                <CardContent className="p-3 text-center">
                  <Users className="h-5 w-5 text-[#00A39D] mx-auto mb-1" />
                  <p className="text-xl font-bold text-[#00A39D]">{stats.inside}</p>
                  <p className="text-[10px] text-[#7FB3AE]">Di Dalam Sekarang</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── GATE INFO CARD ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-[#00A39D]" />
                  <h3 className="text-sm font-semibold">Informasi Gate</h3>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7FB3AE]">Nama Gate</span>
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
                    <span className="text-xs text-[#7FB3AE]">Tipe</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${gateTypeBadge.color}`}>
                      {gateTypeBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7FB3AE]">Status</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      gateStatusVal === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {gateStatusVal === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {gateCapacity > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#7FB3AE]">Kapasitas</span>
                      <span className="text-sm">{gateCapacity} orang/menit</span>
                    </div>
                  )}
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7FB3AE]">Total Masuk (semua)</span>
                    <span className="text-sm font-semibold text-emerald-400">{gateTotalIn.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7FB3AE]">Scan Terakhir</span>
                    <span className="text-sm">{lastScan ? formatTime(lastScan) : '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── STAFF ON DUTY CARD ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-[#00A39D]" />
                  <h3 className="text-sm font-semibold">Petugas Bertugas</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00A39D]/20 text-[#00A39D] text-sm font-bold shrink-0">
                    {staffName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{staffName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-[#00A39D]/15 text-[#00A39D] border-[#00A39D]/20">
                        Gate Staff
                      </span>
                      <span className="text-[10px] text-[#7FB3AE]">Shift: {staffShift}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── TODAY'S ACTIVITY CHART ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#00A39D]" />
                    <h3 className="text-sm font-semibold">Aktivitas Hari Ini</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[9px] text-[#7FB3AE]">IN</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[9px] text-[#7FB3AE]">OUT</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(hourlyData).map(([hour, data]) => {
                    const total = data.in + data.out
                    if (total === 0 && parseInt(hour) < 17) return null
                    return (
                      <div key={hour} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#7FB3AE] w-8 text-right shrink-0">{String(hour).padStart(2, '0')}:00</span>
                        <div className="flex-1 flex gap-0.5 h-6 rounded-md overflow-hidden bg-white/5">
                          {data.in > 0 && <div className="bg-emerald-400/80 rounded-l-md transition-all" style={{ width: `${(data.in / (maxHourly || 1)) * 100}%` }} />}
                          {data.out > 0 && <div className="bg-red-400/80 rounded-r-md transition-all" style={{ width: `${(data.out / (maxHourly || 1)) * 100}%`, marginLeft: data.in > 0 ? 2 : 0 }} />}
                        </div>
                        <span className="text-[10px] text-[#7FB3AE] w-6 text-right shrink-0">{total}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── QUICK STATS ROW ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="bg-[#111918] border-white/5">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                  {quickStats.map(item => (
                    <div key={item.label} className="text-center">
                      <div className="flex items-center justify-center mb-1.5">{item.icon}</div>
                      <p className="text-sm font-bold">{item.value}</p>
                      <p className="text-[10px] text-[#7FB3AE]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  )
}
