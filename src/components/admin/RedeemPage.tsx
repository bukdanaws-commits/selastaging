'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useOrganizerTickets, useOrganizerWristbandInventory } from '@/hooks/use-api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  QrCode,
  Search,
  Ticket,
  User,
  Tag,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  ArrowRight,
} from 'lucide-react'

// ─── LOCAL TYPES ──────────────────────────────────────────────────────────────

type TicketRecord = {
  id: string
  ticketCode: string
  attendeeName: string
  ticketTypeName: string
  zone: string
  status: 'active' | 'redeemed' | 'inside_venue' | 'cancelled'
  wristbandCode: string | null
  redeemedBy: string | null
  redeemedAt: string | null
}

function generateWristbandCode(): string {
  return `WB-${String(Math.floor(10000 + Math.random() * 90000)).padStart(5, '0')}`
}

function getStatusBadge(status: TicketRecord['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
    case 'redeemed':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Diredeem</Badge>
    case 'inside_venue':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Di Dalam Venue</Badge>
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Dibatalkan</Badge>
  }
}

export function RedeemPage() {
  const { data: ticketsData, isLoading, error } = useOrganizerTickets('')
  const { data: inventoryData } = useOrganizerWristbandInventory('')
  const mockTickets: TicketRecord[] = (ticketsData as any)?.data ?? (ticketsData as any) ?? []
  const wristbandStats: any = inventoryData ?? { unused: 0, used: 0, total: 0 }

  const [searchQuery, setSearchQuery] = useState('')
  const [foundTicket, setFoundTicket] = useState<TicketRecord | null>(null)
  const [wristbandInput, setWristbandInput] = useState('')
  const [redeemedTickets, setRedeemedTickets] = useState<Set<string>>(new Set())

  const todayStats = useMemo(() => {
    const redeemed = mockTickets.filter(
      (t) => t.status === 'redeemed' || t.status === 'inside_venue'
    )
    return {
      totalRedeemed: redeemed.length,
      wristbandsRemaining: wristbandStats.unused,
      floorRedeemed: redeemed.filter((t) => t.zone === 'floor').length,
      tribunRedeemed: redeemed.filter((t) => t.zone === 'tribun').length,
    }
  }, [mockTickets, wristbandStats.unused])

  const handleSearch = () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      toast.error('Masukkan kode tiket terlebih dahulu')
      return
    }
    const ticket = mockTickets.find(
      (t) => t.ticketCode.toLowerCase() === trimmed.toLowerCase()
    )
    if (!ticket) {
      setFoundTicket(null)
      toast.error('Tiket tidak ditemukan')
      return
    }
    setFoundTicket(ticket)
    const wb = generateWristbandCode()
    setWristbandInput(wb)
  }

  const handleRedeem = () => {
    if (!foundTicket) return
    if (foundTicket.status === 'redeemed' || foundTicket.status === 'inside_venue') {
      toast.error('Tiket ini sudah diredeem sebelumnya')
      return
    }
    if (foundTicket.status === 'cancelled') {
      toast.error('Tiket ini sudah dibatalkan')
      return
    }
    setRedeemedTickets((prev) => new Set(prev).add(foundTicket.ticketCode))
    toast.success('Gelang berhasil ditukarkan!', {
      description: `${foundTicket.ticketCode} → ${wristbandInput}`,
    })
    setFoundTicket({
      ...foundTicket,
      status: 'redeemed',
      wristbandCode: wristbandInput,
      redeemedBy: 'andi.redeem@event.id',
      redeemedAt: new Date().toISOString(),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Penukaran Gelang</h1>
        <p className="text-muted-foreground mt-1">
          Stasiun Gate A — Scan atau masukkan kode tiket secara manual
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Scanner + Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Section */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5 text-primary" />
                Scanner QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mock QR Scan Area */}
              <div className="relative flex items-center justify-center h-48 md:h-64 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-4 border-primary/40 rounded-xl flex items-center justify-center">
                    <div className="w-24 h-24 border-2 border-primary/20 rounded-lg flex items-center justify-center">
                      <QrCode className="h-10 w-10 text-primary/30" />
                    </div>
                  </div>
                </div>
                <p className="absolute bottom-3 text-sm text-primary/70 font-medium">
                  Arahkan QR Code ke scanner
                </p>
              </div>

              <Separator />

              {/* Manual Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Masukkan kode tiket (cth: TKT-000001)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} className="gap-2 min-w-[100px]">
                  <Search className="h-4 w-4" />
                  Cari
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Info Card */}
          {foundTicket && (
            <Card className="border-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Detail Tiket</h3>
                  {getStatusBadge(foundTicket.status)}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Ticket className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Kode Tiket</p>
                      <p className="font-mono font-semibold text-sm">{foundTicket.ticketCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nama Peserta</p>
                      <p className="font-semibold text-sm">{foundTicket.attendeeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Tag className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipe Tiket</p>
                      <p className="font-semibold text-sm">{foundTicket.ticketTypeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Zona</p>
                      <p className="font-semibold text-sm capitalize">{foundTicket.zone}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Already redeemed warning */}
                {(foundTicket.status === 'redeemed' || foundTicket.status === 'inside_venue') && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">Sudah Diredeem</p>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Tiket ini sudah ditukarkan dengan gelang{' '}
                        <span className="font-mono font-semibold">{foundTicket.wristbandCode}</span>
                        {foundTicket.redeemedAt && (
                          <span>
                            {' '}pada{' '}
                            {new Date(foundTicket.redeemedAt).toLocaleTimeString('id-ID')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Active ticket: wristband pairing */}
                {foundTicket.status === 'active' && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-primary" />
                      Pasangkan Gelang
                    </h4>
                    <div className="flex gap-2">
                      <Input
                        value={wristbandInput}
                        onChange={(e) => setWristbandInput(e.target.value)}
                        placeholder="Scan kode gelang..."
                        className="font-mono"
                      />
                      <Button onClick={handleRedeem} className="gap-2 bg-primary hover:bg-primary/90 min-w-[140px]">
                        <CheckCircle2 className="h-4 w-4" />
                        Tukar Gelang
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scan barcode gelang atau masukkan kode secara manual
                    </p>
                  </div>
                )}

                {/* Cancelled */}
                {foundTicket.status === 'cancelled' && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">Tiket Dibatalkan</p>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Tiket ini sudah dibatalkan dan tidak dapat ditukarkan
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!foundTicket && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Ticket className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Scan QR code atau masukkan kode tiket untuk melihat detail
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Today's Stats */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Statistik Hari Ini
          </h3>

          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-white/70">Total Diredeem</p>
                  <p className="text-2xl font-bold">{todayStats.totalRedeemed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <CircleDot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-white/70">Sisa Gelang</p>
                  <p className="text-2xl font-bold">{todayStats.wristbandsRemaining.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Floor Zone Diredeem</p>
                  <p className="text-2xl font-bold">{todayStats.floorRedeemed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tribun Zone Diredeem</p>
                  <p className="text-2xl font-bold">{todayStats.tribunRedeemed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
