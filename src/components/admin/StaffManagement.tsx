'use client';

import React, { useState, useMemo } from 'react';
import { cn, formatDateTimeShort } from '@/lib/utils';
import { useAdminStaff } from '@/hooks/use-api';
import { useScopedData, useRoleLabel } from '@/hooks/use-scoped-data';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
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
  UserCog,
  Plus,
  Pencil,
  Search,
  Lock,
  Mail,
  Phone,
  MapPin,
  Clock,
  Activity,
  Users,
  Filter,
  AlertTriangle,
} from 'lucide-react';

// ─── ROLE TABS ───────────────────────────────────────────────────────────────

const roleTabs: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'COUNTER_STAFF', label: 'Counter Staff' },
  { value: 'GATE_STAFF', label: 'Gate Staff' },
  { value: 'ORGANIZER', label: 'Organizer' },
  { value: 'PARTICIPANT', label: 'Peserta' },
];

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'COUNTER_STAFF' | 'GATE_STAFF' | 'ORGANIZER' | 'PARTICIPANT';

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'SUPER_ADMIN': return 'bg-gold/15 text-gold border-gold/30';
    case 'ADMIN': return 'bg-primary/15 text-primary border-primary/30';
    case 'COUNTER_STAFF': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'GATE_STAFF': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'ORGANIZER': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'ADMIN': return 'Admin';
    case 'COUNTER_STAFF': return 'Counter Staff';
    case 'GATE_STAFF': return 'Gate Staff';
    case 'ORGANIZER': return 'Organizer';
    case 'PARTICIPANT': return 'Peserta';
    default: return role;
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'inactive': return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function StaffManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Record<string, unknown> | null>(null);

  const { isOrganizer, scopeParams, apiScope } = useScopedData({ filterByEvent: true });
  const pageTitle = useRoleLabel({ superAdmin: 'Kelola Staff & Role', organizer: 'My Staff' });

  // Add form
  const [addForm, setAddForm] = useState({
    email: '',
    role: 'COUNTER_STAFF' as UserRole,
    assignedLocation: '',
    shift: 'pagi',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    role: '' as UserRole,
    assignedLocation: '',
    status: '' as 'active' | 'inactive',
  });

  const { data: staffData, isLoading, error } = useAdminStaff();
  const staff = useMemo(() => {
    const raw = (staffData as { data?: unknown[] } | undefined)?.data || [];
    return raw as Record<string, unknown>[];
  }, [staffData]);

  // ── Filtered data ──
  const filteredStaff = useMemo(() => {
    let result = [...staff];
    if (roleFilter !== 'all') {
      result = result.filter((s) => s.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          String(s.name || '').toLowerCase().includes(q) ||
          String(s.email || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [staff, roleFilter, statusFilter, searchQuery]);

  // ── Stats ──
  const stats = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((s) => s.status === 'active').length,
      inactive: staff.filter((s) => s.status === 'inactive').length,
      counterStaff: staff.filter((s) => s.role === 'COUNTER_STAFF').length,
      gateStaff: staff.filter((s) => s.role === 'GATE_STAFF').length,
    }),
    [staff]
  );

  const isSuperAdmin = (role: string) => role === 'SUPER_ADMIN';

  const handleAddStaff = () => {
    if (!addForm.email.trim()) {
      toast.error('Email wajib diisi');
      return;
    }
    toast.success(`Staff baru berhasil ditambahkan`);
    setAddForm({ email: '', role: 'COUNTER_STAFF', assignedLocation: '', shift: 'pagi' });
    setAddDialogOpen(false);
  };

  const handleEditStaff = (s: Record<string, unknown>) => {
    setSelectedStaff(s);
    setEditForm({
      role: String(s.role || '') as UserRole,
      assignedLocation: String(s.assignedLocation || ''),
      status: String(s.status || 'active') as 'active' | 'inactive',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedStaff) return;
    setEditDialogOpen(false);
    toast.success(`Data "${String(selectedStaff.name || '')}" berhasil diperbarui`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load staff</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" />
            {pageTitle}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isOrganizer ? 'Staff yang mengelola event Anda' : 'Manajemen staff, role, shift, dan assignment lokasi'}
          </p>
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-primary text-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Staff
        </Button>
      </div>

      {/* ═══════════ STATS ROW ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'text-foreground' },
          { label: 'Aktif', value: stats.active, icon: Activity, color: 'text-emerald-400' },
          { label: 'Nonaktif', value: stats.inactive, icon: Users, color: 'text-gray-400' },
          { label: 'Counter Staff', value: stats.counterStaff, icon: MapPin, color: 'text-emerald-400' },
          { label: 'Gate Staff', value: stats.gateStaff, icon: MapPin, color: 'text-blue-400' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border py-4">
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

      {/* ═══════════ FILTER ROW ═══════════ */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {roleTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={roleFilter === tab.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRoleFilter(tab.value)}
              className={cn(
                'text-xs h-8',
                roleFilter === tab.value
                  ? 'bg-primary text-foreground hover:bg-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground/60 h-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {['all', 'active', 'inactive'].map((val) => (
              <Button
                key={val}
                variant={statusFilter === val ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(val)}
                className={cn(
                  'text-xs h-8',
                  statusFilter === val
                    ? 'bg-primary text-foreground hover:bg-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                )}
              >
                {val === 'all' ? 'Semua' : val === 'active' ? 'Aktif' : 'Nonaktif'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ STAFF TABLE ═══════════ */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-medium">Nama</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Email</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Role</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium hidden lg:table-cell">Lokasi</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium hidden lg:table-cell">Shift</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium hidden xl:table-cell">Terakhir Aktif</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium hidden xl:table-cell">Total Scan</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Tidak ada staff ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((s) => {
                    const roleColor = getRoleBadgeColor(String(s.role || ''));
                    const statusColor = getStatusBadgeColor(String(s.status || ''));
                    const sa = isSuperAdmin(String(s.role || ''));
                    return (
                      <TableRow
                        key={String(s.id)}
                        className="border-border hover:bg-primary/5"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              s.role === 'COUNTER_STAFF' ? 'bg-emerald-500/10 text-emerald-400' :
                              s.role === 'GATE_STAFF' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-primary/10 text-primary'
                            )}>
                              {String(s.name || '').split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm text-foreground font-medium">{String(s.name || '')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {String(s.email || '')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />
                          {String(s.phone || '—')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] font-semibold', roleColor)}>
                            {getRoleLabel(String(s.role || ''))}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {String(s.assignedLocation || '—')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {String(s.shift || '—')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]', statusColor)}>
                            {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden xl:table-cell">
                          {s.lastActive ? formatDateTimeShort(String(s.lastActive)) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium hidden xl:table-cell">
                          {Number(s.totalScans || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-7 w-7',
                              sa
                                ? 'text-muted-foreground/30 cursor-not-allowed'
                                : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                            )}
                            disabled={sa}
                            onClick={() => handleEditStaff(s)}
                            title={sa ? 'Super Admin tidak bisa diedit' : 'Edit staff'}
                          >
                            {sa ? <Lock className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredStaff.length} dari {staff.length} staff
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ ADD STAFF DIALOG ═══════════ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-card border-input max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Tambah Staff Baru</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Masukkan Google email dan role untuk staff baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Google Email</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="staff@gmail.com"
                className="bg-background border-input text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) => setAddForm({ ...addForm, role: v as UserRole, assignedLocation: '' })}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-input">
                  <SelectItem value="COUNTER_STAFF">Counter Staff</SelectItem>
                  <SelectItem value="GATE_STAFF">Gate Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Assign ke {addForm.role === 'COUNTER_STAFF' ? 'Counter' : 'Gate'}</Label>
              <Input
                value={addForm.assignedLocation}
                onChange={(e) => setAddForm({ ...addForm, assignedLocation: e.target.value })}
                placeholder="Masukkan lokasi..."
                className="bg-background border-input text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Shift</Label>
              <Select
                value={addForm.shift}
                onValueChange={(v) => setAddForm({ ...addForm, shift: v })}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-input">
                  <SelectItem value="pagi">Pagi (08:00 – 15:00)</SelectItem>
                  <SelectItem value="malam">Malam (15:00 – 22:00)</SelectItem>
                  <SelectItem value="full">Full Day (08:00 – 22:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-primary/10">Batal</Button>
            <Button onClick={handleAddStaff} className="bg-primary text-foreground hover:bg-primary/90">Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ EDIT STAFF DIALOG ═══════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-input max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Staff — {selectedStaff ? String(selectedStaff.name || '') : ''}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedStaff ? String(selectedStaff.email || '') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedStaff && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                    selectedStaff.role === 'COUNTER_STAFF' ? 'bg-emerald-500/10 text-emerald-400' :
                    selectedStaff.role === 'GATE_STAFF' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-primary/10 text-primary'
                  )}>
                    {String(selectedStaff.name || '').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">{String(selectedStaff.name || '')}</p>
                    <Badge variant="outline" className={cn('text-[10px] font-semibold mt-1', getRoleBadgeColor(String(selectedStaff.role || '')))}>
                      {getRoleLabel(String(selectedStaff.role || ''))}
                    </Badge>
                  </div>
                </div>

                {!isSuperAdmin(String(selectedStaff.role || '')) && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Role</Label>
                      <Select
                        value={editForm.role}
                        onValueChange={(v) => setEditForm({ ...editForm, role: v as UserRole })}
                      >
                        <SelectTrigger className="bg-background border-input text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-input">
                          <SelectItem value="COUNTER_STAFF">Counter Staff</SelectItem>
                          <SelectItem value="GATE_STAFF">Gate Staff</SelectItem>
                          <SelectItem value="ORGANIZER">Organizer</SelectItem>
                          <SelectItem value="PARTICIPANT">Peserta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Assign Lokasi</Label>
                      <Input
                        value={editForm.assignedLocation}
                        onChange={(e) => setEditForm({ ...editForm, assignedLocation: e.target.value })}
                        placeholder="Kosongkan = unassign"
                        className="bg-background border-input text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Status</Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(v) => setEditForm({ ...editForm, status: v as 'active' | 'inactive' })}
                      >
                        <SelectTrigger className="bg-background border-input text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-input">
                          <SelectItem value="active">Aktif</SelectItem>
                          <SelectItem value="inactive">Nonaktif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-primary/10">Batal</Button>
            <Button onClick={handleSaveEdit} disabled={isSuperAdmin(selectedStaff?.role as string || 'PARTICIPANT')} className="bg-primary text-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StaffManagement;
