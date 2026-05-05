'use client';

import React, { useState, useMemo } from 'react';
import { cn, formatTime } from '@/lib/utils';
import { useAdminGates, useAdminStaff } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── LOCAL TYPES & HELPERS ──────────────────────────────────────────────────

type Gate = {
  id: string;
  name: string;
  type: 'entry' | 'exit' | 'both';
  location: string;
  minAccessLevel: string;
  capacityPerMin: number;
  status: 'active' | 'inactive' | 'closed';
  staffCount: number;
  totalIn: number;
  totalOut: number;
  currentInside: number;
  lastScan: string | null;
};

function getGateTypeBadge(type: Gate['type']) {
  switch (type) {
    case 'entry': return { label: 'Masuk', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
    case 'exit': return { label: 'Keluar', color: 'text-red-400 bg-red-500/15 border-red-500/30' };
    case 'both': return { label: 'Masuk/Keluar', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
  }
}

function getStatusBadgeColor(status: Gate['status']) {
  switch (status) {
    case 'active': return 'text-emerald-400 border-emerald-500/30';
    case 'inactive': return 'text-gray-400 border-gray-500/30';
    case 'closed': return 'text-red-400 border-red-500/30';
  }
}

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
} from '@/components/ui/dialog';

import {
  DoorOpen,
  Plus,
  Pencil,
  Users,
  LogIn,
  LogOut,
  Search,
  Activity,
  Clock,
  MapPin,
  Zap,
} from 'lucide-react';

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function GateManagement() {
  const { data: apiGates, isLoading, error } = useAdminGates();
  const { data: apiStaff } = useAdminStaff();
  const apiGatesData: Gate[] = (apiGates as any)?.data ?? apiGates as any ?? [];

  const staffUsers: any[] = (apiStaff as any)?.data ?? apiStaff as any ?? [];
  const [localGates, setLocalGates] = useState<Gate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);

  const gates: Gate[] = useMemo(() => {
    if (localGates.length > 0) return localGates
    return apiGatesData
  }, [apiGatesData, localGates])

  // Add form
  const [addForm, setAddForm] = useState({
    name: '',
    type: 'entry' as Gate['type'],
    location: '',
    minAccessLevel: 'FESTIVAL',
    capacityPerMin: '30',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    status: '' as Gate['status'],
    type: '' as Gate['type'],
  });

  // ── Filtered data ──
  const filteredGates = useMemo(() => {
    let result = [...gates];
    if (statusFilter !== 'all') {
      result = result.filter((g) => g.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.location.toLowerCase().includes(q)
      );
    }
    return result;
  }, [gates, statusFilter, searchQuery]);

  // ── Stats ──
  const stats = useMemo(
    () => ({
      total: gates.length,
      active: gates.filter((g) => g.status === 'active').length,
      totalIn: gates.reduce((sum, g) => sum + g.totalIn, 0),
      totalOut: gates.reduce((sum, g) => sum + g.totalOut, 0),
    }),
    [gates]
  );

  // ── Helpers ──
  const getGateStaff = (gateName: string) =>
    staffUsers.filter((s: any) => s.role === 'GATE_STAFF' && s.assignedLocation === gateName);

  const handleAddGate = () => {
    if (!addForm.name.trim() || !addForm.location.trim()) {
      toast.error('Nama dan lokasi wajib diisi');
      return;
    }
    const newGate: Gate = {
      id: `gate-${String(gates.length + 1).padStart(2, '0')}`,
      name: addForm.name,
      type: addForm.type,
      location: addForm.location,
      minAccessLevel: addForm.minAccessLevel,
      capacityPerMin: parseInt(addForm.capacityPerMin) || 30,
      status: 'inactive',
      staffCount: 0,
      totalIn: 0,
      totalOut: 0,
      currentInside: 0,
      lastScan: null,
    };
    setLocalGates((prev) => [...prev, newGate]);
    setAddForm({ name: '', type: 'entry', location: '', minAccessLevel: 'FESTIVAL', capacityPerMin: '30' });
    setAddDialogOpen(false);
    toast.success(`Gate "${newGate.name}" berhasil ditambahkan`);
  };

  const handleEditGate = (gate: Gate) => {
    setSelectedGate(gate);
    setEditForm({ status: gate.status, type: gate.type });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedGate) return;
    setLocalGates((prev) =>
      prev.map((g) =>
        g.id === selectedGate.id
          ? { ...g, status: editForm.status, type: editForm.type }
          : g
      )
    );
    setEditDialogOpen(false);
    toast.success(`Gate "${selectedGate.name}" berhasil diperbarui`);
  };

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-primary" />
            Kelola Gate
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Konfigurasi gate masuk/keluar dan staff assignment
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="bg-primary text-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Gate
        </Button>
      </div>

      {/* ═══════════ STATS ROW ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Gate', value: stats.total, icon: DoorOpen, color: 'text-foreground' },
          { label: 'Aktif', value: stats.active, icon: Activity, color: 'text-emerald-400' },
          { label: 'Total Masuk', value: stats.totalIn, icon: LogIn, color: 'text-emerald-400' },
          { label: 'Total Keluar', value: stats.totalOut, icon: LogOut, color: 'text-blue-400' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-primary/10 py-4">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-lg font-bold leading-tight', stat.color)}>
                  {stat.value.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
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
                  ? 'bg-primary text-foreground hover:bg-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-primary/10 text-foreground placeholder:text-muted-foreground/60 h-9"
          />
        </div>
      </div>

      {/* ═══════════ GATES GRID ═══════════ */}
      {filteredGates.length === 0 ? (
        <Card className="bg-card border-primary/10">
          <CardContent className="p-12 text-center text-muted-foreground">
            <DoorOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Tidak ada gate ditemukan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGates.map((gate) => {
            const typeBadge = getGateTypeBadge(gate.type);
            const statusColor = getStatusBadgeColor(gate.status);
            const statusLabel = gate.status === 'active' ? 'Aktif' : gate.status === 'inactive' ? 'Nonaktif' : 'Tutup';
            const staff = getGateStaff(gate.name);
            return (
              <Card
                key={gate.id}
                className="bg-card border-primary/10 hover:border-primary/20 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0',
                        gate.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                      )} />
                      <CardTitle className="text-foreground text-base">{gate.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] gap-1" style={{ borderWidth: 1 }}>
                        {gate.type === 'entry' && <LogIn className="w-2.5 h-2.5 text-emerald-400" />}
                        {gate.type === 'exit' && <LogOut className="w-2.5 h-2.5 text-red-400" />}
                        {gate.type === 'both' && <Activity className="w-2.5 h-2.5 text-amber-400" />}
                        <span className={typeBadge.color.split(' ')[1]}>{typeBadge.label}</span>
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {gate.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-background/60">
                      <p className="text-lg font-bold text-emerald-400">{Number(gate.totalIn || 0).toLocaleString('id-ID')}</p>
                      <p className="text-[10px] text-muted-foreground">Masuk</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/60">
                      <p className="text-lg font-bold text-blue-400">{Number(gate.totalOut || 0).toLocaleString('id-ID')}</p>
                      <p className="text-[10px] text-muted-foreground">Keluar</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/60">
                      <p className="text-lg font-bold text-primary">{gate.capacityPerMin}</p>
                      <p className="text-[10px] text-muted-foreground">Orang/menit</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">Min. Akses:</span>
                      <span className="text-foreground font-medium">{gate.minAccessLevel}</span>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px]', statusColor)}>
                      {statusLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      <span>Terakhir: {gate.lastScan ? formatTime(gate.lastScan) : '—'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-primary/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10 h-8 gap-1"
                      onClick={() => {
                        setSelectedGate(gate);
                        setStaffDialogOpen(true);
                      }}
                    >
                      <Users className="w-3 h-3" />
                      Staff ({staff.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                      onClick={() => handleEditGate(gate)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════ ADD GATE DIALOG ═══════════ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-card border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Tambah Gate Baru</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Masukkan informasi gate yang akan ditambahkan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Nama Gate</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Contoh: Gate G"
                className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Tipe Gate</Label>
              <Select
                value={addForm.type}
                onValueChange={(v) => setAddForm({ ...addForm, type: v as Gate['type'] })}
              >
                <SelectTrigger className="bg-background border-primary/15 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/20">
                  <SelectItem value="entry">Masuk (Entry)</SelectItem>
                  <SelectItem value="exit">Keluar (Exit)</SelectItem>
                  <SelectItem value="both">Masuk/Keluar (Both)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Lokasi</Label>
              <Input
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="Contoh: Selatan - Tengah"
                className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Min. Access Level</Label>
                <Select
                  value={addForm.minAccessLevel}
                  onValueChange={(v) => setAddForm({ ...addForm, minAccessLevel: v })}
                >
                  <SelectTrigger className="bg-background border-primary/15 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/20">
                    <SelectItem value="VVIP PIT">VVIP PIT</SelectItem>
                    <SelectItem value="VIP ZONE">VIP ZONE</SelectItem>
                    <SelectItem value="FESTIVAL">FESTIVAL</SelectItem>
                    <SelectItem value="CAT 1">CAT 1</SelectItem>
                    <SelectItem value="CAT 2">CAT 2</SelectItem>
                    <SelectItem value="CAT 3">CAT 3</SelectItem>
                    <SelectItem value="CAT 4">CAT 4</SelectItem>
                    <SelectItem value="CAT 5">CAT 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Kapasitas/menit</Label>
                <Input
                  type="number"
                  value={addForm.capacityPerMin}
                  onChange={(e) => setAddForm({ ...addForm, capacityPerMin: e.target.value })}
                  className="bg-background border-primary/15 text-foreground"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setAddDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-primary/10"
            >
              Batal
            </Button>
            <Button
              onClick={handleAddGate}
              className="bg-primary text-foreground hover:bg-primary/90"
            >
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ EDIT GATE DIALOG ═══════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Gate — {selectedGate?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Ubah tipe dan status gate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v as Gate['status'] })}
              >
                <SelectTrigger className="bg-background border-primary/15 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/20">
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                  <SelectItem value="closed">Tutup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Tipe Gate</Label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm({ ...editForm, type: v as Gate['type'] })}
              >
                <SelectTrigger className="bg-background border-primary/15 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/20">
                  <SelectItem value="entry">Masuk (Entry)</SelectItem>
                  <SelectItem value="exit">Keluar (Exit)</SelectItem>
                  <SelectItem value="both">Masuk/Keluar (Both)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-primary/10"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-primary text-foreground hover:bg-primary/90"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ STAFF ASSIGNMENT DIALOG ═══════════ */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="bg-card border-primary/20 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Staff — {selectedGate?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedGate?.location} • {selectedGate && getGateTypeBadge(selectedGate.type).label}
            </DialogDescription>
          </DialogHeader>
          {selectedGate && (
            <div className="space-y-3">
              {(() => {
                const staff = getGateStaff(selectedGate.name);
                const available = staffUsers.filter(
                  (s: any) =>
                    s.role === 'GATE_STAFF' &&
                    s.status === 'active' &&
                    s.assignedLocation !== selectedGate.name
                );
                return (
                  <>
                    {/* Real-time stats */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-background border border-primary/10">
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{selectedGate.totalIn.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-muted-foreground">Total IN</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-400">{selectedGate.totalOut.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-muted-foreground">Total OUT</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{selectedGate.capacityPerMin}/min</p>
                        <p className="text-[10px] text-muted-foreground">Kapasitas</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        Staff Terassign ({staff.length})
                      </p>
                      {staff.length === 0 ? (
                        <p className="text-sm text-muted-foreground/60 py-2">Belum ada staff</p>
                      ) : (
                        <div className="space-y-1.5">
                          {staff.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-primary/10"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs text-blue-400 font-bold">
                                  {s.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="text-sm text-foreground font-medium">{s.name}</p>
                                  <p className="text-xs text-muted-foreground">{s.shift} • {s.totalScans.toLocaleString('id-ID')} scans</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10 h-7"
                                onClick={() => {
                                  toast.success(`${s.name} di-unassign dari ${selectedGate.name}`);
                                }}
                              >
                                Hapus
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Separator className="bg-primary/10" />
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        Staff Tersedia ({available.length})
                      </p>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5">
                        {available.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-primary/10"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs text-blue-400 font-bold">
                                {s.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-sm text-foreground font-medium">{s.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {s.assignedLocation || 'Belum assign'} • {s.shift || '—'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] border-primary/30 text-primary hover:bg-primary/10 h-7"
                              onClick={() => {
                                toast.success(`${s.name} di-assign ke ${selectedGate.name}`);
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
    </div>
  );
}

export default GateManagement;
