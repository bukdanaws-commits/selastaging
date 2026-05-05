'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  LogIn,
  LogOut,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGateLogs, useGateProfile } from '@/hooks/use-api'
import { formatTime } from '@/lib/utils'

type FilterType = 'all' | 'IN' | 'OUT'

interface SummaryStats {
  totalMasuk: number
  totalKeluar: number
  currentlyInside: number
  totalEvents: number
}

export function GateLog() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const { data: profileData } = useGateProfile()
  const { data: logsData, isLoading: logsLoading } = useGateLogs()

  const gateInfo = (profileData as Record<string, unknown>)?.gate as Record<string, unknown> | undefined
  const gateId = (gateInfo?.id as string) ?? ''

  // Extract logs from paginated response
  const gateLogs = useMemo(() => {
    const data = logsData as { data: unknown[] } | undefined
    return (data?.data ?? []) as Record<string, unknown>[]
  }, [logsData])

  // Summary stats
  const stats: SummaryStats = useMemo(() => {
    const totalMasuk = gateLogs.filter(l => String(l.action) === 'IN').length
    const totalKeluar = gateLogs.filter(l => String(l.action) === 'OUT').length
    return {
      totalMasuk,
      totalKeluar,
      currentlyInside: totalMasuk - totalKeluar,
      totalEvents: gateLogs.length,
    }
  }, [gateLogs])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return gateLogs.filter(log => {
      // Action filter
      if (filter !== 'all' && String(log.action) !== filter) return false
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          String(log.userName ?? '').toLowerCase().includes(q) ||
          String(log.ticketCode ?? '').toLowerCase().includes(q) ||
          String(log.ticketType ?? '').toLowerCase().includes(q) ||
          String(log.gateName ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [searchQuery, filter, gateLogs])

  const filterButtons: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'Semua', count: stats.totalEvents },
    { value: 'IN', label: 'Masuk', count: stats.totalMasuk },
    { value: 'OUT', label: 'Keluar', count: stats.totalKeluar },
  ]

  if (logsLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">
          {/* ── SUMMARY STATS ─────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-emerald-500/10 border-emerald-500/20">
              <CardContent className="p-3 text-center">
                <ArrowDownToLine className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-400">{stats.totalMasuk}</p>
                <p className="text-[10px] text-[#7FB3AE]">Masuk</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="p-3 text-center">
                <ArrowUpFromLine className="h-4 w-4 text-red-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-400">{stats.totalKeluar}</p>
                <p className="text-[10px] text-[#7FB3AE]">Keluar</p>
              </CardContent>
            </Card>
            <Card className="bg-[#00A39D]/10 border-[#00A39D]/20">
              <CardContent className="p-3 text-center">
                <Users className="h-4 w-4 text-[#00A39D] mx-auto mb-1" />
                <p className="text-lg font-bold text-[#00A39D]">{stats.currentlyInside}</p>
                <p className="text-[10px] text-[#7FB3AE]">Di Dalam</p>
              </CardContent>
            </Card>
          </div>

          {/* ── SEARCH + FILTER ───────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7FB3AE]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, kode tiket..."
                className="pl-9 h-9 bg-[#111918] border-white/10 text-sm placeholder:text-[#7FB3AE]/50 focus:border-[#00A39D]/50"
              />
            </div>

            <div className="flex gap-2">
              {filterButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter(btn.value)}
                  className={cn(
                    'h-8 text-[11px] border-white/10 px-3',
                    filter === btn.value
                      ? 'bg-[#00A39D]/20 border-[#00A39D]/40 text-[#00A39D]'
                      : 'text-[#7FB3AE] hover:text-white hover:bg-white/5'
                  )}
                >
                  {btn.label}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-1.5 text-[9px] h-4 min-w-4 px-1',
                      filter === btn.value
                        ? 'bg-[#00A39D]/30 text-[#00A39D]'
                        : 'bg-white/5 text-[#7FB3AE]'
                    )}
                  >
                    {btn.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* ── LOG LIST ─────────────────────────────────────────────── */}
          <div className="space-y-2 pb-4">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#7FB3AE]">
                <Filter className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Tidak ada log ditemukan</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <motion.div
                  key={String(log.id ?? idx)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                >
                  <Card className="bg-[#111918] border-white/5 hover:border-white/10 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Action indicator */}
                        <div
                          className={cn(
                            'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
                            String(log.action) === 'IN'
                              ? 'bg-emerald-500/15'
                              : 'bg-red-500/15'
                          )}
                        >
                          {String(log.action) === 'IN' ? (
                            <LogIn className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <LogOut className="h-4 w-4 text-red-400" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white truncate">
                              {String(log.userName ?? '-')}
                            </p>
                            <span
                              className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                                String(log.action) === 'IN'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              )}
                            >
                              {String(log.action)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1.5 border-white/10 text-[#7FB3AE]"
                            >
                              {String(log.ticketType ?? '-')}
                            </Badge>
                            <span className="text-[9px] text-[#7FB3AE]">{String(log.gateName ?? '-')}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[10px] font-mono text-[#7FB3AE]/70">
                              {String(log.ticketCode ?? '-')}
                            </p>
                            <p className="text-[10px] text-[#7FB3AE]/70">
                              {log.scannedAt ? formatTime(String(log.scannedAt)) : (log.timestamp ? formatTime(String(log.timestamp)) : '-')}
                            </p>
                          </div>
                          {(log.reentryCount as number) > 0 && (
                            <p className="text-[9px] text-amber-400 mt-1">
                              Re-entry ke-{String(log.reentryCount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
