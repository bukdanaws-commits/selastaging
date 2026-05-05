'use client';

import React, { useState, useMemo } from 'react';
import { cn, formatRupiah } from '@/lib/utils';
import { useAdminTickets, useAdminDashboard } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Ticket,
  CheckCircle2,
  XCircle,
  LogIn,
  Users,
  Watch,
  Link2,
  Search,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  Clock,
  ArrowRight,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

type TicketStatus = 'active' | 'redeemed' | 'inside' | 'cancelled';

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: <Ticket className="w-3 h-3" />,
  },
  redeemed: {
    label: 'Redeemed',
    className: 'bg-[#00A39D]/15 text-[#00A39D] border-[#00A39D]/30',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  inside: {
    label: 'Inside Venue',
    className: 'bg-[#F8AD3C]/15 text-[#F8AD3C] border-[#F8AD3C]/30',
    icon: <LogIn className="w-3 h-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: <XCircle className="w-3 h-3" />,
  },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function TicketsPage() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: ticketsData, isLoading, error } = useAdminTickets();
  const { data: dashboardData } = useAdminDashboard();

  const kpis = dashboardData as Record<string, unknown> | undefined;
  const allTickets = ((ticketsData as { data?: unknown[] } | undefined)?.data || []) as Record<string, unknown>[];

  // Map API tickets to display format
  const tickets = useMemo(() => {
    return allTickets.map((t) => ({
      id: String(t.id || ''),
      ticketCode: String(t.ticketCode || ''),
      orderCode: String(t.orderCode || ''),
      userName: String(t.userName || t.attendeeName || ''),
      ticketType: String(t.ticketType || t.ticketTypeName || ''),
      tier: String(t.tier || t.zone || ''),
      status: (['active', 'redeemed', 'inside', 'cancelled'].includes(String(t.status)) ? String(t.status) : 'active') as TicketStatus,
      wristbandCode: String(t.wristbandCode || t.wristbandLinked ? t.wristbandCode : ''),
      wristbandLinked: Boolean(t.wristbandLinked || t.wristbandCode),
      redeemedBy: String(t.redeemedBy || ''),
      redeemedAt: String(t.redeemedAt || ''),
      createdAt: String(t.createdAt || ''),
    }));
  }, [allTickets]);

  // Wristband stats from dashboard
  const wristbandStats = {
    total: Number(kpis?.wristbandTotal || 15000),
    assigned: Number(kpis?.wristbandAssigned || tickets.filter((t) => t.wristbandLinked).length),
    unused: Number(kpis?.wristbandUnused || 0),
    scanned: Number(kpis?.wristbandScanned || tickets.filter((t) => t.status === 'inside').length),
  };

  // ── Filtered data ──
  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (activeFilter !== 'all') {
      result = result.filter((t) => t.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(q) ||
          t.orderCode.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          (t.wristbandCode && t.wristbandCode.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tickets, activeFilter, searchQuery]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ── Stats ──
  const stats = useMemo(
    () => ({
      total: tickets.length,
      active: tickets.filter((t) => t.status === 'active').length,
      redeemed: tickets.filter((t) => t.status === 'redeemed').length,
      inside: tickets.filter((t) => t.status === 'inside').length,
      cancelled: tickets.filter((t) => t.status === 'cancelled').length,
      wristbandsAssigned: wristbandStats.assigned,
      wristbandsUnused: wristbandStats.unused,
    }),
    [tickets, wristbandStats]
  );

  const wristbandAssignedPct =
    wristbandStats.total > 0
      ? Math.round((wristbandStats.assigned / wristbandStats.total) * 100)
      : 0;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr || dateStr === '') return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load tickets</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Ticket className="w-6 h-6 text-[#00A39D]" />
          Tickets &amp; Wristbands
        </h2>
        <p className="text-[#7FB3AE] text-sm mt-1">
          Manage event tickets, redemption status, and wristband assignments
        </p>
      </div>

      {/* ═══════════ STATS ROW ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Tickets', value: stats.total, icon: Ticket, color: 'text-white' },
          { label: 'Active', value: stats.active, icon: Ticket, color: 'text-emerald-400' },
          { label: 'Redeemed', value: stats.redeemed, icon: CheckCircle2, color: 'text-[#00A39D]' },
          { label: 'Inside Venue', value: stats.inside, icon: LogIn, color: 'text-[#F8AD3C]' },
          { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-red-400' },
          { label: 'WB Assigned', value: stats.wristbandsAssigned, icon: Watch, color: 'text-[#00A39D]' },
          { label: 'WB Unused', value: stats.wristbandsUnused, icon: Watch, color: 'text-[#7FB3AE]' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#111918] border-[rgba(0,163,157,0.1)] py-4">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgba(0,163,157,0.08)] flex items-center justify-center shrink-0">
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-lg font-bold leading-tight', stat.color)}>
                  {stat.value.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-[#7FB3AE] truncate">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══════════ FILTER & SEARCH ═══════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setCurrentPage(1); }}>
          <TabsList className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
            {[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'redeemed', label: 'Redeemed' },
              { value: 'inside', label: 'Inside' },
              { value: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-[#00A39D]/15 data-[state=active]:text-[#00A39D] text-[#7FB3AE]">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
          <Input
            placeholder="Search ticket, order, attendee..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9 bg-[#111918] border-[rgba(0,163,157,0.1)] text-white placeholder:text-[#7FB3AE]/60 h-9"
          />
        </div>
      </div>

      {/* ═══════════ TICKETS TABLE ═══════════ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(0,163,157,0.1)] hover:bg-transparent">
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Ticket Code</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Order Code</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Attendee</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Ticket Type</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Tier</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Status</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Wristband</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Redeemed By</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="text-center py-12 text-[#7FB3AE]">
                      <Ticket className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No tickets found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTickets.map((ticket) => {
                    const sc = statusConfig[ticket.status] || statusConfig.active;
                    return (
                      <TableRow key={ticket.id} className="border-[rgba(0,163,157,0.06)] hover:bg-[rgba(0,163,157,0.04)]">
                        <TableCell className="font-mono text-xs text-white">{ticket.ticketCode}</TableCell>
                        <TableCell className="font-mono text-xs text-[#7FB3AE]">{ticket.orderCode}</TableCell>
                        <TableCell className="text-sm text-white font-medium">{ticket.userName}</TableCell>
                        <TableCell className="text-sm text-white">{ticket.ticketType}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] font-semibold', ticket.tier === 'floor' ? 'bg-[#F8AD3C]/10 text-[#F8AD3C] border-[#F8AD3C]/30' : 'bg-white/5 text-[#7FB3AE] border-[#7FB3AE]/20')}>
                            {ticket.tier.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] gap-1', sc.className)}>
                            {sc.icon}
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.wristbandCode ? (
                            <span className="font-mono text-xs text-[#00A39D]">{ticket.wristbandCode}</span>
                          ) : (
                            <span className="text-xs text-[#7FB3AE]/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-[#7FB3AE]">{ticket.redeemedBy || '—'}</TableCell>
                        <TableCell className="text-xs text-[#7FB3AE]">{formatTimestamp(ticket.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(0,163,157,0.1)]">
              <p className="text-xs text-[#7FB3AE]">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)} className="h-8 w-8 p-0 text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-[#7FB3AE]/40 px-1 text-xs">...</span>
                      )}
                      <Button variant={currentPage === p ? 'default' : 'ghost'} size="sm" onClick={() => handlePageChange(p)} className={cn('h-8 w-8 p-0 text-xs font-medium', currentPage === p ? 'bg-[#00A39D] text-[#0A0F0E] hover:bg-[#00A39D]' : 'text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]')}>
                        {p}
                      </Button>
                    </React.Fragment>
                  ))}
                <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)} className="h-8 w-8 p-0 text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════ WRISTBAND SECTION ═══════════ */}
      <Separator className="bg-[rgba(0,163,157,0.1)]" />

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Watch className="w-5 h-5 text-[#00A39D]" />
          Wristband Management
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)] py-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-[#00A39D]" /><p className="text-xs text-[#7FB3AE]">Total Inventory</p></div>
              <p className="text-2xl font-bold text-white">{wristbandStats.total.toLocaleString('id-ID')}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)] py-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Link2 className="w-4 h-4 text-[#00A39D]" /><p className="text-xs text-[#7FB3AE]">Assigned</p></div>
              <p className="text-2xl font-bold text-[#00A39D]">{wristbandStats.assigned.toLocaleString('id-ID')}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)] py-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Watch className="w-4 h-4 text-[#7FB3AE]" /><p className="text-xs text-[#7FB3AE]">Unused</p></div>
              <p className="text-2xl font-bold text-[#7FB3AE]">{wristbandStats.unused.toLocaleString('id-ID')}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)] py-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><ScanLine className="w-4 h-4 text-[#F8AD3C]" /><p className="text-xs text-[#7FB3AE]">Scanned In</p></div>
              <p className="text-2xl font-bold text-[#F8AD3C]">{wristbandStats.scanned.toLocaleString('id-ID')}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)] mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Assigned vs Unused</h4>
              <span className="text-xs text-[#00A39D] font-bold">{wristbandAssignedPct}%</span>
            </div>
            <Progress value={wristbandAssignedPct} className="h-3 bg-[rgba(0,163,157,0.1)] [&>div]:bg-[#00A39D]" />
            <div className="flex items-center justify-between mt-2 text-xs text-[#7FB3AE]">
              <span>{wristbandStats.assigned} assigned</span>
              <span>{wristbandStats.unused} remaining</span>
            </div>
          </CardContent>
        </Card>

        {/* Pairing Logs */}
        <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#00A39D]" />
              Recent Pairing Logs
              <Badge variant="outline" className="text-[10px] text-[#7FB3AE] border-[#7FB3AE]/20 ml-auto">From ticket data</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-[#7FB3AE]">
              Ticket → Wristband pairing history
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
              {tickets.filter(t => t.wristbandLinked && t.wristbandCode).slice(0, 10).map((ticket) => (
                <div key={ticket.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]/60 border border-[rgba(0,163,157,0.06)] hover:border-[rgba(0,163,157,0.15)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[rgba(0,163,157,0.1)] flex items-center justify-center shrink-0">
                    <ArrowRight className="w-4 h-4 text-[#00A39D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-white truncate">{ticket.ticketCode}</span>
                      <span className="text-[#00A39D] text-xs">→</span>
                      <span className="font-mono text-xs text-[#00A39D] font-semibold truncate">{ticket.wristbandCode}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#7FB3AE]">by {ticket.redeemedBy}</span>
                      <span className="text-[#7FB3AE]/30">•</span>
                      <span className="text-[10px] text-[#7FB3AE] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimestamp(ticket.redeemedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {tickets.filter(t => t.wristbandLinked).length === 0 && (
                <p className="text-sm text-[#7FB3AE]/60 py-4 text-center">No wristband pairing logs yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TicketsPage;
