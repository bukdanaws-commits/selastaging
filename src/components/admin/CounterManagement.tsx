'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAdminCounters, useAdminStaff } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── LOCAL TYPES & HELPERS ────────────────────────────────────────────────────

type Counter = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: 'active' | 'inactive' | 'closed';
  staffCount: number;
  redeemedToday: number;
  openAt: string | null;
  closeAt: string | null;
};

function getCounterStatusBadge(status: Counter['status']) {
  switch (status) {
    case 'active': return { label: 'Aktif', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    case 'inactive': return { label: 'Nonaktif', color: 'text-gray-400 border-gray-500/30 bg-gray-500/10' };
    case 'closed': return { label: 'Tutup', color: 'text-red-400 border-red-500/30 bg-red-500/10' };
    default: return { label: status, color: 'text-gray-400 border-gray-500/30' };
  }
}

type RedemptionConfig = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  Store,
  Plus,
  Pencil,
  Users,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Search,
  Settings,
  CalendarDays,
} from 'lucide-react';

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function CounterManagement() {
  const { data: apiCountersData, isLoading, error } = useAdminCounters();
  const { data: apiStaff } = useAdminStaff();

  const apiCounters: Counter[] = (apiCountersData as any)?.data ?? (apiCountersData as any) ?? [];
  const apiRedemptionConfig: RedemptionConfig = (apiCountersData as any)?.redemptionConfig ?? { startDate: '', endDate: '', startTime: '', endTime: '' };
  const staffUsers: any[] = (apiStaff as any)?.data ?? (apiStaff as any) ?? [];

  const counters: Counter[] = apiCounters.length > 0 ? apiCounters : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editCounter, setEditCounter] = useState<Counter | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Redemption config state
  const [redemptionConfig, setRedemptionConfig] = useState<RedemptionConfig>(apiRedemptionConfig.startDate ? apiRedemptionConfig : { startDate: '', endDate: '', startTime: '', endTime: '' });

  // Add counter form
  const [addForm, setAddForm] = useState({
    name: '',
    location: '',
    capacity: '300',
  });
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    status: '' as Counter['status'],
    capacity: '0',
  });

  // ── Filtered data ──
  const filteredCounters = useMemo(() => {
    let result = [...counters];
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }
    return result;
  }, [counters, statusFilter, searchQuery]);

  // ── Stats ──
  const stats = useMemo(
    () => ({
      total: counters.length,
      active: counters.filter((c) => c.status === 'active').length,
      inactive: counters.filter((c) => c.status === 'inactive').length,
      redeemedToday: counters.reduce((sum, c) => sum + c.redeemedToday, 0),
    }),
    [counters]
  );

  // ── Helpers ──
  const getCounterStaff = (counterName: string) =>
    staffUsers.filter((s: any) => s.role === 'COUNTER_STAFF' && s.assignedLocation === counterName);

  const handleAddCounter = () => {
    if (!addForm.name.trim() || !addForm.location.trim()) {
      toast.error('Nama dan lokasi wajib diisi');
      return;
    }
    toast.info('Counter creation will be handled by backend API');
    setAddForm({ name: '', location: '', capacity: '300' });
    setAddDialogOpen(false);
  };

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>;

  const handleEditCounter = (counter: Counter) => {
    setEditCounter(counter);
    setEditForm({
      status: counter.status,
      capacity: String(counter.capacity),
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editCounter) return;
    toast.info('Counter update will be handled by backend API');
    setEditDialogOpen(false);
  };

  const handleSaveConfig = () => {
    setConfigDialogOpen(false);
    toast.success('Konfigurasi penukaran gelang berhasil disimpan');
  };

  return (
    <div className="space-y-6">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-[#00A39D]" />
            Kelola Konter
          </h2>
          <p className="text-[#7FB3AE] text-sm mt-1">
            Manajemen counter penukaran gelang dan staff assignment
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigDialogOpen(true)}
            className="border-[rgba(0,163,157,0.2)] text-[#00A39D] hover:bg-[rgba(0,163,157,0.1)]"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            Periode Tukar
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="bg-[#00A39D] text-white hover:bg-[#00A39D]/90"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Konter
          </Button>
        </div>
      </div>

      {/* ═══════════ STATS ROW ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Konter', value: stats.total, icon: Store, color: 'text-white' },
          { label: 'Aktif', value: stats.active, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Nonaktif', value: stats.inactive, icon: XCircle, color: 'text-gray-400' },
          { label: 'Total Redeemed Hari Ini', value: stats.redeemedToday, icon: Activity, color: 'text-[#00A39D]' },
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
        <div className="flex gap-1.5">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Nonaktif' },
            { value: 'closed', label: 'Tutup' },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'text-xs h-8',
                statusFilter === tab.value
                  ? 'bg-[#00A39D] text-white hover:bg-[#00A39D]'
                  : 'text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]'
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
          <Input
            placeholder="Cari nama atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#111918] border-[rgba(0,163,157,0.1)] text-white placeholder:text-[#7FB3AE]/60 h-9"
          />
        </div>
      </div>

      {/* ═══════════ COUNTERS TABLE ═══════════ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(0,163,157,0.1)] hover:bg-transparent">
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Nama</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Lokasi</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Kapasitas</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Status</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Staff</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Redeemed</TableHead>
                  <TableHead className="text-[#7FB3AE] text-xs font-medium">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCounters.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-12 text-[#7FB3AE]">
                      <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Tidak ada counter ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCounters.map((counter) => {
                    const badge = getCounterStatusBadge(counter.status);
                    const staff = getCounterStaff(counter.name);
                    return (
                      <TableRow
                        key={counter.id}
                        className="border-[rgba(0,163,157,0.06)] hover:bg-[rgba(0,163,157,0.04)]"
                      >
                        <TableCell className="text-sm text-white font-medium">{counter.name}</TableCell>
                        <TableCell className="text-sm text-[#7FB3AE]">{counter.location}</TableCell>
                        <TableCell className="text-sm text-white">{counter.capacity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]', badge.color)}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#00A39D] hover:bg-[rgba(0,163,157,0.1)] h-7 gap-1 text-xs"
                            onClick={() => {
                              setSelectedCounter(counter);
                              setStaffDialogOpen(true);
                            }}
                          >
                            <Users className="w-3 h-3" />
                            {staff.length}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm text-white font-medium">{counter.redeemedToday}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]"
                              onClick={() => handleEditCounter(counter)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ ADD COUNTER DIALOG ═══════════ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.2)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Tambah Counter Baru</DialogTitle>
            <DialogDescription className="text-[#7FB3AE]">
              Masukkan informasi counter yang akan ditambahkan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Nama Counter</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Contoh: Counter 13"
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white placeholder:text-[#7FB3AE]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Lokasi</Label>
              <Input
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="Contoh: Lobby Barat"
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white placeholder:text-[#7FB3AE]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Kapasitas</Label>
              <Input
                type="number"
                value={addForm.capacity}
                onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })}
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white placeholder:text-[#7FB3AE]/50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setAddDialogOpen(false)}
              className="text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]"
            >
              Batal
            </Button>
            <Button
              onClick={handleAddCounter}
              className="bg-[#00A39D] text-white hover:bg-[#00A39D]/90"
            >
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ EDIT COUNTER DIALOG ═══════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.2)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Counter — {editCounter?.name}</DialogTitle>
            <DialogDescription className="text-[#7FB3AE]">
              Ubah status dan kapasitas counter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v as Counter['status'] })}
              >
                <SelectTrigger className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111918] border-[rgba(0,163,157,0.2)]">
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                  <SelectItem value="closed">Tutup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Kapasitas</Label>
              <Input
                type="number"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              className="text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#00A39D] text-white hover:bg-[#00A39D]/90"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ STAFF ASSIGNMENT DIALOG ═══════════ */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.2)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00A39D]" />
              Staff — {selectedCounter?.name}
            </DialogTitle>
            <DialogDescription className="text-[#7FB3AE]">
              {selectedCounter?.location}
            </DialogDescription>
          </DialogHeader>
          {selectedCounter && (
            <div className="space-y-3">
              {(() => {
                const staff = getCounterStaff(selectedCounter.name);
                const available = staffUsers.filter(
                  (s: any) =>
                    s.role === 'COUNTER_STAFF' &&
                    s.status === 'active' &&
                    s.assignedLocation !== selectedCounter.name
                );
                return (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs text-[#7FB3AE] font-medium">
                        Staff Terassign ({staff.length})
                      </p>
                      {staff.length === 0 ? (
                        <p className="text-sm text-[#7FB3AE]/60 py-2">Belum ada staff</p>
                      ) : (
                        <div className="space-y-1.5">
                          {staff.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0F0E] border border-[rgba(0,163,157,0.08)]"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[rgba(0,163,157,0.1)] flex items-center justify-center text-xs text-[#00A39D] font-bold">
                                  {s.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="text-sm text-white font-medium">{s.name}</p>
                                  <p className="text-xs text-[#7FB3AE]">{s.shift} • {s.totalScans} scans</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                Aktif
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Separator className="bg-[rgba(0,163,157,0.1)]" />
                    <div className="space-y-2">
                      <p className="text-xs text-[#7FB3AE] font-medium">
                        Staff Tersedia ({available.length})
                      </p>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5">
                        {available.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0F0E] border border-[rgba(0,163,157,0.08)]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[rgba(0,163,157,0.1)] flex items-center justify-center text-xs text-[#00A39D] font-bold">
                                {s.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-sm text-white font-medium">{s.name}</p>
                                <p className="text-xs text-[#7FB3AE]">
                                  {s.assignedLocation || 'Belum assign'} • {s.shift || 'Belum ada shift'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] border-[#00A39D]/30 text-[#00A39D] hover:bg-[#00A39D]/10 h-7"
                              onClick={() => {
                                toast.success(`${s.name} di-assign ke ${selectedCounter.name}`);
                              }}
                            >
                              Assign
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════ REDEMPTION PERIOD CONFIG DIALOG ═══════════ */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.2)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#00A39D]" />
              Periode Penukaran Gelang
            </DialogTitle>
            <DialogDescription className="text-[#7FB3AE]">
              Atur jadwal dan waktu penukaran gelang
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Tanggal Mulai</Label>
              <Input
                type="date"
                value={redemptionConfig.startDate}
                onChange={(e) => setRedemptionConfig({ ...redemptionConfig, startDate: e.target.value })}
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Tanggal Selesai</Label>
              <Input
                type="date"
                value={redemptionConfig.endDate}
                onChange={(e) => setRedemptionConfig({ ...redemptionConfig, endDate: e.target.value })}
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Waktu Mulai</Label>
              <Input
                type="time"
                value={redemptionConfig.startTime}
                onChange={(e) => setRedemptionConfig({ ...redemptionConfig, startTime: e.target.value })}
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE] text-sm">Waktu Selesai</Label>
              <Input
                type="time"
                value={redemptionConfig.endTime}
                onChange={(e) => setRedemptionConfig({ ...redemptionConfig, endTime: e.target.value })}
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.15)] text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#00A39D]/10 border border-[#00A39D]/20">
            <Clock className="w-4 h-4 text-[#00A39D] shrink-0" />
            <p className="text-xs text-[#00A39D]">
              Periode penukaran: {redemptionConfig.startDate} s/d {redemptionConfig.endDate},{' '}
              {redemptionConfig.startTime} – {redemptionConfig.endTime} WIB
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfigDialogOpen(false)}
              className="text-[#7FB3AE] hover:text-white hover:bg-[rgba(0,163,157,0.1)]"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveConfig}
              className="bg-[#00A39D] text-white hover:bg-[#00A39D]/90"
            >
              Simpan Konfigurasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CounterManagement;
