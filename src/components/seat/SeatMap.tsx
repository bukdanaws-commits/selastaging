'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  type Seat,
  type SeatConfig,
  type SeatStatus,
  getSeatColor,
  getSeatDotColor,
  getStatusLabel,
} from '@/lib/seat-data'
import { Check, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SeatMapProps {
  seats: Seat[]
  config: SeatConfig
  interactive?: boolean
  compact?: boolean
  showStage?: boolean
  maxSelections?: number
  onSelectionChange?: (selected: Seat[]) => void
  onSelect?: (seat: Seat) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SeatMap({
  seats,
  config,
  interactive = false,
  compact = false,
  showStage = true,
  maxSelections = 1,
  onSelectionChange,
  onSelect,
}: SeatMapProps) {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null)

  // Group seats by row
  const seatsByRow = useMemo(() => {
    const grouped: Record<string, Seat[]> = {}
    seats.forEach(seat => {
      if (!grouped[seat.rowLabel]) grouped[seat.rowLabel] = []
      grouped[seat.rowLabel].push(seat)
    })
    // Sort seats within each row by seat number
    Object.keys(grouped).forEach(row => {
      grouped[row].sort((a, b) => a.seatNumber - b.seatNumber)
    })
    return grouped
  }, [seats])

  const rows = useMemo(() => {
    return Object.keys(seatsByRow).sort()
  }, [seatsByRow])

  const maxSeatsInRow = useMemo(() => {
    return Math.max(...rows.map(r => seatsByRow[r].length), 0)
  }, [rows, seatsByRow])

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSeatClick = (seat: Seat) => {
    if (!interactive) return
    if (seat.status === 'sold' || seat.status === 'locked' || seat.status === 'reserved') {
      toast.error(`Kursi ${seat.seatLabel} tidak tersedia`)
      return
    }

    const isSelected = selectedSeats.find(s => s.id === seat.id)
    let newSelection: Seat[]

    if (isSelected) {
      newSelection = selectedSeats.filter(s => s.id !== seat.id)
    } else {
      if (selectedSeats.length >= maxSelections) {
        toast.warning(`Maksimal ${maxSelections} kursi per transaksi`)
        return
      }
      newSelection = [...selectedSeats, seat]
    }

    setSelectedSeats(newSelection)
    onSelectionChange?.(newSelection)

    if (!isSelected) {
      toast.success(`Kursi ${seat.seatLabel} dipilih`)
    }
  }

  const handleConfirm = () => {
    if (selectedSeats.length === 0) {
      toast.warning('Pilih kursi terlebih dahulu')
      return
    }
    onSelect?.(selectedSeats[0])
    toast.success(`Kursi ${selectedSeats.map(s => s.seatLabel).join(', ')} dikonfirmasi!`)
  }

  const handleClear = () => {
    setSelectedSeats([])
    onSelectionChange?.([])
  }

  // ─── Seat Size Calculation ──────────────────────────────────────────────

  // Dynamic seat sizing based on seats per row
  const seatSize = useMemo(() => {
    if (compact) return 'w-7 h-7 text-[8px]'
    if (maxSeatsInRow <= 20) return 'w-10 h-10 text-[10px]'
    if (maxSeatsInRow <= 50) return 'w-8 h-8 text-[9px]'
    if (maxSeatsInRow <= 100) return 'w-7 h-7 text-[8px]'
    return 'w-6 h-6 text-[7px]'
  }, [compact, maxSeatsInRow])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Stage indicator */}
      {showStage && config.zoneType === 'seated' && (
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-b-2xl bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border border-t-0 border-primary/30">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase"> panggung / stage </span>
          </div>
        </div>
      )}

      {showStage && config.zoneType === 'standing' && (
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-b-2xl bg-gradient-to-r from-gold/20 via-gold/30 to-gold/20 border border-t-0 border-gold/30">
            <span className="text-xs font-semibold text-gold tracking-widest uppercase"> standing area </span>
          </div>
        </div>
      )}

      {/* Seat Grid */}
      {config.zoneType === 'seated' && (
        <div className="space-y-0.5">
          {rows.map((rowLabel, rowIdx) => (
            <div key={rowLabel} className="flex items-center gap-1">
              {/* Row label */}
              {!compact && (
                <div className="w-6 shrink-0 text-[10px] font-mono text-muted-foreground text-right pr-1">
                  {rowLabel}
                </div>
              )}

              {/* Seats */}
              <div className="flex flex-wrap gap-[2px] justify-center flex-1">
                {seatsByRow[rowLabel].map((seat) => {
                  const isSelected = selectedSeats.find(s => s.id === seat.id)
                  const isHovered = hoveredSeat?.id === seat.id

                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={() => setHoveredSeat(seat)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      disabled={!interactive || seat.status === 'sold' || seat.status === 'locked' || seat.status === 'reserved'}
                      className={cn(
                        'rounded-sm border flex items-center justify-center font-mono transition-all duration-100 select-none',
                        seatSize,
                        // Status-based styling
                        seat.status === 'available' && !isSelected && getSeatColor('available'),
                        seat.status === 'sold' && getSeatColor('sold'),
                        seat.status === 'reserved' && getSeatColor('reserved'),
                        seat.status === 'locked' && getSeatColor('locked'),
                        // Selected override
                        isSelected && 'bg-blue-500/50 border-blue-400 ring-1 ring-blue-400 text-blue-100 scale-105',
                        // Hover
                        isHovered && interactive && seat.status === 'available' && !isSelected && 'scale-110 ring-1 ring-white/20',
                        // Cursor
                        interactive && seat.status === 'available' && 'cursor-pointer',
                        !interactive && 'cursor-default',
                      )}
                      title={`${seat.seatLabel} — ${getStatusLabel(seat.status)}`}
                    >
                      {!compact || maxSeatsInRow <= 30 ? seat.seatLabel : seat.seatNumber}
                    </button>
                  )
                })}
              </div>

              {/* Row label (right side for larger maps) */}
              {!compact && maxSeatsInRow > 50 && (
                <div className="w-6 shrink-0 text-[10px] font-mono text-muted-foreground text-left pl-1">
                  {rowLabel}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Standing Zone Grid */}
      {config.zoneType === 'standing' && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {seats.map((seat) => {
            const isSelected = selectedSeats.find(s => s.id === seat.id)
            return (
              <button
                key={seat.id}
                onClick={() => handleSeatClick(seat)}
                disabled={!interactive || seat.status === 'sold'}
                className={cn(
                  'rounded-xl border-2 p-4 text-center transition-all duration-100',
                  seat.status === 'available' && !isSelected && 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30',
                  seat.status === 'sold' && 'bg-red-500/15 border-red-500/30 text-red-400/60',
                  seat.status === 'reserved' && 'bg-amber-500/20 border-amber-500/40',
                  isSelected && 'bg-blue-500/30 border-blue-400 ring-1 ring-blue-400',
                  interactive && seat.status === 'available' && 'cursor-pointer hover:scale-[1.02]',
                )}
              >
                <div className={cn(
                  'text-lg font-bold',
                  isSelected ? 'text-blue-300' : seat.status === 'sold' ? 'text-red-400/50' : 'text-emerald-300'
                )}>
                  {seat.seatLabel}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {getStatusLabel(seat.status)}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Free / GA */}
      {config.zoneType === 'free' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎵</div>
          <p className="text-sm text-muted-foreground">
            General Admission — bebas memilih posisi dalam area
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tidak ada kursi bernomor
          </p>
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className={cn('w-3.5 h-3.5 rounded-sm', 'bg-emerald-500/30 border border-emerald-500/40')} />
            <span className="text-[10px] text-muted-foreground">Tersedia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-3.5 h-3.5 rounded-sm', 'bg-amber-500/30 border border-amber-500/40')} />
            <span className="text-[10px] text-muted-foreground">Dipesan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-3.5 h-3.5 rounded-sm', 'bg-red-500/20 border border-red-500/30')} />
            <span className="text-[10px] text-muted-foreground">Terjual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-3.5 h-3.5 rounded-sm', 'bg-gray-500/20 border border-gray-500/30')} />
            <span className="text-[10px] text-muted-foreground">Dikunci</span>
          </div>
          {interactive && (
            <div className="flex items-center gap-1.5">
              <div className={cn('w-3.5 h-3.5 rounded-sm', 'bg-blue-500/50 border border-blue-400 ring-1 ring-blue-400')} />
              <span className="text-[10px] text-muted-foreground">Pilihanmu</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive Controls */}
      {interactive && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {selectedSeats.length > 0 ? (
              <span>
                Dipilih: <span className="font-semibold text-foreground">{selectedSeats.map(s => s.seatLabel).join(', ')}</span>
              </span>
            ) : (
              <span>Klik kursi untuk memilih</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedSeats.length > 0 && (
              <>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleClear}>
                  <X className="h-3 w-3 mr-1" />
                  Batal
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1" onClick={handleConfirm}>
                  <Check className="h-3 w-3" />
                  Konfirmasi
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hovered seat tooltip (compact) */}
      {compact && hoveredSeat && interactive && (
        <div className="text-xs text-muted-foreground text-center">
          {hoveredSeat.seatLabel} — {getStatusLabel(hoveredSeat.status)}
        </div>
      )}
    </div>
  )
}
