'use client';

import React, { useState, useMemo } from 'react';
import { cn, formatRupiah } from '@/lib/utils';
import { useAdminCrewGates } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── LOCAL TYPES ───────────────────────────────────────────────────────────────

type CrewMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ORGANIZER' | 'SCANNER_CREW' | 'VERIFICATION_ADMIN' | 'REDEEM_CREW';
  assignedGate: string | null;
  assignedStation: string | null;
  status: 'active' | 'inactive';
  lastActive: string;
};

type GateConfig = {
  id: string;
  name: string;
  type: 'entry' | 'exit' | 'both';
  location: string;
  minAccessLevel: string;
  capacityPerMinute: number;
  currentScanner: string | null;
  isActive: boolean;
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
  Users,
  UserCheck,
  UserX,
  Shield,
  ScanLine,
  Plus,
  Search,
  MapPin,
  DoorOpen,
  DoorClosed,
  Wifi,
  WifiOff,
  Monitor,
  Smartphone,
  Activity,
  Clock,
  ChevronRight,
  Settings,
  ArrowRightLeft,
  LogIn,
  LogOut,
} from 'lucide-react';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const roleConfig: Record<
  CrewMember['role'],
  { label: string; className: string }
> = {
  ORGANIZER: {
    label: 'Organizer',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  SCANNER_CREW: {
    label: 'Scanner Crew',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  VERIFICATION_ADMIN: {
    label: 'Verification Admin',
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
  REDEEM_CREW: {
    label: 'Redeem Crew',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
};

const gateTypeConfig: Record<
  GateConfig['type'],
  { label: string; className: string; icon: React.ReactNode }
> = {
  entry: {
    label: 'Entry',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: <LogIn className="w-3 h-3" />,
  },
  exit: {
    label: 'Exit',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: <LogOut className="w-3 h-3" />,
  },
  both: {
    label: 'Both',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: <ArrowRightLeft className="w-3 h-3" />,
  },
};

// ─── SCANNER DEVICES MOCK ────────────────────────────────────────────────────

interface ScannerDevice {
  id: string;
  name: string;
  type: 'redeem' | 'entry' | 'exit';
  status: 'online' | 'offline';
  lastPing: string;
}

const mockScannerDevices: ScannerDevice[] = [
  {
    id: 'dev-001',
    name: 'Redeem Booth Alpha',
    type: 'redeem',
    status: 'online',
    lastPing: '2026-06-22T18:10:00',
  },
  {
    id: 'dev-002',
    name: 'Gate A Scanner',
    type: 'entry',
    status: 'online',
    lastPing: '2026-06-22T18:09:30',
  },
  {
    id: 'dev-003',
    name: 'Gate B Scanner',
    type: 'entry',
    status: 'online',
    lastPing: '2026-06-22T18:10:15',
  },
  {
    id: 'dev-004',
    name: 'Exit Main Scanner',
    type: 'exit',
    status: 'offline',
    lastPing: '2026-06-22T16:00:00',
  },
];

const deviceTypeConfig: Record<
  ScannerDevice['type'],
  { label: string; className: string }
> = {
  redeem: {
    label: 'Redeem',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  entry: {
    label: 'Entry',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  exit: {
    label: 'Exit',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function CrewGatesPage() {
  const { data, isLoading, error } = useAdminCrewGates();

  const crewMembers: CrewMember[] = (data as any)?.data ? (data as any).data.filter((c: any) => c.role) : (data as any)?.crew ?? [];
  const gateConfigs: GateConfig[] = (data as any)?.data ? (data as any).data.filter((c: any) => c.type) : (data as any)?.gates ?? [];

  // ── Crew State ──
  const [crewSearch, setCrewSearch] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRole, setAssignRole] = useState<string>('');
  const [assignGate, setAssignGate] = useState<string>('');

  // ── Gate State ──
  const [gateToggles, setGateToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(gateConfigs.map((g) => [g.id, g.isActive]))
  );

  // ── Crew stats ──
  const crewStats = useMemo(
    () => ({
      total: crewMembers.length,
      active: crewMembers.filter((c) => c.status === 'active').length,
      inactive: crewMembers.filter((c) => c.status === 'inactive').length,
      organizers: crewMembers.filter((c) => c.role === 'ORGANIZER').length,
      scannerCrew: crewMembers.filter((c) => c.role === 'SCANNER_CREW').length,
    }),
    [crewMembers]
  );

  // ── Filtered crew ──
  const filteredCrew = useMemo(() => {
    if (!crewSearch.trim()) return crewMembers;
    const q = crewSearch.toLowerCase();
    return crewMembers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.assignedGate && c.assignedGate.toLowerCase().includes(q)) ||
        (c.assignedStation && c.assignedStation.toLowerCase().includes(q))
    );
  }, [crewSearch, crewMembers]);

  const handleToggleGate = (gateId: string) => {
    setGateToggles((prev) => {
      const next = !prev[gateId];
      const gate = gateConfigs.find((g) => g.id === gateId);
      toast.success(
        `${gate?.name || gateId} ${next ? 'activated' : 'deactivated'} successfully`
      );
      return { ...prev, [gateId]: next };
    });
  };

  const handleAssignCrew = () => {
    if (!assignRole) {
      toast.error('Please select a role');
      return;
    }
    toast.success('Crew member assigned successfully');
    setAssignDialogOpen(false);
    setAssignRole('');
    setAssignGate('');
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date('2026-06-22T18:10:00');
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Crew &amp; Gates
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage event crew assignments, gate configurations, and scanner devices
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — CREW MANAGEMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Crew Management
          </h3>

          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Assign Crew
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-input">
              <DialogHeader>
                <DialogTitle className="text-foreground">Assign New Crew</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Select a role and optional gate/station assignment for the new crew member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <Select value={assignRole} onValueChange={setAssignRole}>
                    <SelectTrigger className="bg-background border-input text-foreground w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-input">
                      <SelectItem value="ORGANIZER">Organizer</SelectItem>
                      <SelectItem value="SCANNER_CREW">Scanner Crew</SelectItem>
                      <SelectItem value="VERIFICATION_ADMIN">Verification Admin</SelectItem>
                      <SelectItem value="REDEEM_CREW">Redeem Crew</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Gate / Station</label>
                  <Select value={assignGate} onValueChange={setAssignGate}>
                    <SelectTrigger className="bg-background border-input text-foreground w-full">
                      <SelectValue placeholder="Select gate or station" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-input">
                      <SelectItem value="Gate A">Gate A — Utara Kiri</SelectItem>
                      <SelectItem value="Gate B">Gate B — Utara Kanan</SelectItem>
                      <SelectItem value="Gate C">Gate C — Timur</SelectItem>
                      <SelectItem value="Gate D">Gate D — Selatan Kiri</SelectItem>
                      <SelectItem value="VIP Gate">VIP Gate — Barat</SelectItem>
                      <SelectItem value="Exit Main">Exit Main — Selatan</SelectItem>
                      <SelectItem value="Station A1">Station A1</SelectItem>
                      <SelectItem value="Station A2">Station A2</SelectItem>
                      <SelectItem value="Station B1">Station B1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setAssignDialogOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-primary/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignCrew}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Crew Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Crew', value: crewStats.total, icon: Users, color: 'text-foreground' },
            { label: 'Active', value: crewStats.active, icon: UserCheck, color: 'text-emerald-400' },
            { label: 'Inactive', value: crewStats.inactive, icon: UserX, color: 'text-red-400' },
            { label: 'Organizers', value: crewStats.organizers, icon: Shield, color: 'text-primary' },
            { label: 'Scanner Crew', value: crewStats.scannerCrew, icon: ScanLine, color: 'text-blue-400' },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="bg-card border-border py-4"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <stat.icon className={cn('w-4 h-4', stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-lg font-bold leading-tight', stat.color)}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search crew by name, email, gate..."
            value={crewSearch}
            onChange={(e) => setCrewSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground/60 h-9"
          />
        </div>

        {/* Crew Table */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs font-medium">Name</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Email</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Phone</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Role</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Gate / Station</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Status</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Last Active</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCrew.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No crew found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCrew.map((crew) => {
                      const rc = roleConfig[crew.role];
                      const assignedTo = crew.assignedGate || crew.assignedStation || '—';
                      return (
                        <TableRow
                          key={crew.id}
                          className="border-border hover:bg-primary/5"
                        >
                          <TableCell className="text-sm text-foreground font-medium">
                            {crew.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {crew.email}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {crew.phone}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px]', rc.className)}>
                              {rc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-foreground">
                            {assignedTo}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                crew.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-400 border-red-500/30'
                              )}
                            >
                              {crew.status === 'active' ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  Inactive
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatRelativeTime(crew.lastActive)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-primary/10"
                              onClick={() => toast.info(`Edit crew: ${crew.name}`)}
                            >
                              <Settings className="w-3 h-3" />
                            </Button>
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
      </div>

      <Separator className="bg-primary/10" />

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — GATES CONFIGURATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-primary" />
            Gates Configuration
          </h3>
          <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/20">
            {gateConfigs.filter((g) => gateToggles[g.id]).length}/{gateConfigs.length} active
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gateConfigs.map((gate) => {
            const gt = gateTypeConfig[gate.type];
            const isActive = gateToggles[gate.id];

            return (
              <Card
                key={gate.id}
                className={cn(
                  'bg-card border-border transition-all',
                  isActive
                    ? 'border-input hover:border-primary/40'
                    : 'opacity-60'
                )}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header: Name + Active dot */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-gray-600'
                        )}
                      />
                      <h4 className="text-foreground font-bold">{gate.name}</h4>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px]', gt.className)}>
                      {gt.icon}
                      {gt.label}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{gate.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Min Access: </span>
                      <span className="text-foreground font-medium">{gate.minAccessLevel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Capacity: </span>
                      <span className="text-foreground font-medium">{gate.capacityPerMinute}/min</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ScanLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Scanner: </span>
                      <span className={gate.currentScanner ? 'text-primary font-medium' : 'text-muted-foreground/50'}>
                        {gate.currentScanner || 'Not assigned'}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-primary/10" />

                  {/* Toggle */}
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-medium', isActive ? 'text-emerald-400' : 'text-muted-foreground')}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleGate(gate.id)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator className="bg-primary/10" />

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — SCANNER DEVICES
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <Monitor className="w-5 h-5 text-primary" />
          Scanner Devices
        </h3>

        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-medium">Device Name</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Type</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Last Ping</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockScannerDevices.map((device) => {
                  const dt = deviceTypeConfig[device.type];
                  return (
                    <TableRow
                      key={device.id}
                      className="border-border hover:bg-primary/5"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {device.type === 'redeem' ? (
                            <Smartphone className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm text-foreground font-medium">{device.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', dt.className)}>
                          {dt.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {device.status === 'online' ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <Wifi className="w-3 h-3 mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">
                            <WifiOff className="w-3 h-3 mr-1" />
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(device.lastPing)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CrewGatesPage;
