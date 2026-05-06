'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  type Seat,
  type SeatConfig,
  type SeatSelectionMode,
  defaultSeatConfigs,
  generateMockSeats,
  autoAssignSeat,
  getZoneTypeLabel,
} from '@/lib/seat-data'
import { formatRupiah } from '@/lib/utils'
import { SeatMap } from '@/components/seat/SeatMap'
import { AutoAssignModal } from '@/components/seat/AutoAssignModal'
import {
  Check,
  X,
  ArrowRight,
  Info,
  Armchair,
  Zap,
  Shuffle,
  MapPin,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SeatSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tierId: string
  tierName: string
  tierEmoji: string
  price: number
  onConfirm?: (seat: Seat) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SeatSelectionModal({
  open,
  onOpenChange,
  tierId,
  tierName,
  tierEmoji,
  price,
  onConfirm,
}: SeatSelectionModalProps) {
  const config = defaultSeatConfigs.find(c => c.tierId === tierId)
  const [confirmedSeat, setConfirmedSeat] = useState<Seat | null>(null)
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)

  const mockSeats = useMemo(() => {
    if (!config) return []
    return generateMockSeats(config)
  }, [config])

  // Determine which mode to show
  const mode: SeatSelectionMode = config?.seatSelectionMode || 'seat_selection'
  const showChoice = mode === 'both'
  const showSeatMap = mode === 'seat_selection' || (mode === 'both' && !showChoice)
  const [selectedMode, setSelectedMode] = useState<'seat_selection' | 'auto_assign'>('seat_selection')

  // When mode is 'both', default to seat_selection view
  const [viewMode, setViewMode] = useState<'seat_selection' | 'auto_assign'>(
    mode === 'auto_assign' ? 'auto_assign' : 'seat_selection'
  )

  // Reset view when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setConfirmedSeat(null)
      setViewMode(mode === 'auto_assign' ? 'auto_assign' : 'seat_selection')
      setSelectedMode('seat_selection')
    }
    onOpenChange(open)
  }

  const handleSelect = useCallback((seat: Seat) => {
    setConfirmedSeat(seat)
    onConfirm?.(seat)
  }, [onConfirm])

  const handleAutoConfirm = useCallback((seat: Seat) => {
    setAutoAssignOpen(false)
    onConfirm?.(seat)
    toast.success(`Tiket ${tierName} — Kursi ${seat.seatLabel} dikonfirmasi! Checkout coming soon.`)
    onOpenChange(false)
  }, [onConfirm, tierName, onOpenChange])

  const handleProceed = () => {
    if (!confirmedSeat) return
    toast.success(`Tiket ${tierName} — Kursi ${confirmedSeat.seatLabel} dikonfirmasi! Checkout coming soon.`)
    onOpenChange(false)
    setTimeout(() => setConfirmedSeat(null), 300)
  }

  // ─── Auto-assign direct mode (no seat map at all) ──────────────────────
  // When mode === 'auto_assign', directly show AutoAssignModal
  if (config?.seatSelectionMode === 'auto_assign') {
    return (
      <AutoAssignModal
        open={open}
        onOpenChange={handleOpenChange}
        tierId={tierId}
        tierName={tierName}
        tierEmoji={tierEmoji}
        price={price}
        onConfirm={onConfirm}
      />
    )
  }

  if (!config) return null

  const availableCount = mockSeats.filter(s => s.status === 'available').length

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{tierEmoji}</span>
                Pilih Kursi — {tierName}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {config.zoneType === 'seated'
                  ? 'Klik kursi yang tersedia (hijau) untuk memilih. Merah = sudah terjual.'
                  : 'Pilih zone standing yang tersedia.'}
              </DialogDescription>
            </DialogHeader>

            {/* Mode Choice — only for 'both' mode */}
            {mode === 'both' && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant={viewMode === 'seat_selection' ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 gap-1.5 text-xs',
                    viewMode === 'seat_selection' && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setViewMode('seat_selection')}
                >
                  <Armchair className="h-3.5 w-3.5" />
                  Pilih Sendiri
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'auto_assign' ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 gap-1.5 text-xs',
                    viewMode === 'auto_assign' && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setViewMode('auto_assign')}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Auto Assign
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">Cepat</Badge>
                </Button>
              </div>
            )}

            {/* Tier Info Bar */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                {getZoneTypeLabel(config.zoneType)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {config.zoneType === 'seated'
                  ? `${config.totalRows} baris × ${config.seatsPerRow} kursi`
                  : `${config.totalZones} zone`}
              </span>
              <Badge variant="outline" className="text-xs">
                {formatRupiah(price)}
              </Badge>
              <span className="text-xs text-emerald-500 font-medium">
                {availableCount.toLocaleString('id-ID')} tersedia
              </span>
            </div>
          </div>

          {/* Content */}
          {viewMode === 'auto_assign' && mode === 'both' ? (
            // ─── Auto-assign view (embedded in dialog) ───────────────────
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-6 max-w-sm">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Zap className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Auto Assign</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sistem akan memilihkan kursi terbaik yang tersedia untuk Anda —
                    baris paling dekat panggung, posisi tengah.
                  </p>
                </div>

                {availableCount === 0 ? (
                  <p className="text-sm text-destructive font-medium">
                    Maaf, semua kursi sudah terjual!
                  </p>
                ) : (
                  <Button
                    size="lg"
                    className="gap-2 rounded-full px-8"
                    onClick={() => {
                      const seat = autoAssignSeat(mockSeats)
                      if (!seat) {
                        toast.error('Semua kursi sudah terjual!')
                        return
                      }
                      toast.success(`Kursi ${seat.seatLabel} di-assign! Checkout coming soon.`)
                      onConfirm?.(seat)
                      onOpenChange(false)
                    }}
                  >
                    <Shuffle className="h-4 w-4" />
                    Dapatkan Kursi Otomatis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Ingin pilih sendiri? Klik tombol "Pilih Sendiri" di atas.
                </p>
              </div>
            </div>
          ) : (
            // ─── Seat Map view ────────────────────────────────────────────
            <>
              <ScrollArea className="flex-1">
                <div className="px-4 py-4">
                  <SeatMap
                    seats={mockSeats}
                    config={config}
                    interactive
                    compact={false}
                    showStage
                    maxSelections={1}
                    onSelect={handleSelect}
                  />
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    {confirmedSeat ? (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Kursi Dipilih</p>
                        <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                          <Check className="h-4 w-4" />
                          {confirmedSeat.seatLabel}
                          <span className="text-xs text-muted-foreground font-normal">
                            — {formatRupiah(price)}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5 inline mr-1" />
                        Klik kursi yang tersedia untuk memilih
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                      Kembali
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={!confirmedSeat}
                      onClick={handleProceed}
                    >
                      Lanjut Bayar
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
