'use client'

import React, { useRef, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  LogIn,
  LogOut,
  Clock,
  Users,
  ArrowRight,
  ArrowLeft,
  ScanLine,
  Store,
  Watch,
  RefreshCw,
} from 'lucide-react'
import { useOrganizerLiveMonitor, useOrganizerCounters, useOrganizerGates } from '@/hooks/use-api'
import { formatTime } from '@/lib/utils'
import { getSSEClient } from '@/lib/sse'

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function OrganizerLiveMonitor() {
  const feedRef = useRef<HTMLDivElement>(null)
  const [sseConnected, setSseConnected] = useState(false)

  const { data: liveData, isLoading } = useOrganizerLiveMonitor('sheila-on-7-melompat-lebih-tinggi')
  const { data: gatesData } = useOrganizerGates('sheila-on-7-melompat-lebih-tinggi')
  const { data: countersData } = useOrganizerCounters('sheila-on-7-melompat-lebih-tinggi')

  const liveStats = liveData as Record<string, unknown> | undefined
  const gates = ((gatesData as { data: unknown[] } | undefined)?.data ?? []) as Record<string, unknown>[]
  const counters = ((countersData as { data: unknown[] } | undefined)?.data ?? []) as Record<string, unknown>[]

  // SSE real-time connection
  useEffect(() => {
    const client = getSSEClient()
    const unsubStatus = client.onStatusChange((status) => {
      setSseConnected(status === 'connected')
    })

    const unsubEvents = client.on('stats_update', () => {
      // React Query will auto-refetch based on refetchInterval
    })

    return () => {
      unsubStatus()
      unsubEvents()
    }
  }, [])

  // Auto-scroll to bottom of activity feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [liveStats])

  const totalInside = (liveStats?.totalInside as number) ?? 0
  const totalOutside = (liveStats?.totalOutside as number) ?? 0
  const totalRedeemed = (liveStats?.totalRedeemed as number) ?? 0
  const totalNotRedeemed = (liveStats?.totalNotRedeemed as number) ?? 0
  const totalReentries = (liveStats?.totalReentries as number) ?? 0
  const totalGateScans = (liveStats?.totalGateScans as number) ?? 0
  const activeGates = (liveStats?.activeGates as number) ?? 0
  const activeCounters = (liveStats?.activeCounters as number) ?? 0

  // ── Big number cards data ──
  const bigStats = [
    { label: 'Di Dalam', value: totalInside, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', icon: LogIn },
    { label: 'Di Luar', value: totalOutside, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20', icon: LogOut },
    { label: 'Sudah Tukar', value: totalRedeemed, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', icon: Watch },
    { label: 'Belum Tukar', value: totalNotRedeemed, color: 'text-gray-400', bg: 'from-gray-500/10 to-gray-500/5', border: 'border-gray-500/20', icon: Users },
    { label: 'Re-entry', value: totalReentries, color: 'text-purple-400', bg: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', icon: RefreshCw },
    { label: 'Gate Scans', value: totalGateScans, color: 'text-[#00A39D]', bg: 'from-[#00A39D]/10 to-[#00A39D]/5', border: 'border-[#00A39D]/20', icon: ScanLine },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#00A39D]" />
            Live Monitor
          </h2>
          {/* Pulsing LIVE indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-400">LIVE</span>
          </div>
          {sseConnected && (
            <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">
              SSE Connected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7FB3AE]">
          <Clock className="w-4 h-4" />
          <span>Real-time</span>
        </div>
      </div>

      {/* ═══════════ BIG NUMBER STATS ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {bigStats.map((stat) => (
          <Card key={stat.label} className={cn('bg-gradient-to-br py-4 border', stat.bg, stat.border)}>
            <CardContent className="p-4 text-center">
              <stat.icon className={cn('w-5 h-5 mx-auto mb-2', stat.color)} />
              <p className={cn('text-2xl md:text-3xl font-bold', stat.color)}>
                {stat.value.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-[#7FB3AE] mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══════════ LEFT COLUMN: Gates + Activity Feed ═══════════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ═══════════ GATE OVERVIEW ═══════════ */}
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-[#00A39D]" />
                Gate Overview
                <Badge variant="outline" className="text-[10px] text-[#00A39D] border-[#00A39D]/30 ml-auto">
                  {activeGates}/{gates.length} aktif
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {gates.length === 0 ? (
                <p className="text-sm text-[#7FB3AE] text-center py-8">Tidak ada data gate</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {gates.filter(g => String(g.status) === 'active').map((gate) => {
                    const gateTypeBadge = (() => {
                      switch (String(gate.type)) {
                        case 'entry': return { label: 'MASUK', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
                        case 'exit': return { label: 'KELUAR', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
                        default: return { label: 'MASUK/KELUAR', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
                      }
                    })()
                    const totalIn = (gate.totalIn as number) ?? 0
                    const totalOut = (gate.totalOut as number) ?? 0
                    const rate = totalIn > 0 ? Math.round(totalIn / 120) : 0
                    return (
                      <div
                        key={String(gate.id)}
                        className="p-3 rounded-lg bg-[#0A0F0E]/60 border border-[rgba(0,163,157,0.08)] hover:border-[rgba(0,163,157,0.15)] transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <p className="text-sm text-white font-medium">{String(gate.name)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="text-center p-1.5 rounded bg-emerald-500/5">
                            <p className="text-sm font-bold text-emerald-400">{totalIn.toLocaleString('id-ID')}</p>
                            <p className="text-[9px] text-[#7FB3AE]">IN</p>
                          </div>
                          <div className="text-center p-1.5 rounded bg-blue-500/5">
                            <p className="text-sm font-bold text-blue-400">{totalOut.toLocaleString('id-ID')}</p>
                            <p className="text-[9px] text-[#7FB3AE]">OUT</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <Badge variant="outline" className={cn('text-[9px] py-0', gateTypeBadge.color)}>
                            {gateTypeBadge.label}
                          </Badge>
                          <span className="text-[#7FB3AE]">{rate}/min</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ═══════════ RIGHT COLUMN: Counters ═══════════ */}
        <div className="space-y-6">
          {/* ═══════════ ACTIVE COUNTERS ═══════════ */}
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-[#00A39D]" />
                Counter Aktif
                <Badge variant="outline" className="text-[10px] text-[#00A39D] border-[#00A39D]/30 ml-auto">
                  {activeCounters} aktif
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {counters.filter(c => String(c.status) === 'active').map((counter) => {
                  const capacity = (counter.capacity as number) ?? 0
                  const redeemedToday = (counter.redeemedToday as number) ?? 0
                  const pct = capacity > 0 ? Math.round((redeemedToday / capacity) * 100) : 0
                  return (
                    <div
                      key={String(counter.id)}
                      className="p-2.5 rounded-lg bg-[#0A0F0E]/60 border border-[rgba(0,163,157,0.06)]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs text-white font-medium">{String(counter.name)}</span>
                        </div>
                        <span className="text-xs text-[#7FB3AE]">{redeemedToday}/{capacity}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(0,163,157,0.1)]">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-[#F8AD3C]' : 'bg-[#00A39D]'
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#7FB3AE] mt-1">
                        {String(counter.location ?? '-')} • {pct}% redeemed
                      </p>
                    </div>
                  )
                })}
                {counters.length === 0 && (
                  <p className="text-sm text-[#7FB3AE] text-center py-4">Tidak ada data counter</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
