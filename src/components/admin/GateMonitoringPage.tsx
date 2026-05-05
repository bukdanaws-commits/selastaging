'use client';

import React, { useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Radio,
  DoorOpen,
  Users,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminGateMonitoring } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';

// ─── LOCAL TYPES ──────────────────────────────────────────────────────────────

type GateStats = {
  gateId: string;
  gateName: string;
  capacity: number;
  totalIn: number;
  totalOut: number;
  currentInside: number;
  ratePerMinute: number;
};

type CheckinLog = {
  id: string;
  ticketCode: string;
  userName: string;
  ticketType: string;
  action: 'IN' | 'OUT';
  gateName: string;
  scannedBy: string;
  timestamp: string;
};

// ─── GATE STAT CARD ──────────────────────────────────────────────────────

function GateStatCard({ gate }: { gate: GateStats }) {
  const gateColors: Record<string, string> = {
    'Gate A': '#00A39D',
    'Gate B': '#00BFB8',
    'Gate C': '#7FB3AE',
    'VIP Gate': '#F8AD3C',
  };
  const color = gateColors[gate.gateName] || '#00A39D';

  return (
    <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)] hover:border-[rgba(0,163,157,0.3)] transition-all card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: color }}
            />
            <CardTitle className="text-white text-base font-bold">
              {gate.gateName}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] font-medium border-green-500/50 text-green-400"
          >
            ● ACTIVE
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground text-xs">
          Capacity: {gate.capacity.toLocaleString('id-ID')}/min
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[rgba(0,163,157,0.06)] p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <ArrowDownToLine className="w-3 h-3 text-green-400" />
              <span className="text-[10px] uppercase tracking-wider">Masuk</span>
            </div>
            <p className="text-white text-xl font-bold">{gate.totalIn.toLocaleString('id-ID')}</p>
          </div>
          <div className="rounded-lg bg-[rgba(0,163,157,0.06)] p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <ArrowUpFromLine className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] uppercase tracking-wider">Keluar</span>
            </div>
            <p className="text-white text-xl font-bold">{gate.totalOut.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5 text-[#00A39D]" />
            <span className="text-xs">Di dalam venue</span>
          </div>
          <span className="text-white font-bold text-lg">
            {gate.currentInside.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="w-3.5 h-3.5 text-[#F8AD3C]" />
            <span className="text-xs">Rate/menit</span>
          </div>
          <span className="text-[#F8AD3C] font-bold text-lg">{gate.ratePerMinute}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CHECK-IN LOG ROW ────────────────────────────────────────────────────

function CheckinLogRow({ log }: { log: CheckinLog }) {
  return (
    <TableRow className="border-b border-[rgba(0,163,157,0.08)] hover:bg-[rgba(0,163,157,0.04)]">
      <TableCell className="font-mono text-xs text-muted-foreground">
        {log.ticketCode}
      </TableCell>
      <TableCell className="text-sm text-white font-medium">
        {log.userName}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className="text-[10px] border-[rgba(0,163,157,0.3)] text-[#7FB3AE]"
        >
          {log.ticketType}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          className={cn(
            'text-[10px] font-bold',
            log.action === 'IN'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          )}
        >
          {log.action === 'IN' ? '↓ MASUK' : '↑ KELUAR'}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-white">{log.gateName}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{log.scannedBy}</TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(log.timestamp), 'HH:mm:ss')}
      </TableCell>
    </TableRow>
  );
}

// ─── GATE MONITORING PAGE ────────────────────────────────────────────────

export function GateMonitoringPage() {
  const { data, isLoading, error } = useAdminGateMonitoring();
  const logContainerRef = useRef<HTMLDivElement>(null);

  const gateStats: GateStats[] = (data as any)?.gateStats ?? [];
  const checkinLogs: CheckinLog[] = (data as any)?.checkinLogs ?? [];
  const hourlySales: { hour: string; sales: number }[] = (data as any)?.hourlySales ?? [];

  const totalInside = gateStats.reduce((sum, g) => sum + g.currentInside, 0);
  const totalIn = gateStats.reduce((sum, g) => sum + g.totalIn, 0);
  const totalOut = gateStats.reduce((sum, g) => sum + g.totalOut, 0);
  const maxCapacity = 18800;
  const occupancyPct = Math.round((totalInside / maxCapacity) * 100);
  const latestLogs = checkinLogs.slice(0, 20);

  // Auto-scroll effect for log stream
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [latestLogs]);

  const chartData = hourlySales.map((d) => ({
    hour: d.hour,
    entries: d.sales * 12,
  }));

  const handleRefresh = () => {
    toast.success('Data monitoring diperbarui');
  };

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* ═══ LIVE HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,163,157,0.1)] flex items-center justify-center">
            <Radio className="w-5 h-5 text-[#00A39D]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Gate Monitoring
              <span className="flex items-center gap-1.5 text-[10px] font-medium bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                LIVE
              </span>
            </h2>
            <p className="text-muted-foreground text-xs">
              D-Day Real-time — 24 Mei 2025, GBK Madya Stadium
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-[rgba(0,163,157,0.3)] text-[#7FB3AE]">
            <Timer className="w-3 h-3 mr-1" />
            Updated: {format(new Date(), 'HH:mm:ss')}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="border-[rgba(0,163,157,0.3)] text-[#00A39D] hover:bg-[rgba(0,163,157,0.1)] hover:text-[#00BFB8] text-xs"
            onClick={handleRefresh}
          >
            <ShieldCheck className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Separator className="bg-[rgba(0,163,157,0.1)]" />

      {/* ═══ GATE STAT CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {gateStats.map((gate) => (
          <GateStatCard key={gate.gateId} gate={gate} />
        ))}
      </div>

      {/* ═══ OCCUPANCY OVERVIEW ═══ */}
      <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-[#00A39D]" />
              <CardTitle className="text-white text-sm font-bold">
                Occupancy Overview
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-medium',
                occupancyPct >= 80
                  ? 'border-red-500/50 text-red-400'
                  : occupancyPct >= 60
                    ? 'border-[rgba(248,173,60,0.5)] text-[#F8AD3C]'
                    : 'border-green-500/50 text-green-400'
              )}
            >
              {occupancyPct >= 80 ? '⚠ HIGH' : occupancyPct >= 60 ? '● MODERATE' : '● NORMAL'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-[rgba(0,163,157,0.06)]">
              <p className="text-2xl font-extrabold text-[#00A39D]">
                {totalInside.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                Di Dalam Venue
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[rgba(0,163,157,0.06)]">
              <p className="text-2xl font-extrabold text-white">
                {maxCapacity.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                Max Capacity
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[rgba(0,163,157,0.06)]">
              <p className="text-2xl font-extrabold text-[#F8AD3C]">
                {occupancyPct}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                Occupancy
              </p>
            </div>
          </div>

          {/* Large Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Penonton di Venue</span>
              <span className="text-white font-semibold">
                {totalInside.toLocaleString('id-ID')} / {maxCapacity.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="relative h-6 w-full bg-[#0A0F0E] rounded-full overflow-hidden border border-[rgba(0,163,157,0.1)]">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-2',
                  occupancyPct >= 80
                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                    : occupancyPct >= 60
                      ? 'bg-gradient-to-r from-[#F8AD3C] to-[#FBBF4E]'
                      : 'bg-gradient-to-r from-[#00A39D] to-[#00BFB8]'
                )}
                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
              >
                <span className="text-[10px] font-bold text-[#0A0F0E]">
                  {occupancyPct}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                ↑ Masuk hari ini: <span className="text-green-400 font-medium">{totalIn.toLocaleString('id-ID')}</span>
              </span>
              <span>
                ↓ Keluar: <span className="text-blue-400 font-medium">{totalOut.toLocaleString('id-ID')}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ CHECK-IN RATE CHART ═══ */}
      <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#F8AD3C]" />
            <CardTitle className="text-white text-sm font-bold">
              Check-in Rate (Per Jam)
            </CardTitle>
          </div>
          <CardDescription className="text-muted-foreground text-xs">
            Jumlah penonton masuk per jam sejak gate dibuka
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="entryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A39D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00A39D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,163,157,0.08)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#7FB3AE', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(0,163,157,0.15)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#7FB3AE', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(0,163,157,0.15)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111918',
                    border: '1px solid rgba(0,163,157,0.2)',
                    borderRadius: '8px',
                    color: '#F0FDF9',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#7FB3AE' }}
                  formatter={(value: number) => [`${value} entries`, 'Check-in']}
                />
                <Area
                  type="monotone"
                  dataKey="entries"
                  stroke="#00A39D"
                  strokeWidth={2}
                  fill="url(#entryGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ═══ REAL-TIME CHECK-IN LOG STREAM ═══ */}
      <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00A39D]" />
              <CardTitle className="text-white text-sm font-bold">
                Real-time Check-in Log
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] border-[rgba(0,163,157,0.3)] text-[#7FB3AE]">
              20 terakhir
            </Badge>
          </div>
          <CardDescription className="text-muted-foreground text-xs">
            Stream scan masuk/keluar terbaru dari semua gate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={logContainerRef}
            className="max-h-96 overflow-y-auto rounded-lg border border-[rgba(0,163,157,0.08)]"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[rgba(0,163,157,0.15)] hover:bg-transparent">
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Ticket Code
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Nama
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Tipe
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Aksi
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Gate
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Scanner
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Waktu
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestLogs.map((log) => (
                  <CheckinLogRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
