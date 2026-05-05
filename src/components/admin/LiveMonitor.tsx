'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { cn, formatTime } from '@/lib/utils';
import { useAdminLiveMonitor } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Activity,
  LogIn,
  LogOut,
  Search,
  Clock,
  Users,
  ArrowRight,
  ArrowLeft,
  ScanLine,
  Store,
  Watch,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── LOCAL TYPES & HELPERS ────────────────────────────────────────────────────

type LiveGate = {
  id: string;
  name: string;
  type: 'entry' | 'exit' | 'both';
  status: string;
  totalIn: number;
  totalOut: number;
  lastScan: string | null;
};

type GateLog = {
  id: string;
  userName: string;
  ticketCode: string;
  action: 'IN' | 'OUT';
  gateName: string;
  staffName: string;
  reentryCount: number;
  timestamp: string;
};

type AttendeeStatus = {
  userName: string;
  ticketCode: string;
  ticketType: string;
  currentStatus: string;
  wristbandCode: string | null;
  reentryCount: number;
  lastAction: string;
  lastActionAt: string;
  gateUsed: string | null;
};

type LiveCounter = {
  id: string;
  name: string;
  location: string;
  status: string;
  redeemedToday: number;
  capacity: number;
};

type WristbandConfig = {
  ticketTypeId: string;
  ticketTypeName: string;
  wristbandColor: string;
  wristbandColorHex: string;
  emoji: string;
};

type LiveStats = {
  totalInside: number;
  totalOutside: number;
  totalRedeemed: number;
  totalNotRedeemed: number;
  totalReentries: number;
  totalGateScans: number;
  activeGates: number;
  activeCounters: number;
};

function getGateTypeBadge(type: LiveGate['type']) {
  switch (type) {
    case 'entry': return { label: 'Masuk', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
    case 'exit': return { label: 'Keluar', color: 'text-red-400 bg-red-500/15 border-red-500/30' };
    case 'both': return { label: 'Masuk/Keluar', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
  }
}

function getAttendeeStatusBadge(status: string) {
  switch (status) {
    case 'inside_venue': return { label: 'Di Dalam', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    case 'outside': return { label: 'Di Luar', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
    case 'redeemed': return { label: 'Sudah Tukar', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    default: return { label: status, color: 'text-gray-400 border-gray-500/30 bg-gray-500/10' };
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function LiveMonitor() {
  const { data, isLoading, error } = useAdminLiveMonitor();

  const liveGates: LiveGate[] = (data as any)?.gates ?? [];
  const gateLogs: GateLog[] = (data as any)?.logs ?? [];
  const attendeeStatuses: AttendeeStatus[] = (data as any)?.attendees ?? [];
  const liveCounters: LiveCounter[] = (data as any)?.counters ?? [];
  const wristbandConfigs: WristbandConfig[] = (data as any)?.wristbandConfigs ?? [];
  const liveStats: LiveStats = (data as any)?.stats ?? {
    totalInside: 0, totalOutside: 0, totalRedeemed: 0, totalNotRedeemed: 0,
    totalReentries: 0, totalGateScans: 0, activeGates: 0, activeCounters: 0,
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of activity feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, []);

  // ── Attendee search results ──
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return attendeeStatuses.filter(
      (a) =>
        a.userName.toLowerCase().includes(q) ||
        a.ticketCode.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery, attendeeStatuses]);

  // ── Big number cards data ──
  const bigStats = [
    { label: 'Total Di Dalam', value: liveStats.totalInside, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', icon: LogIn },
    { label: 'Total Di Luar', value: liveStats.totalOutside, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20', icon: LogOut },
    { label: 'Total Sudah Tukar', value: liveStats.totalRedeemed, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', icon: Watch },
    { label: 'Total Belum Tukar', value: liveStats.totalNotRedeemed, color: 'text-gray-400', bg: 'from-gray-500/10 to-gray-500/5', border: 'border-gray-500/20', icon: Users },
    { label: 'Total Re-entry', value: liveStats.totalReentries, color: 'text-purple-400', bg: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', icon: RefreshCw },
    { label: 'Gate Scans', value: liveStats.totalGateScans, color: 'text-[#00A39D]', bg: 'from-[#00A39D]/10 to-[#00A39D]/5', border: 'border-[#00A39D]/20', icon: ScanLine },
  ];

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>;

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
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7FB3AE]">
          <Clock className="w-4 h-4" />
          <span>D-Day: 24 Mei 2025</span>
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
                  {liveStats.activeGates}/{liveGates.length} aktif
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {liveGates.filter(g => g.status === 'active').map((gate) => {
                  const typeBadge = getGateTypeBadge(gate.type);
                  const rate = gate.totalIn > 0 ? Math.round(gate.totalIn / 120) : 0;
                  return (
                    <div
                      key={gate.id}
                      className="p-3 rounded-lg bg-[#0A0F0E]/60 border border-[rgba(0,163,157,0.08)] hover:border-[rgba(0,163,157,0.15)] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <p className="text-sm text-white font-medium">{gate.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="text-center p-1.5 rounded bg-emerald-500/5">
                          <p className="text-sm font-bold text-emerald-400">{gate.totalIn.toLocaleString('id-ID')}</p>
                          <p className="text-[9px] text-[#7FB3AE]">IN</p>
                        </div>
                        <div className="text-center p-1.5 rounded bg-blue-500/5">
                          <p className="text-sm font-bold text-blue-400">{gate.totalOut.toLocaleString('id-ID')}</p>
                          <p className="text-[9px] text-[#7FB3AE]">OUT</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <Badge variant="outline" className={cn('text-[9px] py-0', typeBadge.color)}>
                          {typeBadge.label}
                        </Badge>
                        <span className="text-[#7FB3AE]">{rate}/min</span>
                        <span className="text-[#7FB3AE]">
                          {gate.lastScan ? formatTime(gate.lastScan) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ═══════════ RECENT ACTIVITY FEED ═══════════ */}
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00A39D]" />
                  Aktivitas Terkini
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-[#7FB3AE] border-[#7FB3AE]/20">
                  Live stream
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[400px] custom-scrollbar" ref={feedRef}>
                <div className="space-y-1.5 pr-2">
                  {gateLogs.slice(0, 50).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0A0F0E]/60 border border-[rgba(0,163,157,0.06)] hover:border-[rgba(0,163,157,0.12)] transition-colors"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        log.action === 'IN'
                          ? 'bg-emerald-500/10'
                          : 'bg-blue-500/10'
                      )}>
                        {log.action === 'IN'
                          ? <ArrowRight className="w-4 h-4 text-emerald-400" />
                          : <ArrowLeft className="w-4 h-4 text-blue-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">{log.userName}</span>
                          <Badge variant="outline" className={cn(
                            'text-[9px] px-1.5 py-0 shrink-0',
                            log.action === 'IN'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          )}>
                            {log.action}
                          </Badge>
                          {log.reentryCount > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-500/15 text-purple-400 border-purple-500/30">
                              Re-entry #{log.reentryCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#7FB3AE] mt-0.5">
                          <span className="font-mono">{log.ticketCode}</span>
                          <span>•</span>
                          <span>{log.gateName}</span>
                          <span>•</span>
                          <span>{log.staffName}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#7FB3AE] shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════ RIGHT COLUMN: Search + Wristband + Counters ═══════════ */}
        <div className="space-y-6">
          {/* ═══════════ ATTENDEE SEARCH ═══════════ */}
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-[#00A39D]" />
                Cari Peserta
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
                <Input
                  placeholder="Nama atau kode tiket..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedAttendee(null);
                  }}
                  className="pl-9 bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white placeholder:text-[#7FB3AE]/50 h-9"
                />
              </div>

              {searchResults.length > 0 && !selectedAttendee && (
                <div className="space-y-1.5">
                  {searchResults.map((a) => {
                    const badge = getAttendeeStatusBadge(a.currentStatus);
                    return (
                      <button
                        key={a.ticketCode}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0A0F0E] border border-[rgba(0,163,157,0.08)] hover:border-[rgba(0,163,157,0.15)] text-left transition-colors"
                        onClick={() => setSelectedAttendee(a.ticketCode)}
                      >
                        <div className="w-8 h-8 rounded-full bg-[rgba(0,163,157,0.1)] flex items-center justify-center text-xs text-[#00A39D] font-bold shrink-0">
                          {a.userName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{a.userName}</p>
                          <p className="text-[10px] text-[#7FB3AE] font-mono">{a.ticketCode}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-[9px] shrink-0', badge.color)}>
                          {badge.label}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedAttendee && (() => {
                const a = attendeeStatuses.find(x => x.ticketCode === selectedAttendee);
                if (!a) return null;
                const badge = getAttendeeStatusBadge(a.currentStatus);
                const wbConfig = wristbandConfigs.find(w => w.ticketTypeName === a.ticketType);
                return (
                  <div className="p-3 rounded-lg bg-[#0A0F0E] border border-[rgba(0,163,157,0.15)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-[rgba(0,163,157,0.1)] flex items-center justify-center text-sm text-[#00A39D] font-bold">
                          {a.userName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{a.userName}</p>
                          <p className="text-[10px] text-[#7FB3AE] font-mono">{a.ticketCode}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#7FB3AE] hover:text-white"
                        onClick={() => setSelectedAttendee(null)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-[rgba(0,163,157,0.05)]">
                        <p className="text-[#7FB3AE]">Tipe Tiket</p>
                        <p className="text-white font-medium">{a.ticketType}</p>
                      </div>
                      <div className="p-2 rounded bg-[rgba(0,163,157,0.05)]">
                        <p className="text-[#7FB3AE]">Status</p>
                        <Badge variant="outline" className={cn('text-[10px] mt-0.5', badge.color)}>
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="p-2 rounded bg-[rgba(0,163,157,0.05)]">
                        <p className="text-[#7FB3AE]">Gelang</p>
                        <p className="text-white font-mono text-xs">{a.wristbandCode || '—'}</p>
                      </div>
                      <div className="p-2 rounded bg-[rgba(0,163,157,0.05)]">
                        <p className="text-[#7FB3AE]">Re-entry</p>
                        <p className="text-white font-medium">{a.reentryCount}x</p>
                      </div>
                    </div>
                    <div className="text-xs text-[#7FB3AE] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.lastAction} — {formatTime(a.lastActionAt)}
                    </div>
                    {a.gateUsed && (
                      <div className="text-xs text-[#7FB3AE]">
                        Gate: <span className="text-white">{a.gateUsed}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* ═══════════ WRISTBAND COLOR LEGEND ═══════════ */}
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Watch className="w-4 h-4 text-[#F8AD3C]" />
                Warna Gelang
              </CardTitle>
              <CardDescription className="text-xs text-[#7FB3AE]">
                Pemetaan warna gelang per tipe tiket
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {wristbandConfigs.map((wb) => (
                  <div
                    key={wb.ticketTypeId}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0A0F0E]/60 border border-[rgba(0,163,157,0.06)]"
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0 border-2 border-white/10"
                      style={{ backgroundColor: wb.wristbandColorHex }}
                    />
                    <span className="text-[11px] text-white font-medium flex-1">{wb.ticketTypeName}</span>
                    <span className="text-[10px] text-[#7FB3AE]">{wb.emoji} {wb.wristbandColor}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══════════ ACTIVE COUNTERS ═══════════ */}
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-[#00A39D]" />
                Counter Aktif
                <Badge variant="outline" className="text-[10px] text-[#00A39D] border-[#00A39D]/30 ml-auto">
                  {liveStats.activeCounters} aktif
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {liveCounters.filter(c => c.status === 'active').map((counter) => {
                  const pct = counter.capacity > 0 ? Math.round((counter.redeemedToday / counter.capacity) * 100) : 0;
                  return (
                    <div
                      key={counter.id}
                      className="p-2.5 rounded-lg bg-[#0A0F0E]/60 border border-[rgba(0,163,157,0.06)]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs text-white font-medium">{counter.name}</span>
                        </div>
                        <span className="text-xs text-[#7FB3AE]">{counter.redeemedToday}/{counter.capacity}</span>
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
                        {counter.location} • {pct}% redeemed
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LiveMonitor;
