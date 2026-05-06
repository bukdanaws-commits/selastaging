// ─── SEAT MANAGEMENT DATA LAYER ─────────────────────────────────────────────
// Dynamic, flexible seat configuration per ticket tier
// Admin can configure layout for any venue through the dashboard

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type ZoneType = 'seated' | 'standing' | 'free'
export type SeatStatus = 'available' | 'reserved' | 'sold' | 'locked'
export type SeatSelectionMode = 'seat_selection' | 'auto_assign' | 'both'

export interface SeatConfig {
  tierId: string
  tierName: string
  emoji: string
  zoneType: ZoneType
  // Seated config
  totalRows: number       // number of rows (e.g. 10)
  seatsPerRow: number     // seats per row (e.g. 20)
  rowPrefix: string       // prefix for row labels ("A", "B", "AA", "AB")
  rowDelimiter: string    // delimiter between row and seat number ("", "-")
  seatNumberStart: number  // seat numbering starts from this (default: 1)
  // Standing config
  totalZones: number      // number of zones for standing
  // Common
  gate: string            // assigned gate for entry
  price: number
  quota: number
  sold: number
  // Hybrid seat selection mode
  seatSelectionMode: SeatSelectionMode  // 'seat_selection' | 'auto_assign' | 'both'
}

export interface Seat {
  id: string
  tierId: string
  rowLabel: string        // "A", "B", "AA" or "Zone" for standing
  seatNumber: number      // 1, 2, 3... or zone number
  seatLabel: string       // "A1", "A2", "B15" or "Zone 1"
  status: SeatStatus
  reservedAt?: string
  reservedBy?: string
  orderId?: string
}

export interface SeatStats {
  total: number
  available: number
  reserved: number
  sold: number
  locked: number
}

export interface SeatSelection {
  tierId: string
  tierName: string
  seat: Seat
  mode: 'seat_selection' | 'auto_assign'
}

// ─── DEFAULT SEAT CONFIGS ────────────────────────────────────────────────────
// Pre-configured for GBK Madya Stadium — admin can modify these

export const defaultSeatConfigs: SeatConfig[] = [
  {
    tierId: 'tt-vvip',
    tierName: 'VVIP PIT',
    emoji: '👑',
    zoneType: 'seated',
    totalRows: 15,
    seatsPerRow: 20,
    rowPrefix: 'V',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 0,
    gate: 'VIP Gate',
    price: 3500000,
    quota: 300,
    sold: 247,
    seatSelectionMode: 'seat_selection',  // Premium → pilih sendiri
  },
  {
    tierId: 'tt-vip',
    tierName: 'VIP ZONE',
    emoji: '⭐',
    zoneType: 'seated',
    totalRows: 20,
    seatsPerRow: 25,
    rowPrefix: 'P',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 0,
    gate: 'VIP Gate',
    price: 2800000,
    quota: 500,
    sold: 412,
    seatSelectionMode: 'seat_selection',  // Premium → pilih sendiri
  },
  {
    tierId: 'tt-festival',
    tierName: 'FESTIVAL',
    emoji: '🎵',
    zoneType: 'standing',
    totalRows: 0,
    seatsPerRow: 0,
    rowPrefix: '',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 15,
    gate: 'Gate A',
    price: 2200000,
    quota: 3000,
    sold: 2150,
    seatSelectionMode: 'seat_selection',  // Standing → pilih zone
  },
  {
    tierId: 'tt-cat1',
    tierName: 'CAT 1',
    emoji: '🎟️',
    zoneType: 'seated',
    totalRows: 20,
    seatsPerRow: 100,
    rowPrefix: 'A',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 0,
    gate: 'Gate B',
    price: 1750000,
    quota: 2000,
    sold: 1780,
    seatSelectionMode: 'both',  // Mid-tier → pilih sendiri atau auto
  },
  {
    tierId: 'tt-cat2',
    tierName: 'CAT 2',
    emoji: '🎫',
    zoneType: 'seated',
    totalRows: 30,
    seatsPerRow: 100,
    rowPrefix: 'B',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 0,
    gate: 'Gate B',
    price: 1400000,
    quota: 3000,
    sold: 2410,
    seatSelectionMode: 'both',  // Mid-tier → pilih sendiri atau auto
  },
  {
    tierId: 'tt-cat3',
    tierName: 'CAT 3',
    emoji: '🎫',
    zoneType: 'seated',
    totalRows: 30,
    seatsPerRow: 100,
    rowPrefix: 'C',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 0,
    gate: 'Gate C',
    price: 1100000,
    quota: 3000,
    sold: 1950,
    seatSelectionMode: 'auto_assign',  // Lower → auto assign
  },
  {
    tierId: 'tt-cat4',
    tierName: 'CAT 4',
    emoji: '🎟️',
    zoneType: 'seated',
    totalRows: 40,
    seatsPerRow: 100,
    rowPrefix: 'D',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 0,
    gate: 'Gate C',
    price: 850000,
    quota: 4000,
    sold: 2680,
    seatSelectionMode: 'auto_assign',  // Lower → auto assign
  },
  {
    tierId: 'tt-cat5',
    tierName: 'CAT 5',
    emoji: '🎟️',
    zoneType: 'seated',
    totalRows: 30,
    seatsPerRow: 100,
    rowPrefix: 'E',
    rowDelimiter: '',
    seatNumberStart: 1,
    totalZones: 0,
    gate: 'Gate D',
    price: 550000,
    quota: 3000,
    sold: 1520,
    seatSelectionMode: 'auto_assign',  // Lower → auto assign
  },
]

// ─── SEAT GENERATION ─────────────────────────────────────────────────────────

function generateRowLabel(prefix: string, rowIndex: number): string {
  if (!prefix) return ''
  // For single letter prefix: A, B, C... Z, AA, AB, AC...
  const base = prefix.charCodeAt(0) - 65
  const letterIndex = base + rowIndex
  if (letterIndex < 26) {
    return String.fromCharCode(65 + letterIndex)
  }
  // Double letter
  const first = String.fromCharCode(65 + Math.floor(letterIndex / 26) - 1)
  const second = String.fromCharCode(65 + (letterIndex % 26))
  return first + second
}

export function generateSeats(config: SeatConfig): Seat[] {
  const seats: Seat[] = []

  if (config.zoneType === 'seated') {
    for (let row = 0; row < config.totalRows; row++) {
      const rowLabel = generateRowLabel(config.rowPrefix, row)
      for (let seat = 0; seat < config.seatsPerRow; seat++) {
        const seatNum = config.seatNumberStart + seat
        const seatLabel = config.rowDelimiter
          ? `${rowLabel}${config.rowDelimiter}${seatNum}`
          : `${rowLabel}${seatNum}`

        seats.push({
          id: `seat-${config.tierId}-${rowLabel}-${seatNum}`,
          tierId: config.tierId,
          rowLabel,
          seatNumber: seatNum,
          seatLabel,
          status: 'available',
        })
      }
    }
  } else if (config.zoneType === 'standing') {
    for (let z = 1; z <= config.totalZones; z++) {
      seats.push({
        id: `seat-${config.tierId}-zone-${z}`,
        tierId: config.tierId,
        rowLabel: 'Zone',
        seatNumber: z,
        seatLabel: `Zone ${z}`,
        status: 'available',
      })
    }
  }
  // 'free' type = no seats generated

  return seats
}

// ─── MOCK SOLD SEATS ────────────────────────────────────────────────────────
// Simulate some seats being sold based on config.sold percentage

export function generateMockSeats(config: SeatConfig): Seat[] {
  const seats = generateSeats(config)
  const totalGenerated = seats.length
  if (totalGenerated === 0) return []

  const soldCount = Math.min(config.sold, totalGenerated)
  const soldPercentage = soldCount / totalGenerated

  // Deterministic "random" based on tierId
  let seed = 0
  for (let i = 0; i < config.tierId.length; i++) {
    seed = ((seed << 5) - seed + config.tierId.charCodeAt(i)) | 0
  }

  const soldSeats = seats.map((seat, i) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const random = (seed % 1000) / 1000

    let status: SeatStatus = 'available'
    if (random < soldPercentage * 0.92) {
      status = 'sold'
    } else if (random < soldPercentage) {
      status = 'reserved'
    }

    // Also add some locked seats (held by system)
    if (i === 0 || i === 1) status = 'locked'

    return {
      ...seat,
      status,
      ...(status === 'sold' ? {
        orderId: `ord- sold-${config.tierId}-${i}`,
      } : {}),
    }
  })

  return soldSeats
}

// ─── SEAT STATS ──────────────────────────────────────────────────────────────

export function getSeatStats(seats: Seat[]): SeatStats {
  return {
    total: seats.length,
    available: seats.filter(s => s.status === 'available').length,
    reserved: seats.filter(s => s.status === 'reserved').length,
    sold: seats.filter(s => s.status === 'sold').length,
    locked: seats.filter(s => s.status === 'locked').length,
  }
}

// ─── SEAT MAP HELPERS ───────────────────────────────────────────────────────

export function getSeatColor(status: SeatStatus): string {
  switch (status) {
    case 'available': return 'bg-emerald-500/30 hover:bg-emerald-500/50 border-emerald-500/40 text-emerald-300'
    case 'reserved': return 'bg-amber-500/30 border-amber-500/40 text-amber-300'
    case 'sold': return 'bg-red-500/20 border-red-500/30 text-red-400/60'
    case 'locked': return 'bg-gray-500/20 border-gray-500/30 text-gray-500/60'
    default: return 'bg-muted border-border text-muted-foreground'
  }
}

export function getSeatDotColor(status: SeatStatus): string {
  switch (status) {
    case 'available': return 'bg-emerald-500'
    case 'reserved': return 'bg-amber-500'
    case 'sold': return 'bg-red-500'
    case 'locked': return 'bg-gray-500'
    default: return 'bg-muted-foreground'
  }
}

export function getStatusLabel(status: SeatStatus): string {
  switch (status) {
    case 'available': return 'Tersedia'
    case 'reserved': return 'Dipesan'
    case 'sold': return 'Terjual'
    case 'locked': return 'Dikunci'
    default: return status
  }
}

export function getZoneTypeLabel(type: ZoneType): string {
  switch (type) {
    case 'seated': return 'Kursi Bernomor'
    case 'standing': return 'Standing Zone'
    case 'free': return 'General Admission'
    default: return type
  }
}

// ─── AUTO-ASSIGN ALGORITHM ─────────────────────────────────────────────────
// Best available: closest to center, lowest row number

export function autoAssignSeat(seats: Seat[]): Seat | null {
  const available = seats.filter(s => s.status === 'available')
  if (available.length === 0) return null

  // Sort by: row index (asc), then distance from center (asc)
  const sorted = [...available].sort((a, b) => {
    // Same row: prefer center seats
    if (a.rowLabel === b.rowLabel) {
      return Math.abs(a.seatNumber - 50) - Math.abs(b.seatNumber - 50)
    }
    // Lower row = closer to stage
    return a.rowLabel.localeCompare(b.rowLabel)
  })

  return sorted[0]
}

export function getSelectionModeLabel(mode: SeatSelectionMode): string {
  switch (mode) {
    case 'seat_selection': return 'Pilih Kursi'
    case 'auto_assign': return 'Auto Assign'
    case 'both': return 'Pilih / Auto'
    default: return mode
  }
}

// ─── COMPUTED TOTAL FROM CONFIG ─────────────────────────────────────────────

export function getComputedTotal(config: SeatConfig): number {
  if (config.zoneType === 'seated') {
    return config.totalRows * config.seatsPerRow
  } else if (config.zoneType === 'standing') {
    return config.totalZones
  }
  return config.quota // 'free' uses quota as-is
}
