'use client';

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

import { cn, formatRupiah } from '@/lib/utils';
import { useAdminEvents, useAdminDashboard, useUpdateTicketType } from '@/hooks/use-api';
import { useScopedData, useRoleLabel } from '@/hooks/use-scoped-data';
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
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<Record<string, unknown> | null>(null)

  const [editForm, setEditForm] = useState({
    name: '', price: '', quota: '', description: '', tier: '', zone: '', emoji: '', benefits: '',
  })
  const updateTicketTypeMutation = useUpdateTicketType()

  const handleSaveTier = async () => {
    if (!editForm.name || !editForm.price || !editForm.quota) {
      toast.error('Nama, harga, dan kuota wajib diisi')
      return
    }
    try {
      await updateTicketTypeMutation.mutateAsync({
        ticketTypeId: selectedTier?.id || '',
        data: {
          name: editForm.name, price: parseInt(editForm.price), quota: parseInt(editForm.quota),
          description: editForm.description, tier: editForm.tier, zone: editForm.zone,
          emoji: editForm.emoji, benefits: editForm.benefits,
        },
      })
      toast.success('Tiket berhasil diperbarui')
      setEditDialogOpen(false)
    } catch (err) {
      toast.error('Gagal memperbarui tiket')
      console.error(err)
    }
  }

  const handleEditTier = (tier: any) => {
    setSelectedTier(tier)
    setEditForm({
      name: tier.name || '', price: String(tier.price || ''), quota: String(tier.quota || ''),
      description: tier.description || '', tier: tier.tier || '', zone: tier.zone || '',
      emoji: tier.emoji || '', benefits: tier.benefits || '',
    })
    setEditDialogOpen(true)
  }

  const { isOrganizer, organizerId, scopeParams, apiScope } = useScopedData({ filterByEvent: true });
  const pageTitle = useRoleLabel({ superAdmin: 'Kelola Event', organizer: 'My Events' });

  const { data: eventsData, isLoading: eventsLoading, error: eventsError } = useAdminEvents();
  const { data: dashboardData } = useAdminDashboard();

  const kpis = dashboardData as Record<string, unknown> | undefined;
  const events = ((eventsData as unknown[]) || []) as Record<string, unknown>[];
  const event = events[0] || {};
  const ticketTypes = Array.isArray(event.ticketTypes) ? (event.ticketTypes as Record<string, unknown>[]) : [];
  const salesByTier = Array.isArray(kpis?.salesByTier) ? (kpis.salesByTier as { name: string; terjual: number; quota: number; revenue: number; percentage: number }[]) : [];

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

  const floorTiers = ticketTypes.filter((tt: Record<string, unknown>) => tt.tier === 'floor');
  const tribunTiers = ticketTypes.filter((tt: Record<string, unknown>) => tt.tier === 'tribun');

  const handleCreateEvent = () => {
    toast.success('Event berhasil dibuat!');
    setCreateDialogOpen(false);
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            {pageTitle}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOrganizer ? 'Event yang Anda kelola' : 'Kelola event konser dan konfigurasi tiket'}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Buat Event Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-primary/20 text-foreground max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">Buat Event Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nama Event</label>
                <Input placeholder="Contoh: Sheila On 7 — Surabaya" className="bg-background border-primary/20 text-foreground placeholder:text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Subtitle</label>
                <Input placeholder="Contoh: Melompat Lebih Tinggi Tour 2026" className="bg-background border-primary/20 text-foreground placeholder:text-muted-foreground/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Tanggal</label>
                  <Input type="date" className="bg-background border-primary/20 text-foreground" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Waktu</label>
                  <Input type="time" className="bg-background border-primary/20 text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Venue</label>
                <Select>
                  <SelectTrigger className="bg-background border-primary/20 text-foreground">
                    <SelectValue placeholder="Pilih venue" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/20">
                    <SelectItem value="gbk-madya">GBK Madya Stadium — Jakarta</SelectItem>
                    <SelectItem value="gbk-seni">GBK Senayan — Jakarta</SelectItem>
                    <SelectItem value="istora">Istora Senayan — Jakarta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select defaultValue="draft">
                  <SelectTrigger className="bg-background border-primary/20 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/20">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-input text-foreground hover:bg-accent">Batal</Button>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={handleCreateEvent}>Buat Event</Button>
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
          <Card key={stat.label} className="bg-card border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-foreground text-xl font-bold">{stat.value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══════════ EVENT LIST TABLE ═══════════ */}
      <Card className="bg-card border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
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
                <TableRow className="border-primary/10 hover:bg-transparent">
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
                    <TableRow key={String(evt.id || idx)} className="border-primary/5 hover:bg-primary/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-gold/10 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-foreground font-semibold text-sm">{String(evt.title || '')}</p>
                            <p className="text-muted-foreground text-xs">{String(evt.subtitle || '')}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays className="w-3.5 h-3.5 text-primary" />
                          {evt.date ? formatDateStr(String(evt.date)) : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{String(evt.time || '')}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
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
                        <p className="text-foreground font-semibold text-sm">{totalSold.toLocaleString('id-ID')}</p>
                        <p className="text-xs text-muted-foreground">/ {totalQuota.toLocaleString('id-ID')}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-gold font-semibold text-sm">{formatRupiah(totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">{overallPercentage}%</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 p-0" onClick={() => toast.info('Detail event')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gold hover:text-gold hover:bg-gold/10 h-8 w-8 p-0" onClick={() => toast.info('Edit event')}>
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
      <Card className="bg-card border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Manajemen Tier Tiket
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                Konfigurasi harga, quota, dan benefit setiap tier tiket
              </CardDescription>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30">
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
                    <div key={String(tt.id)} className={cn('rounded-xl border p-4 transition-all', isVVIP ? 'bg-gradient-to-r from-gold/10 to-card border-gold/20' : 'bg-background border-primary/10', isExpanded && 'border-primary/30')}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{String(tt.emoji || '🎵')}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-foreground font-semibold text-sm">{String(tt.name || '')}</p>
                              {isVVIP && <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px] px-1.5 py-0"><Crown className="w-2.5 h-2.5 mr-0.5" />EXCLUSIVE</Badge>}
                            </div>
                            <p className="text-muted-foreground text-xs">{String(tt.zone || '')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent h-7 w-7 p-0" onClick={() => toggleTierExpand(String(tt.id))}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gold hover:text-gold hover:bg-gold/10 h-7 w-7 p-0" onClick={() => handleEditTier(String(tt.id))}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Harga</p><p className={cn('font-bold text-sm', isVVIP ? 'text-gold' : 'text-primary')}>{formatRupiah(Number(tt.price || 0))}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Quota</p><p className="text-foreground font-semibold text-sm">{Number(tt.quota || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Terjual</p><p className="text-foreground font-semibold text-sm">{Number(tt.sold || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Tersedia</p><p className={cn('font-semibold text-sm', available === 0 ? 'text-red-400' : 'text-emerald-400')}>{available.toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">% Terjual</p><p className={cn('font-bold text-sm', percentage >= 90 ? 'text-red-400' : percentage >= 70 ? 'text-gold' : 'text-primary')}>{percentage}%</p></div>
                      </div>
                      <Progress value={percentage} className={cn('h-2 rounded-full', percentage >= 90 ? '[&>div]:bg-red-500' : percentage >= 70 ? '[&>div]:bg-gold' : '[&>div]:bg-primary')} />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-muted-foreground text-xs">Revenue: <span className="text-gold font-semibold">{formatRupiah(Number(tt.sold || 0) * Number(tt.price || 0))}</span></p>
                        <p className="text-muted-foreground text-xs">{Number(tt.sold || 0).toLocaleString('id-ID')} / {Number(tt.quota || 0).toLocaleString('id-ID')}</p>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-primary/10">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Benefits</h4>
                          <ul className="space-y-1.5">
                            {((tt.benefits || []) as string[]).map((b: string) => (
                              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isVVIP ? 'bg-gold' : 'bg-primary')} />
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
                    <div key={String(tt.id)} className={cn('rounded-xl border p-4 transition-all', 'bg-background border-primary/10', isExpanded && 'border-primary/30')}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{String(tt.emoji || '💺')}</span>
                          <div>
                            <p className="text-foreground font-semibold text-sm">{String(tt.name || '')}</p>
                            <p className="text-muted-foreground text-xs">{String(tt.zone || '')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent h-7 w-7 p-0" onClick={() => toggleTierExpand(String(tt.id))}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gold hover:text-gold hover:bg-gold/10 h-7 w-7 p-0" onClick={() => handleEditTier(String(tt.id))}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Harga</p><p className="text-primary font-bold text-sm">{formatRupiah(Number(tt.price || 0))}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Quota</p><p className="text-foreground font-semibold text-sm">{Number(tt.quota || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Terjual</p><p className="text-foreground font-semibold text-sm">{Number(tt.sold || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Tersedia</p><p className={cn('font-semibold text-sm', available === 0 ? 'text-red-400' : 'text-emerald-400')}>{available.toLocaleString('id-ID')}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">% Terjual</p><p className={cn('font-bold text-sm', percentage >= 90 ? 'text-red-400' : percentage >= 70 ? 'text-gold' : 'text-primary')}>{percentage}%</p></div>
                      </div>
                      <Progress value={percentage} className={cn('h-2 rounded-full', percentage >= 90 ? '[&>div]:bg-red-500' : percentage >= 70 ? '[&>div]:bg-gold' : '[&>div]:bg-primary')} />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-muted-foreground text-xs">Revenue: <span className="text-gold font-semibold">{formatRupiah(Number(tt.sold || 0) * Number(tt.price || 0))}</span></p>
                        <p className="text-muted-foreground text-xs">{Number(tt.sold || 0).toLocaleString('id-ID')} / {Number(tt.quota || 0).toLocaleString('id-ID')}</p>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-primary/10">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Benefits</h4>
                          <ul className="space-y-1.5">
                            {((tt.benefits || []) as string[]).map((b: string) => (
                              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary" />
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
            <div className="border-t border-primary/10 pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Ringkasan Penjualan per Tier
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-primary/10 hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Tier</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Terjual</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Quota</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">%</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByTier.map((tier) => (
                      <TableRow key={tier.name} className="border-primary/5 hover:bg-primary/5">
                        <TableCell className="text-foreground font-medium text-sm">{tier.name}</TableCell>
                        <TableCell className="text-right text-sm">{tier.terjual.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{tier.quota.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16">
                              <Progress value={tier.percentage} className={cn('h-1.5 rounded-full', tier.percentage >= 90 ? '[&>div]:bg-red-500' : tier.percentage >= 70 ? '[&>div]:bg-gold' : '[&>div]:bg-primary')} />
                            </div>
                            <span className={cn('text-xs font-semibold w-10 text-right', tier.percentage >= 90 ? 'text-red-400' : tier.percentage >= 70 ? 'text-gold' : 'text-primary')}>{tier.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-gold font-semibold text-sm">{formatRupiah(tier.revenue)}</TableCell>
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
        <DialogContent className="bg-card border-primary/20 text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Tier Tiket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Nama Tier</label>
              <Input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="bg-background border-primary/20 text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Harga (Rp)</label>
                <Input type="number" value={editForm.price} onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))} className="bg-background border-primary/20 text-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Quota</label>
                <Input type="number" value={editForm.quota} onChange={(e) => setEditForm(prev => ({ ...prev, quota: e.target.value }))} className="bg-background border-primary/20 text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Zone</label>
              <Input value={editForm.zone} onChange={(e) => setEditForm(prev => ({ ...prev, zone: e.target.value }))} className="bg-background border-primary/20 text-foreground" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-input text-foreground hover:bg-accent">Batal</Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={handleSaveTier}>Simpan Perubahan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
