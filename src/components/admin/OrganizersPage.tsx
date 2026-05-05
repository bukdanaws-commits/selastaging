'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/utils';
import { useOrganizers, useSetOrganizerFee, useApproveOrganizer } from '@/hooks/use-api';
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
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserCheck,
  UserX,
  DollarSign,
  Calendar,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Percent,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  EventIcon,
  Wallet,
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

type OrganizerStatus = 'active' | 'suspended' | 'pending';

interface OrganizerItem {
  id: string;
  name: string;
  email: string;
  status: OrganizerStatus;
  eventCount: number;
  feePercent: number;
  totalRevenue: number;
  balance: number;
  createdAt: string;
  events?: { id: string; title: string; status: string; date: string }[];
  withdrawalHistory?: { id: string; amount: number; status: string; createdAt: string }[];
}

// ─── STATUS HELPERS ─────────────────────────────────────────────────────────

function getOrgStatusBadge(status: OrganizerStatus) {
  const config: Record<OrganizerStatus, { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
    },
    suspended: {
      label: 'Suspended',
      className: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25',
    },
    pending: {
      label: 'Pending Approval',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
    },
  };
  const c = config[status];
  return <Badge variant="outline" className={cn('text-xs font-semibold', c.className)}>{c.label}</Badge>;
}

// ─── SET FEE DIALOG ─────────────────────────────────────────────────────────

function SetFeeDialog({
  organizer,
  currentFee,
}: {
  organizer: OrganizerItem;
  currentFee: number;
}) {
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(String(currentFee));
  const setOrganizerFee = useSetOrganizerFee();

  const handleSave = () => {
    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 1 || feeNum > 10) {
      toast.error('Fee harus antara 1% dan 10%');
      return;
    }
    setOrganizerFee.mutate(
      { organizerId: organizer.id, fee: feeNum },
      {
        onSuccess: () => {
          toast.success(`Fee ${organizer.name} diubah ke ${feeNum}%`);
          setOpen(false);
        },
        onError: () => {
          toast.error('Gagal mengubah fee');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2 text-xs"
        >
          <Percent className="w-3.5 h-3.5 mr-1" />
          Set Fee
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-input text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Set Platform Fee
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {organizer.name} — {organizer.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-3">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">
              Platform Fee (%)
            </label>
            <Input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="bg-background border-input text-foreground text-sm h-10"
            />
            <p className="text-[10px] text-muted-foreground">
              Fee antara 1% - 10%. Saat ini: {currentFee}%
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-input text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={handleSave}
            disabled={setOrganizerFee.isPending}
          >
            {setOrganizerFee.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ORGANIZER DETAIL DIALOG ────────────────────────────────────────────────

function OrganizerDetailDialog({ org }: { org: OrganizerItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-input text-foreground max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Detail Organizer
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {org.name} — {org.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-3">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="mt-1">{getOrgStatusBadge(org.status)}</div>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Platform Fee</p>
              <p className="text-foreground text-sm font-bold mt-1">{org.feePercent}%</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Revenue</p>
              <p className="text-gold text-sm font-bold mt-1">{formatRupiah(org.totalRevenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
              <p className="text-emerald-400 text-sm font-bold mt-1">{formatRupiah(org.balance)}</p>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Events */}
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <EventIcon className="w-4 h-4 text-primary" />
              Events ({org.events?.length || 0})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {org.events && org.events.length > 0 ? (
                org.events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-primary/5 border-input text-muted-foreground shrink-0 ml-2">
                      {event.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Belum ada event</p>
              )}
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Withdrawal History */}
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-gold" />
              Withdrawal History ({org.withdrawalHistory?.length || 0})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {org.withdrawalHistory && org.withdrawalHistory.length > 0 ? (
                org.withdrawalHistory.map((wd) => (
                  <div key={wd.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-sm text-foreground font-semibold">{formatRupiah(wd.amount)}</p>
                      <p className="text-xs text-muted-foreground">{wd.createdAt}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        wd.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : wd.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                      )}
                    >
                      {wd.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Belum ada withdrawal</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function OrganizersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useOrganizers();
  const approveOrganizer = useApproveOrganizer();

  const organizers: OrganizerItem[] = ((data as { data?: unknown[] } | undefined)?.data || (data as unknown[]) || []) as OrganizerItem[];

  // ── Filtered ──
  const filtered = useMemo(() => {
    return organizers.filter((org) => {
      const matchStatus = statusFilter === 'all' || org.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        org.name.toLowerCase().includes(q) ||
        org.email.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [organizers, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Stats ──
  const totalOrganizers = organizers.length;
  const activeCount = organizers.filter((o) => o.status === 'active').length;
  const pendingCount = organizers.filter((o) => o.status === 'pending').length;
  const totalRevenue = organizers.reduce((sum, o) => sum + o.totalRevenue, 0);

  const stats = [
    { label: 'Total Organizers', value: totalOrganizers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active', value: activeCount, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Pending Approval', value: pendingCount, icon: UserX, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Total Platform Revenue', value: formatRupiah(totalRevenue), icon: TrendingUp, color: 'text-gold', bg: 'bg-gold/10' },
  ];

  const handleToggleStatus = (org: OrganizerItem) => {
    if (org.status === 'pending') {
      approveOrganizer.mutate(org.id, {
        onSuccess: () => toast.success(`${org.name} telah disetujui`),
        onError: () => toast.error('Gagal menyetujui organizer'),
      });
    } else {
      toast.info(`${org.status === 'active' ? 'Suspend' : 'Aktifkan'} ${org.name} (demo)`);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load organizers</p>
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
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Organizer Management</h2>
          <p className="text-muted-foreground text-xs">Kelola organizer, set fee, dan pantau revenue</p>
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
                  placeholder="Cari nama atau email organizer..."
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
                  <SelectItem value="active" className="text-foreground">Active</SelectItem>
                  <SelectItem value="pending" className="text-foreground">Pending</SelectItem>
                  <SelectItem value="suspended" className="text-foreground">Suspended</SelectItem>
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
                <Users className="w-4 h-4 text-primary" />
                Daftar Organizer
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs mt-1">
                Menampilkan {filtered.length} organizer
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
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Nama</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Email</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Status</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Events</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Fee %</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-right">Revenue</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada organizer ditemukan</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((org) => (
                      <TableRow
                        key={org.id}
                        className="border-border hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}>
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-foreground font-medium truncate max-w-[160px]">{org.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{org.email}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">{getOrgStatusBadge(org.status)}</TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span className="text-sm text-foreground font-semibold">{org.eventCount}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span className="text-sm text-primary font-semibold">{org.feePercent}%</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <span className="text-sm text-gold font-semibold">{formatRupiah(org.totalRevenue)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <SetFeeDialog organizer={org} currentFee={org.feePercent} />
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'h-8 px-2 text-xs font-semibold',
                                org.status === 'pending'
                                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                                  : org.status === 'active'
                                    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                              )}
                              onClick={() => handleToggleStatus(org)}
                              disabled={approveOrganizer.isPending}
                            >
                              {org.status === 'pending' ? (
                                <><ShieldCheck className="w-3.5 h-3.5 mr-1" />Approve</>
                              ) : org.status === 'active' ? (
                                <><UserX className="w-3.5 h-3.5 mr-1" />Suspend</>
                              ) : (
                                <><UserCheck className="w-3.5 h-3.5 mr-1" />Activate</>
                              )}
                            </Button>
                            <OrganizerDetailDialog org={org} />
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
                <Button
                  variant="outline" size="sm"
                  className="h-8 px-3 border-input text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pn: number;
                  if (totalPages <= 7) pn = i + 1;
                  else if (safePage <= 4) pn = i + 1;
                  else if (safePage >= totalPages - 3) pn = totalPages - 6 + i;
                  else pn = safePage - 3 + i;
                  return (
                    <Button
                      key={pn}
                      variant={safePage === pn ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 text-xs font-semibold',
                        safePage === pn
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border-input text-muted-foreground hover:text-foreground hover:bg-primary/10'
                      )}
                      onClick={() => setCurrentPage(pn)}
                    >
                      {pn}
                    </Button>
                  );
                })}
                <Button
                  variant="outline" size="sm"
                  className="h-8 px-3 border-input text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
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
