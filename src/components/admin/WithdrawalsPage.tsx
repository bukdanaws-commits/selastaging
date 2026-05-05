'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/utils';
import { useWithdrawals, useApproveWithdrawal, useRejectWithdrawal, useUploadTransferProof } from '@/hooks/use-api';
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
import { Separator } from '@/components/ui/separator';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
  RefreshCcw,
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

type WithdrawalStatus = 'pending' | 'approved' | 'transferred' | 'completed' | 'rejected' | 'dispute';

interface WithdrawalItem {
  id: string;
  organizerName: string;
  organizerEmail: string;
  eventName: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  transferProofUrl?: string;
  transferNote?: string;
  rejectReason?: string;
}

// ─── STATUS BADGE ───────────────────────────────────────────────────────────

function getWdStatusBadge(status: WithdrawalStatus) {
  const config: Record<WithdrawalStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25' },
    approved: { label: 'Approved', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25' },
    transferred: { label: 'Transferred', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' },
    completed: { label: 'Completed', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25' },
    rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25' },
    dispute: { label: 'Dispute', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25' },
  };
  const c = config[status];
  return <Badge variant="outline" className={cn('text-xs font-semibold', c.className)}>{c.label}</Badge>;
}

// ─── REJECT MODAL ───────────────────────────────────────────────────────────

function RejectModal({
  wd,
  onReject,
}: {
  wd: WithdrawalItem;
  onReject: (id: string, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    onReject(wd.id, reason);
    setReason('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:text-red-300 h-8 px-3 text-xs font-semibold"
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-input text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            Reject Withdrawal
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Tolak permintaan withdrawal dari <span className="font-semibold text-foreground">{wd.organizerName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-3">
          <div className="p-3 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-gold text-sm font-bold">{formatRupiah(wd.amount)}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Alasan Penolakan <span className="text-red-400">*</span>
            </label>
            <Textarea
              placeholder="Masukkan alasan penolakan..."
              className="bg-background border-input text-foreground placeholder:text-muted-foreground/50 min-h-[80px] resize-none text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-input text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25" onClick={handleSubmit}>
            Tolak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TRANSFER PROOF UPLOAD DIALOG ───────────────────────────────────────────

function UploadTransferProofDialog({
  wd,
}: {
  wd: WithdrawalItem;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const uploadProof = useUploadTransferProof();

  const handleSubmit = () => {
    if (!file) {
      toast.error('Upload bukti transfer terlebih dahulu');
      return;
    }
    uploadProof.mutate(
      { withdrawalId: wd.id, file, note },
      {
        onSuccess: () => {
          toast.success('Bukti transfer berhasil diupload');
          setOpen(false);
          setFile(null);
          setNote('');
        },
        onError: () => toast.error('Gagal upload bukti transfer'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 hover:text-blue-300 h-8 px-3 text-xs font-semibold"
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          Upload Proof
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-input text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            Upload Transfer Proof
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {wd.organizerName} — {formatRupiah(wd.amount)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-3">
          <div className="p-3 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground">Bank Account</p>
            <p className="text-foreground text-sm font-medium">{wd.bankName} — {wd.bankHolder}</p>
            <p className="text-xs text-muted-foreground font-mono">{wd.bankAccount}</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Bukti Transfer</label>
            <Input
              type="file"
              accept="image/*,.pdf"
              className="bg-background border-input text-foreground text-sm h-10 file:text-primary"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Catatan (opsional)</label>
            <Textarea
              placeholder="Catatan transfer..."
              className="bg-background border-input text-foreground placeholder:text-muted-foreground/50 min-h-[60px] resize-none text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-input text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={handleSubmit} disabled={uploadProof.isPending}>
            {uploadProof.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── VIEW PROOF DIALOG ──────────────────────────────────────────────────────

function ViewProofDialog({ wd }: { wd: WithdrawalItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-input text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Transfer Proof
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">{wd.organizerName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-3">
          <div className="p-3 rounded-lg bg-background border border-border space-y-1">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-gold text-sm font-bold">{formatRupiah(wd.amount)}</p>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border space-y-1">
            <p className="text-xs text-muted-foreground">Transfer Note</p>
            <p className="text-foreground text-sm">{wd.transferNote || '—'}</p>
          </div>
          {wd.transferProofUrl && (
            <div className="p-3 rounded-lg bg-background border border-border text-center">
              <p className="text-xs text-muted-foreground mb-2">Bukti Transfer</p>
              <div className="w-full h-40 rounded bg-primary/5 border border-dashed border-input flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground/40" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function WithdrawalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useWithdrawals();
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();

  const withdrawals: WithdrawalItem[] = ((data as { data?: unknown[] } | undefined)?.data || (data as unknown[]) || []) as WithdrawalItem[];

  const filtered = useMemo(() => {
    return withdrawals.filter((wd) => {
      const matchStatus = statusFilter === 'all' || wd.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        wd.organizerName.toLowerCase().includes(q) ||
        wd.eventName.toLowerCase().includes(q) ||
        wd.bankAccount.includes(q);
      return matchStatus && matchSearch;
    });
  }, [withdrawals, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Stats ──
  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const pendingAmount = withdrawals.filter((w) => w.status === 'pending').reduce((s, w) => s + w.amount, 0);
  const completedToday = withdrawals.filter((w) => w.status === 'completed').length;
  const totalDisbursed = withdrawals.filter((w) => ['transferred', 'completed'].includes(w.status)).reduce((s, w) => s + w.amount, 0);

  const stats = [
    { label: 'Pending WD', value: pendingCount, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Total Pending Amount', value: formatRupiah(pendingAmount), icon: DollarSign, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Completed Today', value: completedToday, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Disbursed', value: formatRupiah(totalDisbursed), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  const handleReject = useCallback((id: string, reason: string) => {
    rejectWithdrawal.mutate(
      { withdrawalId: id, reason },
      {
        onSuccess: () => toast.success('Withdrawal ditolak'),
        onError: () => toast.error('Gagal menolak withdrawal'),
      }
    );
  }, [rejectWithdrawal]);

  const handleApprove = useCallback((id: string) => {
    approveWithdrawal.mutate(id, {
      onSuccess: () => toast.success('Withdrawal disetujui'),
      onError: () => toast.error('Gagal menyetujui withdrawal'),
    });
  }, [approveWithdrawal]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load withdrawals</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Withdrawal Management</h2>
          <p className="text-muted-foreground text-xs">Approve, reject, dan upload bukti transfer withdrawal</p>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border hover:border-primary/25 transition-all">
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
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari organizer, event, atau rekening..."
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground/50 pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
            <div className="w-full sm:w-44">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="bg-background border-input text-foreground h-9">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-input">
                  <SelectItem value="all" className="text-foreground">Semua Status</SelectItem>
                  <SelectItem value="pending" className="text-foreground">Pending</SelectItem>
                  <SelectItem value="approved" className="text-foreground">Approved</SelectItem>
                  <SelectItem value="transferred" className="text-foreground">Transferred</SelectItem>
                  <SelectItem value="completed" className="text-foreground">Completed</SelectItem>
                  <SelectItem value="rejected" className="text-foreground">Rejected</SelectItem>
                  <SelectItem value="dispute" className="text-foreground">Dispute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ TABLE ═══ */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Daftar Withdrawal
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs mt-1">
                Menampilkan {filtered.length} withdrawal
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
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Organizer</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Event</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-right">Amount</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Bank Account</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Status</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Requested</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada withdrawal ditemukan</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((wd) => (
                      <TableRow key={wd.id} className="border-border hover:bg-primary/5 transition-colors">
                        <TableCell className="px-4 py-3">
                          <p className="text-sm text-foreground font-medium truncate max-w-[130px]">{wd.organizerName}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{wd.organizerEmail}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-foreground truncate max-w-[120px]">{wd.eventName}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <span className="text-sm text-gold font-semibold">{formatRupiah(wd.amount)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-foreground">{wd.bankName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{wd.bankAccount} — {wd.bankHolder}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">{getWdStatusBadge(wd.status)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">{wd.requestedAt}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {wd.status === 'pending' && (
                              <>
                                <Button size="sm" className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 h-8 px-3 text-xs font-semibold" onClick={() => handleApprove(wd.id)} disabled={approveWithdrawal.isPending}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                                </Button>
                                <RejectModal wd={wd} onReject={handleReject} />
                              </>
                            )}
                            {wd.status === 'approved' && (
                              <UploadTransferProofDialog wd={wd} />
                            )}
                            {wd.status === 'transferred' && (
                              <ViewProofDialog wd={wd} />
                            )}
                            {wd.status === 'dispute' && (
                              <Button size="sm" className="bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 h-8 px-3 text-xs font-semibold" onClick={() => toast.info('Investigate feature coming soon')}>
                                <RefreshCcw className="w-3.5 h-3.5 mr-1" />Investigate
                              </Button>
                            )}
                            {wd.status === 'completed' && <span className="text-xs text-muted-foreground">—</span>}
                            {wd.status === 'rejected' && (
                              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400/70 border-red-500/20">
                                {wd.rejectReason || 'Rejected'}
                              </Badge>
                            )}
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 border-input text-muted-foreground hover:text-foreground hover:bg-primary/10" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
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
                      className={cn('h-8 w-8 p-0 text-xs font-semibold', safePage === pn ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-input text-muted-foreground hover:text-foreground hover:bg-primary/10')}
                      onClick={() => setCurrentPage(pn)}
                    >
                      {pn}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" className="h-8 px-3 border-input text-muted-foreground hover:text-foreground hover:bg-primary/10" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
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
