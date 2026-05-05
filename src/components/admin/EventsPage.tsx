'use client';

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

import { cn, formatRupiah } from '@/lib/utils';
import { useAdminEvents, useAdminDashboard } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  CalendarDays,
  MapPin,
  Users,
  DollarSign,
  Plus,
  Pencil,
  Eye,
  ChevronDown,
  ChevronUp,
  Ticket,
  BarChart3,
  TrendingUp,
  Crown,
  Zap,
  AlertTriangle,
} from 'lucide-react';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getAvailableQuota(tt: Record<string, unknown>): number {
  return Number(tt.quota || 0) - Number(tt.sold || 0);
}

function getQuotaPercentage(tt: Record<string, unknown>): number {
  const quota = Number(tt.quota || 0);
  const sold = Number(tt.sold || 0);
  return quota > 0 ? Math.round((sold / quota) * 100) : 0;
}

// ─── EVENTS PAGE ─────────────────────────────────────────────────────────────

export function EventsPage() {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<string | null>(null);

  const { data: eventsData, isLoading: eventsLoading, error: eventsError } = useAdminEvents();
  const { data: dashboardData } = useAdminDashboard();

  const kpis = dashboardData as Record<string, unknown> | undefined;
  const events = ((eventsData as unknown[]) || []) as Record<string, unknown>[];
  const event = events[0] || {};
  const ticketTypes = ((event.ticketTypes || []) as Record<string, unknown>[]);
  const salesByTier = ((kpis?.salesByTier || []) as { name: string; terjual: number; quota: number; revenue: number; percentage: number }[]);

  const totalSold = ticketTypes.reduce((sum, tt) => sum + Number(tt.sold || 0), 0);
  const totalQuota = ticketTypes.reduce((sum, tt) => sum + Number(tt.quota || 0), 0);
  const totalRevenue = ticketTypes.reduce(
    (sum, tt) => sum + Number(tt.sold || 0) * Number(tt.price || 0),
    0
  );
  const overallPercentage = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;

  const venue = (event.venue || {}) as Record<string, unknown>;

  const formatDateStr = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEEE, dd MMMM yyyy", { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  const floorTiers = ticketTypes.filter((tt) => tt.tier === 'floor');
  const tribunTiers = ticketTypes.filter((tt) => tt.tier === 'tribun');

  const handleCreateEvent = () => {
    toast.success('Event berhasil dibuat!');
    setCreateDialogOpen(false);
  };

  const handleEditTier = (tierId: string) => {
    setEditingTier(tierId);
    setEditDialogOpen(true);
    toast.info(`Mengedit tier ${tierId}`);
  };

  const toggleTierExpand = (tierId: string) => {
    setExpandedTier((prev) => (prev === tierId ? null : tierId));
  };

  if (eventsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load events</p>
          <p className="text-muted-foreground text-sm">{String(eventsError)}</p>
        </div>
      </div>
    );
  }

  if (eventsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-[#00A39D]" />
            Kelola Event
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola event konser dan konfigurasi tiket
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00A39D] hover:bg-[#00BFB8] text-[#0A0F0E] font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Buat Event Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.2)] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Buat Event Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nama Event</label>
                <Input placeholder="Contoh: Sheila On 7 — Surabaya" className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white placeholder:text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Subtitle</label>
                <Input placeholder="Contoh: Melompat Lebih Tinggi Tour 2026" className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white placeholder:text-muted-foreground/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Tanggal</label>
                  <Input type="date" className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Waktu</label>
                  <Input type="time" className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Venue</label>
                <Select>
                  <SelectTrigger className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white">
                    <SelectValue placeholder="Pilih venue" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111918] border-[rgba(0,163,157,0.2)]">
                    <SelectItem value="gbk-madya">GBK Madya Stadium — Jakarta</SelectItem>
                    <SelectItem value="gbk-seni">GBK Senayan — Jakarta</SelectItem>
                    <SelectItem value="istora">Istora Senayan — Jakarta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select defaultValue="draft">
                  <SelectTrigger className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111918] border-[rgba(0,163,157,0.2)]">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-white/20 text-white hover:bg-white/5">Batal</Button>
                <Button className="bg-[#00A39D] hover:bg-[#00BFB8] text-[#0A0F0E] font-semibold" onClick={handleCreateEvent}>Buat Event</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ═══════════ EVENT OVERVIEW STATS ═══════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tiket Terjual', value: totalSold.toLocaleString('id-ID'), sub: `dari ${totalQuota.toLocaleString('id-ID')} quota`, icon: Ticket, color: '#00A39D' },
          { label: 'Total Pendapatan', value: formatRupiah(totalRevenue), sub: `${overallPercentage}% terjual`, icon: DollarSign, color: '#F8AD3C' },
          { label: 'Jumlah Tier Tiket', value: ticketTypes.length.toString(), sub: `${floorTiers.length} floor, ${tribunTiers.length} tribun`, icon: BarChart3, color: '#00A39D' },
          { label: 'Kapasitas Venue', value: Number(venue.capacity || 0).toLocaleString('id-ID'), sub: `${totalQuota > 0 && venue.capacity ? Math.round((totalSold / Number(venue.capacity)) * 100) : 0}% terisi`, icon: TrendingUp, color: '#F8AD3C' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-white text-xl font-bold">{stat.value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══════════ EVENT LIST TABLE ═══════════ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#00A39D]" />
                Daftar Event
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                Menampilkan semua event yang terdaftar
              </CardDescription>
            </div>
            <Badge className={cn('font-semibold', event.status === 'published' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20')}>
              {event.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(0,163,157,0.1)] hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Event</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Tanggal</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Venue</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Tiket Terjual</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Pendapatan</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No events found</TableCell>
                  </TableRow>
                ) : (
                  events.map((evt, idx) => (
                    <TableRow key={String(evt.id || idx)} className="border-[rgba(0,163,157,0.05)] hover:bg-[rgba(0,163,157,0.05)]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00A39D]/20 to-[#F8AD3C]/10 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5 text-[#00A39D]" />
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">{String(evt.title || '')}</p>
                            <p className="text-muted-foreground text-xs">{String(evt.subtitle || '')}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays className="w-3.5 h-3.5 text-[#00A39D]" />
                          {evt.date ? formatDateStr(String(evt.date)) : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{String(evt.time || '')}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-[#00A39D]" />
                          {String((evt.venue as Record<string, unknown>)?.name || '')}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{String((evt.venue as Record<string, unknown>)?.city || '')}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-semibold', evt.status === 'published' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30')}>
                          {evt.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-white font-semibold text-sm">{totalSold.toLocaleString('id-ID')}</p>
                        <p className="text-xs text-muted-foreground">/ {totalQuota.toLocaleString('id-ID')}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-[#F8AD3C] font-semibold text-sm">{formatRupiah(totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">{overallPercentage}%</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="text-[#00A39D] hover:text-[#00BFB8] hover:bg-[rgba(0,163,157,0.1)] h-8 w-8 p-0" onClick={() => toast.info('Detail event')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-[#F8AD3C] hover:text-[#FBBF4E] hover:bg-[rgba(248,173,60,0.1)] h-8 w-8 p-0" onClick={() => toast.info('Edit event')}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ TICKET TIERS MANAGEMENT ═══════════ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#00A39D]" />
                Manajemen Tier Tiket
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                Konfigurasi harga, quota, dan benefit setiap tier tiket
              </CardDescription>
            </div>
            <Badge className="bg-[#00A39D]/15 text-[#00A39D] border-[rgba(0,163,157,0.3)]">
              {ticketTypes.length} Tier
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sales by Tier Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Floor Zone — Standing</h3>
              <div className="space-y-3">
                {floorTiers.map((tt) => {
                  const available = getAvailableQuota(tt);
                  const percentage = getQuotaPercentage(tt);
                  const isExpanded = expandedTier === String(tt.id);
                  const isVVIP = String(tt.id) === 'tt-vvip';
                  return (
                    <div key={String(tt.id)} className={cn('rounded-xl border p-4 transition-all', isVVIP ? 'bg-gradient-to-r from-[rgba(248,173,60,0.06)] to-[#111918] border-[rgba(248,173,60,0.2)]' : 'bg-[#0A0F0E] border-[rgba(0,163,157,0.1)]', isExpanded && 'border-[rgba(0,163,157,0.3)]')}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{String(tt.emoji || '🎵')}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-semibold text-sm">{String(tt.name || '')}</p>
                              {isVVIP && <Badge className="bg-[#F8AD3C]/20 text-[#F8AD3C] border-[rgba(248,173,60,0.3)] text-[10px] px-1.5 py-0"><Crown className="w-2.5 h-2.5 mr-0.5" />EXCLUSIVE</Badge>}
                            </div>
                            <p className="text-muted-foreground text-xs">{String(tt.zone || '')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/5 h-7 w-7 p-0" onClick={() => toggleTierExpand(String(tt.id))}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-[#F8AD3C] hover:text-[#FBBF4E] hover:bg-[rgba(248,173,60,0.1)] h-7 w-7 p-0" onClick={() => handleEditTier(String(tt.id))}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Harga</p><p className={cn('font-bold text-sm', isVVIP ? 'text-[#F8AD3C]' : 'text-[#00A39D]')}>{formatRupiah(Number(tt.price || 0))}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Quota</p><p className="text-white font-semibold text-sm">{Number(tt.quota || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Terjual</p><p className="text-white font-semibold text-sm">{Number(tt.sold || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Tersedia</p><p className={cn('font-semibold text-sm', available === 0 ? 'text-red-400' : 'text-emerald-400')}>{available.toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">% Terjual</p><p className={cn('font-bold text-sm', percentage >= 90 ? 'text-red-400' : percentage >= 70 ? 'text-[#F8AD3C]' : 'text-[#00A39D]')}>{percentage}%</p></div>
                      </div>
                      <Progress value={percentage} className={cn('h-2 rounded-full', percentage >= 90 ? '[&>div]:bg-red-500' : percentage >= 70 ? '[&>div]:bg-[#F8AD3C]' : '[&>div]:bg-[#00A39D]')} />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-muted-foreground text-xs">Revenue: <span className="text-[#F8AD3C] font-semibold">{formatRupiah(Number(tt.sold || 0) * Number(tt.price || 0))}</span></p>
                        <p className="text-muted-foreground text-xs">{Number(tt.sold || 0).toLocaleString('id-ID')} / {Number(tt.quota || 0).toLocaleString('id-ID')}</p>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[rgba(0,163,157,0.1)]">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Benefits</h4>
                          <ul className="space-y-1.5">
                            {((tt.benefits || []) as string[]).map((b: string) => (
                              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isVVIP ? 'bg-[#F8AD3C]' : 'bg-[#00A39D]')} />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tribun Zone — Kursi Bernomor</h3>
              <div className="space-y-3">
                {tribunTiers.map((tt) => {
                  const available = getAvailableQuota(tt);
                  const percentage = getQuotaPercentage(tt);
                  const isExpanded = expandedTier === String(tt.id);
                  return (
                    <div key={String(tt.id)} className={cn('rounded-xl border p-4 transition-all', 'bg-[#0A0F0E] border-[rgba(0,163,157,0.1)]', isExpanded && 'border-[rgba(0,163,157,0.3)]')}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{String(tt.emoji || '💺')}</span>
                          <div>
                            <p className="text-white font-semibold text-sm">{String(tt.name || '')}</p>
                            <p className="text-muted-foreground text-xs">{String(tt.zone || '')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/5 h-7 w-7 p-0" onClick={() => toggleTierExpand(String(tt.id))}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-[#F8AD3C] hover:text-[#FBBF4E] hover:bg-[rgba(248,173,60,0.1)] h-7 w-7 p-0" onClick={() => handleEditTier(String(tt.id))}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Harga</p><p className="text-[#00A39D] font-bold text-sm">{formatRupiah(Number(tt.price || 0))}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Quota</p><p className="text-white font-semibold text-sm">{Number(tt.quota || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Terjual</p><p className="text-white font-semibold text-sm">{Number(tt.sold || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Tersedia</p><p className={cn('font-semibold text-sm', available === 0 ? 'text-red-400' : 'text-emerald-400')}>{available.toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">% Terjual</p><p className={cn('font-bold text-sm', percentage >= 90 ? 'text-red-400' : percentage >= 70 ? 'text-[#F8AD3C]' : 'text-[#00A39D]')}>{percentage}%</p></div>
                      </div>
                      <Progress value={percentage} className={cn('h-2 rounded-full', percentage >= 90 ? '[&>div]:bg-red-500' : percentage >= 70 ? '[&>div]:bg-[#F8AD3C]' : '[&>div]:bg-[#00A39D]')} />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-muted-foreground text-xs">Revenue: <span className="text-[#F8AD3C] font-semibold">{formatRupiah(Number(tt.sold || 0) * Number(tt.price || 0))}</span></p>
                        <p className="text-muted-foreground text-xs">{Number(tt.sold || 0).toLocaleString('id-ID')} / {Number(tt.quota || 0).toLocaleString('id-ID')}</p>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[rgba(0,163,157,0.1)]">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Benefits</h4>
                          <ul className="space-y-1.5">
                            {((tt.benefits || []) as string[]).map((b: string) => (
                              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#00A39D]" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sales Summary Table */}
          {salesByTier.length > 0 && (
            <div className="border-t border-[rgba(0,163,157,0.1)] pt-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00A39D]" />
                Ringkasan Penjualan per Tier
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[rgba(0,163,157,0.1)] hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Tier</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Terjual</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Quota</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">%</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByTier.map((tier) => (
                      <TableRow key={tier.name} className="border-[rgba(0,163,157,0.05)] hover:bg-[rgba(0,163,157,0.05)]">
                        <TableCell className="text-white font-medium text-sm">{tier.name}</TableCell>
                        <TableCell className="text-right text-sm">{tier.terjual.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{tier.quota.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16">
                              <Progress value={tier.percentage} className={cn('h-1.5 rounded-full', tier.percentage >= 90 ? '[&>div]:bg-red-500' : tier.percentage >= 70 ? '[&>div]:bg-[#F8AD3C]' : '[&>div]:bg-[#00A39D]')} />
                            </div>
                            <span className={cn('text-xs font-semibold w-10 text-right', tier.percentage >= 90 ? 'text-red-400' : tier.percentage >= 70 ? 'text-[#F8AD3C]' : 'text-[#00A39D]')}>{tier.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-[#F8AD3C] font-semibold text-sm">{formatRupiah(tier.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════ EDIT TIER DIALOG ═══════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.2)] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Tier Tiket — {editingTier || ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Nama Tier</label>
              <Input defaultValue={editingTier ? String(ticketTypes.find(t => String(t.id) === editingTier)?.name || '') : ''} className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Harga (Rp)</label>
                <Input type="number" defaultValue={editingTier ? Number(ticketTypes.find(t => String(t.id) === editingTier)?.price || 0) : ''} className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Quota</label>
                <Input type="number" defaultValue={editingTier ? Number(ticketTypes.find(t => String(t.id) === editingTier)?.quota || 0) : ''} className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Zone</label>
              <Input defaultValue={editingTier ? String(ticketTypes.find(t => String(t.id) === editingTier)?.zone || '') : ''} className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-white/20 text-white hover:bg-white/5">Batal</Button>
              <Button className="bg-[#00A39D] hover:bg-[#00BFB8] text-[#0A0F0E] font-semibold" onClick={() => { toast.success('Tier berhasil diperbarui!'); setEditDialogOpen(false); }}>Simpan Perubahan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
