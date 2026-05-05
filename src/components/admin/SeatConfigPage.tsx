'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Armchair,
  Settings2,
  RotateCcw,
  Eye,
  Grid3X3,
  Users,
  Lock,
  TicketCheck,
  ChevronRight,
  Save,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  type SeatConfig,
  type Seat,
  type ZoneType,
  type SeatSelectionMode,
  defaultSeatConfigs,
  generateMockSeats,
  getSeatStats,
  getZoneTypeLabel,
  getSelectionModeLabel,
  getComputedTotal,
} from '@/lib/seat-data'
import { formatRupiah } from '@/lib/utils'
import { SeatMap } from '@/components/seat/SeatMap'
import { useAdminSeats } from '@/hooks/use-api'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Component ──────────────────────────────────────────────────────────────

export function SeatConfigPage() {
  const { data: seatsData, isLoading, error } = useAdminSeats();
  const [configs, setConfigs] = useState<SeatConfig[]>((seatsData as any) ?? defaultSeatConfigs)
  const [selectedTier, setSelectedTier] = useState<string>(configs[0].tierId)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewTier, setPreviewTier] = useState<string>('')
  const [editingConfig, setEditingConfig] = useState<SeatConfig | null>(null)

  const currentConfig = configs.find(c => c.tierId === selectedTier) || configs[0]

  // Generate mock seats for the selected tier
  const mockSeats = useMemo(() => {
    return generateMockSeats(currentConfig)
  }, [currentConfig])

  const stats = useMemo(() => getSeatStats(mockSeats), [mockSeats])

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>

  // ─── Edit Handlers ───────────────────────────────────────────────────────

  const handleOpenEdit = (config: SeatConfig) => {
    setEditingConfig({ ...config })
    setEditDialogOpen(true)
  }

  const handleSaveConfig = () => {
    if (!editingConfig) return
    setConfigs(prev => prev.map(c => c.tierId === editingConfig.tierId ? editingConfig : c))
    setEditDialogOpen(false)
    toast.success(`Konfigurasi ${editingConfig.tierName} berhasil disimpan`)
  }

  const handleOpenPreview = (tierId: string) => {
    setPreviewTier(tierId)
    setPreviewDialogOpen(true)
  }

  const handleResetSeats = (tierId: string) => {
    const config = configs.find(c => c.tierId === tierId)
    if (!config) return
    const newConfig = { ...config, sold: 0 }
    setConfigs(prev => prev.map(c => c.tierId === tierId ? newConfig : c))
    toast.success(`Semua kursi ${config.tierName} berhasil direset`)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            Konfigurasi Kursi
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Atur layout kursi per kategori tiket — fleksibel sesuai venue
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/30 text-primary text-xs">
          {configs.length} Kategori
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Tier List */}
        <div className="lg:col-span-1">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Kategori Tiket</CardTitle>
              <CardDescription className="text-xs">Pilih kategori untuk konfigurasi</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-0.5 px-3 pb-3">
                  {configs.map(config => {
                    const total = getComputedTotal(config)
                    const pct = total > 0 ? Math.round((config.sold / total) * 100) : 0
                    const isSelected = config.tierId === selectedTier

                    return (
                      <button
                        key={config.tierId}
                        onClick={() => setSelectedTier(config.tierId)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                          isSelected
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50 border border-transparent'
                        )}
                      >
                        <div className="text-2xl shrink-0">{config.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-sm font-semibold truncate',
                              isSelected ? 'text-primary' : 'text-foreground'
                            )}>
                              {config.tierName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {getZoneTypeLabel(config.zoneType)}
                            </Badge>
                            <Badge variant={config.seatSelectionMode === 'auto_assign' ? 'secondary' : 'outline'} className={cn(
                              'text-[10px] px-1.5 py-0',
                              config.seatSelectionMode === 'seat_selection' && 'border-primary/30 text-primary',
                              config.seatSelectionMode === 'both' && 'border-gold/30 text-gold',
                            )}>
                              {getSelectionModeLabel(config.seatSelectionMode)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {config.zoneType === 'seated'
                                ? `${config.totalRows}×${config.seatsPerRow}`
                                : config.zoneType === 'standing'
                                  ? `${config.totalZones} zone`
                                  : 'GA'
                              }
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-foreground">{config.sold}/{total}</p>
                          <p className="text-[10px] text-muted-foreground">{pct}%</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Config Detail */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Armchair className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Kursi</p>
                    <p className="text-lg font-bold text-foreground">{stats.total.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TicketCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tersedia</p>
                    <p className="text-lg font-bold text-emerald-400">{stats.available.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Terjual</p>
                    <p className="text-lg font-bold text-red-400">{stats.sold.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Dikunci</p>
                    <p className="text-lg font-bold text-gray-400">{stats.locked}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Config Display */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{currentConfig.emoji}</span>
                  <div>
                    <CardTitle className="text-base font-bold">{currentConfig.tierName}</CardTitle>
                    <CardDescription className="text-xs">
                      {formatRupiah(currentConfig.price)} / tiket
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleOpenPreview(currentConfig.tierId)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleOpenEdit(currentConfig)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipe Zone</p>
                  <Badge variant="outline" className="text-xs">{getZoneTypeLabel(currentConfig.zoneType)}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mode Kursi</p>
                  <Badge variant={currentConfig.seatSelectionMode === 'auto_assign' ? 'secondary' : 'outline'} className={cn(
                    'text-xs',
                    currentConfig.seatSelectionMode === 'seat_selection' && 'border-primary/30 text-primary',
                    currentConfig.seatSelectionMode === 'both' && 'border-gold/30 text-gold',
                  )}>
                    {getSelectionModeLabel(currentConfig.seatSelectionMode)}
                  </Badge>
                </div>
                {currentConfig.zoneType === 'seated' ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jumlah Baris</p>
                      <p className="text-sm font-semibold text-foreground">{currentConfig.totalRows} baris</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Kursi / Baris</p>
                      <p className="text-sm font-semibold text-foreground">{currentConfig.seatsPerRow} kursi</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prefix Baris</p>
                      <p className="text-sm font-semibold text-foreground">"{currentConfig.rowPrefix}"</p>
                      <p className="text-[10px] text-muted-foreground">
                        Contoh: {currentConfig.rowPrefix}1, {currentConfig.rowPrefix}2, ... {currentConfig.rowPrefix}{currentConfig.seatsPerRow}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Kursi</p>
                      <p className="text-sm font-bold text-primary">
                        {(currentConfig.totalRows * currentConfig.seatsPerRow).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Range Label</p>
                      <p className="text-xs text-foreground font-mono">
                        {currentConfig.rowPrefix}{currentConfig.seatNumberStart} — {currentConfig.rowPrefix}{currentConfig.seatsPerRow}
                      </p>
                    </div>
                  </>
                ) : currentConfig.zoneType === 'standing' ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jumlah Zone</p>
                      <p className="text-sm font-semibold text-foreground">{currentConfig.totalZones} zone</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</p>
                      <p className="text-xs text-foreground font-mono">
                        Zone 1 — Zone {currentConfig.totalZones}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Info</p>
                    <p className="text-sm text-foreground">
                      General Admission — penonton bebas memilih posisi dalam area
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gate Masuk</p>
                  <p className="text-sm font-semibold text-foreground">{currentConfig.gate}</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Mini seat map preview */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Preview Layout</p>
                <div className="bg-muted/30 rounded-lg p-3 max-h-48 overflow-auto">
                  {currentConfig.zoneType === 'seated' ? (
                    <SeatMap
                      seats={mockSeats.slice(0, 200)}
                      config={currentConfig}
                      interactive={false}
                      compact
                      showStage={false}
                    />
                  ) : currentConfig.zoneType === 'standing' ? (
                    <div className="grid grid-cols-5 gap-2">
                      {mockSeats.map(seat => (
                        <div
                          key={seat.id}
                          className={cn(
                            'flex items-center justify-center rounded-lg border text-xs p-2',
                            seat.status === 'sold' ? 'bg-red-500/20 border-red-500/30 text-red-400/60' :
                            seat.status === 'reserved' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
                            'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          )}
                        >
                          {seat.seatLabel}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      General Admission — tidak ada kursi bernomor
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {mockSeats.length > 200 && currentConfig.zoneType === 'seated'
                    ? `Menampilkan 200 dari ${mockSeats.length} kursi. Klik "Preview" untuk melihat semua.`
                    : `Total: ${mockSeats.length} kursi`
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* All Tiers Quick View */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Ringkasan Semua Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Kategori</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Tipe</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Mode</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Layout</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Total</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Terjual</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">%</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map(config => {
                      const total = getComputedTotal(config)
                      const pct = total > 0 ? Math.round((config.sold / total) * 100) : 0
                      return (
                        <tr key={config.tierId} className="border-b border-border/50">
                          <td className="py-2.5 font-medium">{config.emoji} {config.tierName}</td>
                          <td className="py-2.5 text-muted-foreground">{getZoneTypeLabel(config.zoneType)}</td>
                          <td className="py-2.5">
                            <Badge variant={config.seatSelectionMode === 'auto_assign' ? 'secondary' : 'outline'} className={cn(
                              'text-[10px]',
                              config.seatSelectionMode === 'seat_selection' && 'border-primary/30 text-primary',
                              config.seatSelectionMode === 'both' && 'border-gold/30 text-gold',
                            )}>
                              {getSelectionModeLabel(config.seatSelectionMode)}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-muted-foreground font-mono">
                            {config.zoneType === 'seated' ? `${config.totalRows}×${config.seatsPerRow}` :
                             config.zoneType === 'standing' ? `${config.totalZones} zones` : 'GA'}
                          </td>
                          <td className="py-2.5 text-right font-medium">{total.toLocaleString('id-ID')}</td>
                          <td className="py-2.5 text-right">{config.sold.toLocaleString('id-ID')}</td>
                          <td className="py-2.5 text-right">
                            <Badge variant={pct >= 90 ? 'destructive' : 'outline'} className="text-[10px]">
                              {pct}%
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                              onClick={() => handleOpenPreview(config.tierId)}
                            >
                              <Eye className="h-3 w-3" />
                              Lihat
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Config Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingConfig?.emoji} Edit Konfigurasi Kursi
            </DialogTitle>
            <DialogDescription>
              Ubah layout kursi untuk {editingConfig?.tierName}. Perubahan akan langsung diterapkan.
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-4 py-2">
              {/* Zone Type */}
              <div className="space-y-2">
                <Label className="text-xs">Tipe Zone</Label>
                <Select
                  value={editingConfig.zoneType}
                  onValueChange={(val) =>
                    setEditingConfig({ ...editingConfig, zoneType: val as ZoneType })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seated">Kursi Bernomor (Seated)</SelectItem>
                    <SelectItem value="standing">Standing Zone</SelectItem>
                    <SelectItem value="free">General Admission (Free)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seated Config */}
              {editingConfig.zoneType === 'seated' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Jumlah Baris</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={editingConfig.totalRows}
                        onChange={(e) =>
                          setEditingConfig({
                            ...editingConfig,
                            totalRows: parseInt(e.target.value) || 1,
                          })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Kursi per Baris</Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={editingConfig.seatsPerRow}
                        onChange={(e) =>
                          setEditingConfig({
                            ...editingConfig,
                            seatsPerRow: parseInt(e.target.value) || 1,
                          })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Prefix Baris (A, B, C...)</Label>
                      <Input
                        maxLength={2}
                        value={editingConfig.rowPrefix}
                        onChange={(e) =>
                          setEditingConfig({
                            ...editingConfig,
                            rowPrefix: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="A"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Mulai Nomor Kursi</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editingConfig.seatNumberStart}
                        onChange={(e) =>
                          setEditingConfig({
                            ...editingConfig,
                            seatNumberStart: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Preview computed label */}
                  <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-medium text-foreground">Preview Label:</p>
                    <p className="text-muted-foreground font-mono">
                      Baris {editingConfig.rowPrefix}{editingConfig.seatNumberStart}, {editingConfig.rowPrefix}{editingConfig.seatNumberStart + 1}, ... {editingConfig.rowPrefix}{editingConfig.seatsPerRow}
                    </p>
                    <p className="text-muted-foreground">
                      Total: <span className="text-primary font-semibold">{(editingConfig.totalRows * editingConfig.seatsPerRow).toLocaleString('id-ID')}</span> kursi
                    </p>
                  </div>
                </>
              )}

              {/* Standing Config */}
              {editingConfig.zoneType === 'standing' && (
                <div className="space-y-2">
                  <Label className="text-xs">Jumlah Zone</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={editingConfig.totalZones}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        totalZones: parseInt(e.target.value) || 1,
                      })
                    }
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Label: Zone 1 — Zone {editingConfig.totalZones}
                  </p>
                </div>
              )}

              {/* Common Config */}
              <div className="space-y-2">
                <Label className="text-xs">Mode Pemilihan Kursi</Label>
                <Select
                  value={editingConfig.seatSelectionMode}
                  onValueChange={(val) =>
                    setEditingConfig({ ...editingConfig, seatSelectionMode: val as SeatSelectionMode })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seat_selection">Pilih Sendiri (Seat Map)</SelectItem>
                    <SelectItem value="auto_assign">Auto Assign (Sistem Pilih)</SelectItem>
                    <SelectItem value="both">Hybrid (User Pilih / Auto)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {editingConfig.seatSelectionMode === 'seat_selection' ? 'User membuka seat map dan memilih kursi sendiri'
                    : editingConfig.seatSelectionMode === 'auto_assign' ? 'Sistem otomatis assign kursi terbaik'
                    : 'User bisa memilih sendiri atau serahkan ke sistem'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Gate Masuk</Label>
                <Select
                  value={editingConfig.gate}
                  onValueChange={(val) =>
                    setEditingConfig({ ...editingConfig, gate: val })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gate A">Gate A</SelectItem>
                    <SelectItem value="Gate B">Gate B</SelectItem>
                    <SelectItem value="Gate C">Gate C</SelectItem>
                    <SelectItem value="Gate D">Gate D</SelectItem>
                    <SelectItem value="VIP Gate">VIP Gate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveConfig} className="gap-1.5">
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configs.find(c => c.tierId === previewTier)?.emoji}{' '}
              {configs.find(c => c.tierId === previewTier)?.tierName} — Seat Map
            </DialogTitle>
            <DialogDescription>
              Preview lengkap layout kursi. Klik kursi untuk simulasi pilih.
            </DialogDescription>
          </DialogHeader>
          {previewTier && (
            <SeatMap
              seats={generateMockSeats(configs.find(c => c.tierId === previewTier)!)}
              config={configs.find(c => c.tierId === previewTier)!}
              interactive
              compact={false}
              showStage
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
