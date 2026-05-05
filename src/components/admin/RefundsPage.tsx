'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/utils';
import { useRefunds } from '@/hooks/use-api';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  RefreshCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertTriangle,
  FileText,
  User,
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface RefundItem {
  id: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  processedAt?: string;
  createdAt: string;
  paymentMethod?: string;
  transactionId?: string;
}

// ─── STATUS HELPERS ─────────────────────────────────────────────────────────

function getRefundStatusBadge(status: RefundStatus) {
  const config: Record<RefundStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25' },
    processing: { label: 'Processing', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25' },
    completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' },
    failed: { label: 'Failed', className: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25' },
  };
  const c = config[status];
  return <Badge variant="outline" className={cn('text-xs font-semibold', c.className)}>{c.label}</Badge>;
}

// ─── PROCESS REFUND DIALOG ─────────────────────────────────────────────────

function ProcessRefundDialog({ refund }: { refund: RefundItem }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleProcess = () => {
    setProcessing(true);
    // Simulate processing delay
    setTimeout(() => {
      setProcessing(false);
      setOpen(false);
      setNote('');
      toast.success(`Refund ${refund.orderCode} berhasil diproses`);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-300 h-8 px-3 text-xs font-semibold"
        >
          <RefreshCcw className="w-3.5 h-3.5 mr-1" />
          Process
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.15)] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-emerald-400" />
            Process Refund
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Proses refund untuk pesanan <span className="font-mono text-[#00A39D]">{refund.orderCode}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-3">
          <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-white">{refund.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Refund Amount</span>
              <span className="text-[#F8AD3C] text-sm font-bold">{formatRupiah(refund.amount)}</span>
            </div>
            {refund.paymentMethod && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Payment Method</span>
                <span className="text-xs text-white">{refund.paymentMethod}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <p className="text-xs text-amber-400 font-medium mb-1">Reason:</p>
            <p className="text-sm text-white">{refund.reason}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Catatan (opsional)
            </label>
            <Textarea
              placeholder="Catatan proses refund..."
              className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white placeholder:text-muted-foreground/50 min-h-[60px] resize-none text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-[rgba(0,163,157,0.2)] text-muted-foreground hover:text-white" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25" onClick={handleProcess} disabled={processing}>
            {processing ? 'Processing...' : 'Proses Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── REFUND DETAIL DIALOG ──────────────────────────────────────────────────

function RefundDetailDialog({ refund }: { refund: RefundItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[#00A39D] hover:text-[#00BFB8] hover:bg-[rgba(0,163,157,0.1)] h-8 px-2">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.15)] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00A39D]" />
            Detail Refund
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">{refund.orderCode}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
              <p className="text-[#F8AD3C] text-sm font-bold mt-1">{formatRupiah(refund.amount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="mt-1">{getRefundStatusBadge(refund.status)}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-white">{refund.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Requested: {refund.createdAt}</span>
            </div>
            {refund.processedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Processed: {refund.processedAt}</span>
              </div>
            )}
            {refund.paymentMethod && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Payment: {refund.paymentMethod}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Reason</p>
            <p className="text-sm text-white">{refund.reason}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function RefundsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useRefunds();

  const refunds: RefundItem[] = ((data as { data?: unknown[] } | undefined)?.data || (data as unknown[]) || []) as RefundItem[];

  const filtered = useMemo(() => {
    return refunds.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.orderCode.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [refunds, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Stats ──
  const totalRefunds = refunds.length;
  const totalRefundAmount = refunds.reduce((s, r) => s + r.amount, 0);
  const pendingRefunds = refunds.filter((r) => r.status === 'pending').length;

  const stats = [
    { label: 'Total Refunds', value: totalRefunds, icon: RefreshCcw, color: 'text-[#00A39D]', bg: 'bg-[rgba(0,163,157,0.1)]' },
    { label: 'Refund Amount', value: formatRupiah(totalRefundAmount), icon: DollarSign, color: 'text-[#F8AD3C]', bg: 'bg-[rgba(248,173,60,0.1)]' },
    { label: 'Pending Refunds', value: pendingRefunds, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Completed', value: refunds.filter((r) => r.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load refunds</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(0,163,157,0.1)] flex items-center justify-center">
          <RefreshCcw className="w-5 h-5 text-[#00A39D]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Refund Management</h2>
          <p className="text-muted-foreground text-xs">Kelola refund dan proses pengembalian dana</p>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-[#111918] border-[rgba(0,163,157,0.1)] hover:border-[rgba(0,163,157,0.25)] transition-all">
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

      {/* ═══ FILTER ═══ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order code atau nama customer..."
                  className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white placeholder:text-muted-foreground/50 pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
            <div className="w-full sm:w-44">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white h-9">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#111918] border-[rgba(0,163,157,0.15)]">
                  <SelectItem value="all" className="text-white">Semua Status</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="processing" className="text-white">Processing</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                  <SelectItem value="failed" className="text-white">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ TABLE ═══ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-[#00A39D]" />
              Daftar Refund
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs mt-1">
              Menampilkan {filtered.length} refund
            </CardDescription>
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
                  <TableRow className="border-[rgba(0,163,157,0.08)] hover:bg-transparent">
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Order Code</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Customer</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-right">Amount</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Reason</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Status</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Processed</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow className="border-[rgba(0,163,157,0.05)]">
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada refund ditemukan</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((refund) => (
                      <TableRow key={refund.id} className="border-[rgba(0,163,157,0.05)] hover:bg-[rgba(0,163,157,0.04)] transition-colors">
                        <TableCell className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-[#00A39D]">{refund.orderCode.slice(-8)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-sm text-white font-medium truncate max-w-[140px]">{refund.customerName}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{refund.customerEmail}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <span className="text-sm text-[#F8AD3C] font-semibold">{formatRupiah(refund.amount)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{refund.reason}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">{getRefundStatusBadge(refund.status)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">{refund.processedAt || '—'}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {refund.status === 'pending' && <ProcessRefundDialog refund={refund} />}
                            <RefundDetailDialog refund={refund} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ═══ PAGINATION ═══ */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(0,163,157,0.08)]">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 border-[rgba(0,163,157,0.15)] text-muted-foreground hover:text-white hover:bg-[rgba(0,163,157,0.1)]" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pn: number;
                  if (totalPages <= 7) pn = i + 1;
                  else if (safePage <= 4) pn = i + 1;
                  else if (safePage >= totalPages - 3) pn = totalPages - 6 + i;
                  else pn = safePage - 3 + i;
                  return (
                    <Button key={pn} variant={safePage === pn ? 'default' : 'outline'} size="sm"
                      className={cn('h-8 w-8 p-0 text-xs font-semibold', safePage === pn ? 'bg-[#00A39D] text-[#0A0F0E] hover:bg-[#00BFB8]' : 'border-[rgba(0,163,157,0.15)] text-muted-foreground hover:text-white hover:bg-[rgba(0,163,157,0.1)]')}
                      onClick={() => setCurrentPage(pn)}
                    >
                      {pn}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" className="h-8 px-3 border-[rgba(0,163,157,0.15)] text-muted-foreground hover:text-white hover:bg-[rgba(0,163,157,0.1)]" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
