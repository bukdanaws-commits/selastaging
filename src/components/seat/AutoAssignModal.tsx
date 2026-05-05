'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  type Seat,
  type SeatConfig,
  defaultSeatConfigs,
  generateMockSeats,
  autoAssignSeat,
  getZoneTypeLabel,
} from '@/lib/seat-data'
import { formatRupiah } from '@/lib/utils'
import {
  ArrowRight,
  Check,
  Zap,
  Armchair,
  Shuffle,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutoAssignModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tierId: string
  tierName: string
  tierEmoji: string
  price: number
  onConfirm?: (seat: Seat) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AutoAssignModal({
  open,
  onOpenChange,
  tierId,
  tierName,
  tierEmoji,
  price,
  onConfirm,
}: AutoAssignModalProps) {
  const config = defaultSeatConfigs.find(c => c.tierId === tierId)
  const [assigned, setAssigned] = useState(false)

  const mockSeats = useMemo(() => {
    if (!config) return []
    return generateMockSeats(config)
  }, [config])

  const bestSeat = useMemo(() => {
    return autoAssignSeat(mockSeats)
  }, [mockSeats])

  const stats = useMemo(() => {
    const available = mockSeats.filter(s => s.status === 'available').length
    return { available, total: mockSeats.length }
  }, [mockSeats])

  const handleAutoAssign = () => {
    if (!bestSeat) {
      toast.error('Maaf, semua kursi sudah terjual!')
      return
    }
    setAssigned(true)
    toast.success(`Kursi ${bestSeat.seatLabel} berhasil di-assign untuk Anda!`)
  }

  const handleProceed = () => {
    if (!bestSeat) return
    onConfirm?.(bestSeat)
    toast.success(`Tiket ${tierName} — Kursi ${bestSeat.seatLabel} dikonfirmasi! Checkout coming soon.`)
    onOpenChange(false)
    setTimeout(() => setAssigned(false), 300)
  }

  const handleClose = (open: boolean) => {
    if (!open) setAssigned(false)
    onOpenChange(open)
  }

  if (!config) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{tierEmoji}</span>
            {tierName} — Auto Assign
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sistem akan memilihkan kursi terbaik yang tersedia untuk Anda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info about auto-assign */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Kursi Otomatis</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.zoneType === 'seated'
                    ? 'Sistem memilih kursi terbaik — baris terdekat dengan panggung, posisi tengah.'
                    : 'Sistem memilih zone standing yang paling banyak kapasitas tersedia.'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Seat details after assign */}
            {!assigned ? (
              <div className="text-center py-3">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Klik tombol di bawah untuk mendapatkan kursi
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Armchair className="h-3 w-3" />
                    {stats.available} tersedia
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Gate: {config.gate}
                  </span>
                </div>
              </div>
            ) : bestSeat ? (
              <div className="text-center py-3">
                <div className="text-4xl mb-2">💺</div>
                <p className="text-xs text-muted-foreground mb-1">Kursi Anda</p>
                <p className="text-2xl font-black text-primary">
                  {bestSeat.seatLabel}
                </p>
                <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Baris {bestSeat.rowLabel}</span>
                  <span>•</span>
                  <span>Nomor {bestSeat.seatNumber}</span>
                  <span>•</span>
                  <span>{config.gate}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-destructive">Kursi sudah habis!</p>
              </div>
            )}
          </div>

          {/* Price summary */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">Harga Tiket</span>
            <span className="text-lg font-bold text-foreground">{formatRupiah(price)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
            Kembali
          </Button>
          {!assigned ? (
            <Button
              className="flex-1 gap-1.5"
              disabled={!bestSeat}
              onClick={handleAutoAssign}
            >
              <Shuffle className="h-4 w-4" />
              Assign Kursi
            </Button>
          ) : (
            <Button
              className="flex-1 gap-1.5"
              disabled={!bestSeat}
              onClick={handleProceed}
            >
              <Check className="h-4 w-4" />
              Lanjut Bayar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
