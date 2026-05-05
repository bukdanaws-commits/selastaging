'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/utils';
import { usePaymentLogs } from '@/hooks/use-api';
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
import {
  CreditCard,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  FileText,
  AlertTriangle,
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

type PaymentLogStatus = 'success' | 'pending' | 'failed' | 'refunded';

interface PaymentLogItem {
  id: string;
  orderCode: string;
  transactionId: string;
  paymentMethod: string;
  amount: number;
  status: PaymentLogStatus;
  paidAt: string;
  dokuResponse?: Record<string, unknown>;
}

// ─── STATUS HELPERS ─────────────────────────────────────────────────────────

function getPaymentStatusBadge(status: PaymentLogStatus) {
  const config: Record<PaymentLogStatus, { label: string; className: string }> = {
    success: { label: 'Success', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' },
    pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25' },
    failed: { label: 'Failed', className: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25' },
    refunded: { label: 'Refunded', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25' },
  };
  const c = config[status];
  return <Badge variant="outline" className={cn('text-xs font-semibold', c.className)}>{c.label}</Badge>;
}

// ─── DOKU RESPONSE DIALOG ───────────────────────────────────────────────────

function DokuResponseDialog({ log }: { log: PaymentLogItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[#00A39D] hover:text-[#00BFB8] hover:bg-[rgba(0,163,157,0.1)] h-8 px-2">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.15)] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00A39D]" />
            DOKU Response Data
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {log.orderCode} — {log.transactionId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Order Code</p>
              <p className="text-sm text-white font-mono font-semibold mt-1">{log.orderCode}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Transaction ID</p>
              <p className="text-sm text-white font-mono font-semibold mt-1">{log.transactionId}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Payment Method</p>
              <p className="text-sm text-white font-medium mt-1">{log.paymentMethod}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
              <p className="text-sm text-[#F8AD3C] font-bold mt-1">{formatRupiah(log.amount)}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0F0E] border border-white/5">
            <p className="text-xs text-muted-foreground font-medium mb-2">Full DOKU Response</p>
            <pre className="text-xs text-[#7FB3AE] font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
              {JSON.stringify(log.dokuResponse || { status: log.status, transactionId: log.transactionId }, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function PaymentLogsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = usePaymentLogs();

  const paymentLogs: PaymentLogItem[] = ((data as { data?: unknown[] } | undefined)?.data || (data as unknown[]) || []) as PaymentLogItem[];

  // Unique payment methods for filter
  const uniqueMethods = useMemo(() => [...new Set(paymentLogs.map((l) => l.paymentMethod))], [paymentLogs]);

  const filtered = useMemo(() => {
    return paymentLogs.filter((log) => {
      const matchStatus = statusFilter === 'all' || log.status === statusFilter;
      const matchMethod = methodFilter === 'all' || log.paymentMethod === methodFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || log.orderCode.toLowerCase().includes(q) || log.transactionId.toLowerCase().includes(q);
      return matchStatus && matchMethod && matchSearch;
    });
  }, [paymentLogs, statusFilter, methodFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Stats ──
  const totalCount = paymentLogs.length;
  const successCount = paymentLogs.filter((l) => l.status === 'success').length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
  const totalVolume = paymentLogs.filter((l) => l.status === 'success').reduce((s, l) => s + l.amount, 0);

  const stats = [
    { label: 'Total Payments', value: totalCount, icon: CreditCard, color: 'text-[#00A39D]', bg: 'bg-[rgba(0,163,157,0.1)]' },
    { label: 'Success Rate', value: `${successRate}%`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Volume', value: formatRupiah(totalVolume), icon: DollarSign, color: 'text-[#F8AD3C]', bg: 'bg-[rgba(248,173,60,0.1)]' },
    { label: 'Failed', value: paymentLogs.filter((l) => l.status === 'failed').length, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load payment logs</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,163,157,0.1)] flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[#00A39D]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Payment Logs</h2>
            <p className="text-muted-foreground text-xs">View all DOKU payment transactions</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-[rgba(0,163,157,0.2)] text-[#00A39D] hover:text-white hover:bg-[rgba(0,163,157,0.1)] text-xs"
          onClick={() => toast.info('Export feature coming soon')}
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
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
                  placeholder="Cari order code atau transaction ID..."
                  className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white placeholder:text-muted-foreground/50 pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
            <div className="w-full sm:w-40">
              <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white h-9">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent className="bg-[#111918] border-[rgba(0,163,157,0.15)]">
                  <SelectItem value="all" className="text-white">Semua Method</SelectItem>
                  {uniqueMethods.map((m) => (
                    <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#111918] border-[rgba(0,163,157,0.15)]">
                  <SelectItem value="all" className="text-white">Semua Status</SelectItem>
                  <SelectItem value="success" className="text-white">Success</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="failed" className="text-white">Failed</SelectItem>
                  <SelectItem value="refunded" className="text-white">Refunded</SelectItem>
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
              <CreditCard className="w-4 h-4 text-[#00A39D]" />
              Daftar Payment Log
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs mt-1">
              Menampilkan {filtered.length} transaksi
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
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Transaction ID</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Payment Method</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-right">Amount</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Status</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Paid At</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow className="border-[rgba(0,163,157,0.05)]">
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada payment log ditemukan</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((log) => (
                      <TableRow key={log.id} className="border-[rgba(0,163,157,0.05)] hover:bg-[rgba(0,163,157,0.04)] transition-colors">
                        <TableCell className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-[#00A39D]">{log.orderCode.slice(-8)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px] block">{log.transactionId}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] bg-[rgba(0,163,157,0.06)] border-[rgba(0,163,157,0.2)] text-[#7FB3AE]">
                            {log.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <span className="text-sm text-[#F8AD3C] font-semibold">{formatRupiah(log.amount)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">{getPaymentStatusBadge(log.status)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">{log.paidAt}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <DokuResponseDialog log={log} />
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
