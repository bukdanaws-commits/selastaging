'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { useAdminOrders } from '@/hooks/use-api';
import { useAdminDashboard } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  TimerReset,
  DollarSign,
  QrCode,
  Building2,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  User,
  Mail,
  CreditCard,
  Calendar,
  TrendingUp,
  CircleDot,
  AlertTriangle,
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const TICKET_TYPES = [
  'VVIP PIT',
  'VIP ZONE',
  'FESTIVAL',
  'CAT 1',
  'CAT 2',
  'CAT 3',
  'CAT 4',
  'CAT 5',
];

// ─── STATUS HELPERS ─────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    paid: {
      label: 'Paid',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
    },
    pending: {
      label: 'Pending',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25',
    },
    expired: {
      label: 'Expired',
      className: 'bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25',
    },
  };
  const c = config[status] || config.pending;
  return <Badge variant="outline" className={cn('text-xs font-semibold', c.className)}>{c.label}</Badge>;
}

// ─── ORDER DETAIL DIALOG ───────────────────────────────────────────────────

function OrderDetailDialog({ order }: { order: Record<string, unknown> }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2">
          <Eye className="w-4 h-4 mr-1" />
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-primary/15 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Detail Pesanan
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Informasi lengkap pesanan {String(order.orderCode || order.id || '')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Order Info Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Kode Pesanan</p>
              <p className="text-base font-mono font-bold text-primary">{String(order.orderCode || order.id || '')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
              {getStatusBadge(String(order.status || ''))}
            </div>
          </div>

          {/* Order Items */}
          <Card className="bg-background border-primary/10">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Item Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
                <div>
                  <p className="text-foreground font-medium text-sm">{String(order.ticketType || (order.items as Record<string, unknown>[])?.[0]?.ticketType || 'N/A')}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{formatRupiah(Number(order.pricePerTicket || 0))} / tiket</p>
                </div>
                <div className="text-right">
                  <p className="text-foreground font-semibold">x{Number(order.quantity || 0)}</p>
                  <p className="text-gold font-bold text-sm mt-0.5">{formatRupiah(Number(order.totalAmount || 0))}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <p className="text-muted-foreground text-sm font-medium">Total Pembayaran</p>
                <p className="text-foreground font-bold text-lg">{formatRupiah(Number(order.totalAmount || 0))}</p>
              </div>
            </CardContent>
          </Card>

          {/* Buyer Details */}
          <Card className="bg-background border-primary/10">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Data Pembeli
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center gap-3">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Nama</p>
                  <p className="text-foreground text-sm font-medium">{String((order.user as Record<string, unknown>)?.name || order.userName || '—')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-foreground text-sm font-medium">{String((order.user as Record<string, unknown>)?.email || order.userEmail || '—')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Order</p>
                  <p className="text-foreground text-sm font-medium">{formatDateTime(String(order.createdAt || ''))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="bg-background border-primary/10">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Informasi Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center gap-3">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Metode Pembayaran</p>
                  <p className="text-foreground text-sm font-medium">{String(order.paymentMethod || order.paymentType || '—')}</p>
                </div>
              </div>
              {order.paidAt != null && (
                <div className="flex items-center gap-3">
                  <CircleDot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal Bayar</p>
                    <p className="text-foreground text-sm font-medium">{formatDateTime(String(order.paidAt))}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            className="border-primary/20 text-muted-foreground hover:text-foreground hover:bg-primary/10"
            onClick={() => toast.info('Fitur export sedang dalam pengembangan')}
          >
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimelineItem({
  label,
  time,
  icon,
  active,
  color,
}: {
  label: string;
  time: string;
  icon?: React.ReactNode;
  active?: boolean;
  color?: string;
}) {
  const dotColor = color || (active ? 'bg-primary' : 'bg-gray-600');
  const textColor = color || (active ? 'text-foreground' : 'text-muted-foreground');

  return (
    <div className="relative flex items-start gap-3 pl-3">
      <div className={cn('absolute -left-3 top-1.5 w-3 h-3 rounded-full border-2 border-card', dotColor)} />
      <div className="flex-1">
        <p className={cn('text-xs font-medium', textColor)}>{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(time)}</p>
      </div>
      {icon && (
        <div className={cn('mt-0.5', color || 'text-muted-foreground')}>{icon}</div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: ordersResponse, isLoading, error } = useAdminOrders();
  const { data: dashboardData } = useAdminDashboard();

  const allOrders = ((ordersResponse as { data?: unknown[] } | undefined)?.data || []) as Record<string, unknown>[];
  const kpis = dashboardData as Record<string, unknown> | undefined;

  // ── Filtered orders ──
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchTicket = ticketFilter === 'all' || order.ticketType === ticketFilter || (order.items as Record<string, unknown>[])?.[0]?.ticketType === ticketFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        String(order.orderCode || '').toLowerCase().includes(q) ||
        String((order.user as Record<string, unknown>)?.name || order.userName || '').toLowerCase().includes(q);
      return matchStatus && matchTicket && matchSearch;
    });
  }, [allOrders, statusFilter, ticketFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedOrders = filteredOrders.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // ── Stats ──
  const totalRevenue = allOrders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const paidCount = allOrders.filter((o) => o.status === 'paid').length;
  const pendingCount = allOrders.filter((o) => o.status === 'pending').length;
  const rejectedCount = allOrders.filter((o) => o.status === 'rejected').length;

  const stats = [
    {
      label: 'Total Orders',
      value: allOrders.length,
      icon: ShoppingCart,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Paid',
      value: paidCount,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Rejected',
      value: rejectedCount,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Total Revenue',
      value: formatRupiah(totalRevenue),
      icon: DollarSign,
      color: 'text-gold',
      bg: 'bg-gold/10',
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load orders</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ PAGE HEADER ═══ */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-primary" />
          Orders &amp; Payments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola semua pesanan dan pembayaran tiket
        </p>
      </div>

      {/* ═══ STATS ROW ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="bg-card border-primary/10 hover:border-primary/25 transition-all"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
                  <stat.icon className={cn('w-4 h-4', stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className={cn('text-lg font-bold truncate', stat.color)}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ PAYMENT SUMMARY ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card border-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">QRIS</p>
              <p className="text-foreground font-bold text-lg">{allOrders.filter(o => String(o.paymentType || o.paymentMethod || '').includes('QRIS')).length}</p>
              <p className="text-[10px] text-muted-foreground">transaksi</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transfer Bank</p>
              <p className="text-foreground font-bold text-lg">{allOrders.filter(o => String(o.paymentType || o.paymentMethod || '').includes('Transfer') || String(o.paymentType || o.paymentMethod || '').includes('bank')).length}</p>
              <p className="text-[10px] text-muted-foreground">transaksi</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-emerald-400 font-bold text-lg">
                {allOrders.length > 0
                  ? Math.round((paidCount / allOrders.length) * 100)
                  : 0}
                %
              </p>
              <p className="text-[10px] text-muted-foreground">{paidCount} dari {allOrders.length} order</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ FILTER ROW ═══ */}
      <Card className="bg-card border-primary/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Cari (Kode / Nama)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kode pesanan atau nama pembeli..."
                  className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="w-full sm:w-44">
              <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-background border-primary/15 text-foreground h-9">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/15">
                  <SelectItem value="all" className="text-foreground">Semua Status</SelectItem>
                  <SelectItem value="paid" className="text-foreground">Paid</SelectItem>
                  <SelectItem value="pending" className="text-foreground">Pending</SelectItem>
                  <SelectItem value="rejected" className="text-foreground">Rejected</SelectItem>
                  <SelectItem value="cancelled" className="text-foreground">Cancelled</SelectItem>
                  <SelectItem value="expired" className="text-foreground">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-44">
              <label className="text-xs text-muted-foreground mb-1.5 block">Tipe Tiket</label>
              <Select
                value={ticketFilter}
                onValueChange={(v) => {
                  setTicketFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-background border-primary/15 text-foreground h-9">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/15">
                  <SelectItem value="all" className="text-foreground">Semua Tipe</SelectItem>
                  {TICKET_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-foreground">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ ORDERS TABLE ═══ */}
      <Card className="bg-card border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-primary" />
                Daftar Pesanan
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs mt-1">
                Menampilkan {filteredOrders.length} pesanan (Halaman {safePage} dari {totalPages})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/10 hover:bg-transparent">
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Kode Order</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Pembeli</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Tipe Tiket</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Qty</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-right">Total</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Metode</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Status</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Tanggal</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedOrders.length === 0 ? (
                    <TableRow className="border-primary/5">
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada pesanan ditemukan</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Coba ubah filter atau kata kunci pencarian
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedOrders.map((order) => (
                      <TableRow
                        key={String(order.id)}
                        className="border-primary/5 hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-primary">
                            {String(order.orderCode || order.id || '').slice(-8)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-sm text-foreground font-medium truncate max-w-[140px]">
                            {String((order.user as Record<string, unknown>)?.name || order.userName || '—')}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {String((order.user as Record<string, unknown>)?.email || order.userEmail || '')}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-primary/10 border-primary/20 text-muted-foreground"
                          >
                            {String(order.ticketType || (order.items as Record<string, unknown>[])?.[0]?.ticketType || '—')}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span className="text-sm text-foreground font-semibold">{Number(order.quantity || (order.items as Record<string, unknown>[])?.length || 0)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <span className="text-sm text-foreground font-semibold">
                            {formatRupiah(Number(order.totalAmount || 0))}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">{String(order.paymentMethod || order.paymentType || '—')}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">{getStatusBadge(String(order.status || ''))}</TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(String(order.createdAt || ''))}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <OrderDetailDialog order={order} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ═══ PAGINATION ═══ */}
          {filteredOrders.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredOrders.length)} dari{' '}
                {filteredOrders.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-primary/15 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (safePage <= 4) {
                    pageNum = i + 1;
                  } else if (safePage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = safePage - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={safePage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 text-xs font-semibold',
                        safePage === pageNum
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border-primary/15 text-muted-foreground hover:text-foreground hover:bg-primary/10'
                      )}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-primary/15 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
