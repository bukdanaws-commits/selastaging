'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

import { cn, formatRupiah, formatDateTimeShort } from '@/lib/utils';
import { useAdminUsers } from '@/hooks/use-api';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Users,
  Shield,
  ShieldCheck,
  UserCog,
  Search,
  Ban,
  UserX,
  Pencil,
  Eye,
  Mail,
  Phone,
  ShoppingCart,
  DollarSign,
  Clock,
  Crown,
  AlertTriangle,
} from 'lucide-react';

// ─── CONSTANTS ═══════════════════════════════════════════════════════════════

type RoleFilter = 'all' | 'SUPER_ADMIN' | 'ORGANIZER' | 'PARTICIPANT' | 'suspended';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'suspended' | 'banned';
  totalOrders: number;
  totalSpent: number;
  lastLogin: string;
  createdAt: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    color: 'text-[#F8AD3C]',
    bgColor: 'bg-[rgba(248,173,60,0.15)] border-[rgba(248,173,60,0.3)]',
    icon: Crown,
  },
  ORGANIZER: {
    label: 'Organizer',
    color: 'text-[#00A39D]',
    bgColor: 'bg-[rgba(0,163,157,0.15)] border-[rgba(0,163,157,0.3)]',
    icon: UserCog,
  },
  PARTICIPANT: {
    label: 'Participant',
    color: 'text-white',
    bgColor: 'bg-white/10 border-white/20',
    icon: Users,
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: {
    label: 'Active',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15 border-emerald-500/30',
  },
  suspended: {
    label: 'Suspended',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15 border-red-500/30',
  },
  banned: {
    label: 'Banned',
    color: 'text-red-600',
    bgColor: 'bg-red-900/30 border-red-800/40',
  },
};

// ─── USERS PAGE ═══════════════════════════════════════════════════════════════

export function UsersPage() {
  const [activeTab, setActiveTab] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  const { data: usersData, isLoading, error } = useAdminUsers();

  const allUsers = useMemo(() => {
    const raw = ((usersData as { data?: unknown[] } | undefined)?.data || []) as any[]
    return raw.map((u: any) => ({
      id: String(u.id || ''),
      name: String(u.name || ''),
      email: String(u.email || ''),
      phone: String(u.phone || '—'),
      role: String(u.role || 'PARTICIPANT'),
      status: (u.status === 'suspended' || u.status === 'banned' ? u.status : 'active') as AdminUser['status'],
      totalOrders: Number(u.totalOrders || 0),
      totalSpent: Number(u.totalSpent || 0),
      lastLogin: String(u.lastLogin || u.updatedAt || ''),
      createdAt: String(u.createdAt || ''),
    })) as AdminUser[];
  }, [usersData]);

  // Stats
  const totalUsers = allUsers.length;
  const superAdminCount = allUsers.filter(u => u.role === 'SUPER_ADMIN').length;
  const organizerCount = allUsers.filter(u => u.role === 'ORGANIZER').length;
  const participantCount = allUsers.filter(u => u.role === 'PARTICIPANT').length;
  const suspendedCount = allUsers.filter(u => u.status === 'suspended').length;

  // Filtered users
  const filteredUsers = useMemo(() => {
    let users = [...allUsers];

    if (activeTab === 'suspended') {
      users = users.filter(u => u.status === 'suspended');
    } else if (activeTab !== 'all') {
      users = users.filter(u => u.role === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      users = users.filter(
        u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    return users;
  }, [allUsers, activeTab, searchQuery]);

  const formatDateTimeStr = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM yyyy, HH:mm", { locale: idLocale });
    } catch {
      return dateStr || '—';
    }
  };

  const handleRoleChange = (user: AdminUser) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (selectedUser && newRole) {
      toast.success(`Role ${selectedUser.name} berhasil diubah ke ${newRole}`);
      setRoleDialogOpen(false);
    }
  };

  const handleSuspend = (user: AdminUser) => {
    toast.warning(`User ${user.name} telah di-suspend`);
  };

  const handleBan = (user: AdminUser) => {
    toast.error(`User ${user.name} telah di-ban`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load users</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00A39D]" />
            Users & Roles
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola pengguna, peran, dan akses
          </p>
        </div>
      </div>

      {/* ═══════════ STATS CARDS ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Users',
            value: totalUsers.toString(),
            icon: Users,
            color: '#00A39D',
            description: 'Semua pengguna terdaftar',
          },
          {
            label: 'Super Admin',
            value: superAdminCount.toString(),
            icon: Crown,
            color: '#F8AD3C',
            description: 'Akses penuh sistem',
          },
          {
            label: 'Organizers',
            value: organizerCount.toString(),
            icon: UserCog,
            color: '#00A39D',
            description: 'Kelola event & verifikasi',
          },
          {
            label: 'Participants',
            value: participantCount.toString(),
            icon: ShieldCheck,
            color: '#00A39D',
            description: 'Pembeli tiket aktif',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="bg-[#111918] border-[rgba(0,163,157,0.1)]"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">{stat.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-white text-2xl font-bold">{stat.value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══════════ FILTERS & SEARCH ═══════════ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {(
                [
                  { key: 'all', label: 'All', count: totalUsers },
                  { key: 'SUPER_ADMIN', label: 'Super Admin', count: superAdminCount },
                  { key: 'ORGANIZER', label: 'Organizer', count: organizerCount },
                  { key: 'PARTICIPANT', label: 'Participant', count: participantCount },
                  { key: 'suspended', label: 'Suspended', count: suspendedCount },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    activeTab === tab.key
                      ? 'bg-[#00A39D] text-[#0A0F0E]'
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white placeholder:text-muted-foreground/50 pl-9 h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ USERS TABLE ═══════════ */}
      <Card className="bg-[#111918] border-[rgba(0,163,157,0.1)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#00A39D]" />
                Daftar Pengguna
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                Menampilkan {filteredUsers.length} dari {totalUsers} pengguna
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(0,163,157,0.1)] hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    Pengguna
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    Email
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider hidden md:table-cell">
                    Telepon
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    Role
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right hidden lg:table-cell">
                    Pesanan
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right hidden lg:table-cell">
                    Total Belanja
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">
                    Login Terakhir
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-center">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">
                          Tidak ada pengguna ditemukan
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG['PARTICIPANT'];
                    const statusConfig = STATUS_CONFIG[user.status];
                    const RoleIcon = roleConfig.icon;

                    return (
                      <TableRow
                        key={user.id}
                        className="border-[rgba(0,163,157,0.05)] hover:bg-[rgba(0,163,157,0.05)]"
                      >
                        {/* Avatar + Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                                user.role === 'SUPER_ADMIN'
                                  ? 'bg-[rgba(248,173,60,0.15)] text-[#F8AD3C]'
                                  : user.role === 'ORGANIZER'
                                    ? 'bg-[rgba(0,163,157,0.15)] text-[#00A39D]'
                                    : 'bg-white/10 text-white'
                              )}
                            >
                              {user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">
                                {user.name}
                              </p>
                              <p className="text-muted-foreground text-xs md:hidden">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3 text-[#00A39D] shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3 text-[#00A39D] shrink-0" />
                            {user.phone}
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Badge
                            className={cn(
                              'font-medium text-xs gap-1',
                              roleConfig.bgColor,
                              roleConfig.color
                            )}
                          >
                            <RoleIcon className="w-3 h-3" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            className={cn(
                              'font-medium text-xs',
                              statusConfig?.bgColor,
                              statusConfig?.color
                            )}
                          >
                            {user.status === 'active' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
                            )}
                            {user.status === 'suspended' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1" />
                            )}
                            {user.status === 'banned' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-700 mr-1" />
                            )}
                            {statusConfig?.label}
                          </Badge>
                        </TableCell>

                        {/* Orders */}
                        <TableCell className="text-right hidden lg:table-cell">
                          <div className="flex items-center justify-end gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-white font-medium text-sm">
                              {user.totalOrders}
                            </span>
                          </div>
                        </TableCell>

                        {/* Total Spent */}
                        <TableCell className="text-right hidden lg:table-cell">
                          <div className="flex items-center justify-end gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-[#F8AD3C]" />
                            <span className="text-[#F8AD3C] font-semibold text-sm">
                              {user.totalSpent > 0
                                ? formatRupiah(user.totalSpent)
                                : '-'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Last Login */}
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                            {formatDateTimeStr(user.lastLogin)}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#00A39D] hover:text-[#00BFB8] hover:bg-[rgba(0,163,157,0.1)] h-8 w-8 p-0"
                              onClick={() => toast.info(`Detail user: ${user.name}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {user.role !== 'SUPER_ADMIN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#F8AD3C] hover:text-[#FBBF4E] hover:bg-[rgba(248,173,60,0.1)] h-8 w-8 p-0"
                                onClick={() => handleRoleChange(user)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {user.status === 'active' && user.role !== 'SUPER_ADMIN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 h-8 w-8 p-0"
                                onClick={() => handleSuspend(user)}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            )}
                            {user.status === 'active' && user.role !== 'SUPER_ADMIN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                                onClick={() => handleBan(user)}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
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

      {/* ═══════════ ROLE ASSIGNMENT DIALOG ═══════════ */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="bg-[#111918] border-[rgba(0,163,157,0.2)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Ubah Role Pengguna</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                    selectedUser.role === 'SUPER_ADMIN'
                      ? 'bg-[rgba(248,173,60,0.15)] text-[#F8AD3C]'
                      : selectedUser.role === 'ORGANIZER'
                        ? 'bg-[rgba(0,163,157,0.15)] text-[#00A39D]'
                        : 'bg-white/10 text-white'
                  )}
                >
                  {selectedUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{selectedUser.name}</p>
                  <p className="text-muted-foreground text-xs">{selectedUser.email}</p>
                </div>
              </div>

              {/* Current Role */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Role Saat Ini</label>
                <Badge
                  className={cn(
                    'font-medium text-xs gap-1',
                    ROLE_CONFIG[selectedUser.role]?.bgColor,
                    ROLE_CONFIG[selectedUser.role]?.color
                  )}
                >
                  {(() => {
                    const Icon = ROLE_CONFIG[selectedUser.role]?.icon;
                    return Icon ? <Icon className="w-3 h-3" /> : null;
                  })()}
                  {ROLE_CONFIG[selectedUser.role]?.label}
                </Badge>
              </div>

              {/* New Role Select */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-[#F8AD3C]" />
                  Ubah Role Ke
                </label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-[#0A0F0E] border-[rgba(0,163,157,0.2)] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111918] border-[rgba(0,163,157,0.2)]">
                    <SelectItem value="PARTICIPANT">Participant</SelectItem>
                    <SelectItem value="ORGANIZER">Organizer</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Warning */}
              {newRole === 'SUPER_ADMIN' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(248,173,60,0.08)] border border-[rgba(248,173,60,0.2)]">
                  <AlertTriangle className="w-4 h-4 text-[#F8AD3C] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#F8AD3C] leading-relaxed">
                    Super Admin memiliki akses penuh ke seluruh sistem termasuk
                    pengaturan, verifikasi, dan manajemen user. Pastikan pengguna
                    ini terpercaya.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRoleDialogOpen(false)}
                  className="border-white/20 text-white hover:bg-white/5"
                >
                  Batal
                </Button>
                <Button
                  className="bg-[#00A39D] hover:bg-[#00BFB8] text-[#0A0F0E] font-semibold"
                  onClick={handleSaveRole}
                >
                  Simpan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
