'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useOrganizerTickets, useOrganizerWristbandInventory, useCounterScan } from '@/hooks/use-api'
import { useCurrentEventSlug } from '@/hooks/use-current-event'
import { formatRupiah } from '@/lib/utils'

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Aktif</Badge>
    case 'redeemed':
      return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Diredeem</Badge>
    case 'inside':
      return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">Di Dalam Venue</Badge>
    case 'cancelled':
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/20">Dibatalkan</Badge>
    default:
      return <Badge className="bg-gray-500/15 text-gray-400 border-gray-500/20">{status}</Badge>
  }
}

export function RedeemPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [foundTicket, setFoundTicket] = useState<Record<string, unknown> | null>(null)
  const [wristbandInput, setWristbandInput] = useState('')

  const eventSlug = useCurrentEventSlug()
  const { data: ticketsData, isLoading: ticketsLoading } = useOrganizerTickets(eventSlug)
  const { data: wristbandData, isLoading: wristbandLoading } = useOrganizerWristbandInventory(eventSlug)
  const scanMutation = useCounterScan()

  const tickets = ((ticketsData as { data: unknown[] } | undefined)?.data ?? []) as Record<string, unknown>[]
  const wristbandInventory = ((wristbandData as { inventory: unknown[] } | undefined)?.inventory ?? []) as Record<string, unknown>[]

  const todayStats = (() => {
    const redeemed = tickets.filter((t) => String(t.status) === 'redeemed' || String(t.status) === 'inside')
    const unused = wristbandInventory.reduce((sum, w) => sum + ((w.remainingStock as number) ?? 0), 0)
    return {
      totalRedeemed: redeemed.length,
      wristbandsRemaining: unused,
      floorRedeemed: redeemed.filter((t) => String(t.tier) === 'floor').length,
      tribunRedeemed: redeemed.filter((t) => String(t.tier) === 'tribun').length,
    }
  })()

  const handleSearch = async () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      toast.error('Masukkan kode tiket terlebih dahulu')
      return
    }

    try {
      const { publicApi } = await import('@/lib/api')
      const checkResult = await publicApi.checkTicket(trimmed)

      if (checkResult.found && checkResult.ticket) {
        setFoundTicket(checkResult.ticket as unknown as Record<string, unknown>)
        const wb = `WB-${String(Math.floor(10000 + Math.random() * 90000)).padStart(5, '0')}`
        setWristbandInput(wb)
      } else {
        setFoundTicket(null)
        toast.error('Tiket tidak ditemukan')
      }
    } catch {
      setFoundTicket(null)
      toast.error('Tiket tidak ditemukan')
    }
  }

  const handleRedeem = async () => {
    if (!foundTicket) return
    const status = String(foundTicket.status)
    if (status === 'redeemed' || status === 'inside') {
      toast.error('Tiket ini sudah diredeem sebelumnya')
      return
    }
    if (status === 'cancelled') {
      toast.error('Tiket ini sudah dibatalkan')
      return
    }

    try {
      await scanMutation.mutateAsync({
        ticketCode: String(foundTicket.ticketCode),
        counterId: '',
        wristbandCode: wristbandInput,
      })
      toast.success('Gelang berhasil ditukarkan!', {
        description: `${String(foundTicket.ticketCode)} → ${wristbandInput}`,
      })
      setFoundTicket(null)
      setSearchQuery('')
      setWristbandInput('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menukar gelang'
      toast.error('Gagal menukar gelang', { description: message })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  if (ticketsLoading || wristbandLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Penukaran Gelang</h1>
        <p className="text-muted-foreground mt-1">
          Stasiun Penukaran — Scan atau masukkan kode tiket secara manual
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Scanner + Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Section */}
          <Card className="overflow-hidden bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
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

              <Separator className="bg-accent" />

              {/* Manual Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Masukkan kode tiket (cth: SHL-JKT-VIPZON-0001)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
                <Button onClick={handleSearch} className="gap-2 min-w-[100px] bg-primary hover:bg-primary/90 text-foreground">
                  <Search className="h-4 w-4" />
                  Cari
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Info Card */}
          {foundTicket && (
            <Card className="bg-card border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-foreground">Detail Tiket</h3>
                  {getStatusBadge(String(foundTicket.status))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <Ticket className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Kode Tiket</p>
                      <p className="font-mono font-semibold text-sm text-foreground">{String(foundTicket.ticketCode)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <User className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nama Peserta</p>
                      <p className="font-semibold text-sm text-foreground">{String(foundTicket.attendeeName)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <Tag className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipe Tiket</p>
                      <p className="font-semibold text-sm text-foreground">{String(foundTicket.ticketTypeName ?? foundTicket.ticketType)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Zona</p>
                      <p className="font-semibold text-sm text-foreground capitalize">{String(foundTicket.tier ?? '-')}</p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-accent" />

                {/* Already redeemed warning */}
                {(String(foundTicket.status) === 'redeemed' || String(foundTicket.status) === 'inside') && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-400">Sudah Diredeem</p>
                      <p className="text-sm text-red-300/80">
                        Tiket ini sudah ditukarkan dengan gelang{' '}
                        <span className="font-mono font-semibold">{String(foundTicket.wristbandCode ?? '-')}</span>
                        {foundTicket.redeemedAt != null && (
                          <span>
                            {' '}pada{' '}
                            {new Date(String(foundTicket.redeemedAt)).toLocaleTimeString('id-ID')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Active ticket: wristband pairing */}
                {String(foundTicket.status) === 'active' && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                      <CircleDot className="h-4 w-4 text-primary" />
                      Pasangkan Gelang
                    </h4>
                    <div className="flex gap-2">
                      <Input
                        value={wristbandInput}
                        onChange={(e) => setWristbandInput(e.target.value)}
                        placeholder="Scan kode gelang..."
                        className="font-mono bg-background border-input text-foreground placeholder:text-muted-foreground/50"
                      />
                      <Button
                        onClick={handleRedeem}
                        disabled={scanMutation.isPending}
                        className="gap-2 bg-primary hover:bg-primary/90 text-foreground min-w-[140px]"
                      >
                        {scanMutation.isPending ? 'Memproses...' : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Tukar Gelang
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scan barcode gelang atau masukkan kode secara manual
                    </p>
                  </div>
                )}

                {/* Cancelled */}
                {String(foundTicket.status) === 'cancelled' && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-400">Tiket Dibatalkan</p>
                      <p className="text-sm text-red-300/80">
                        Tiket ini sudah dibatalkan dan tidak dapat ditukarkan
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!foundTicket && (
            <Card className="bg-card border-dashed border-input">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Ticket className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Scan QR code atau masukkan kode tiket untuk melihat detail
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Today's Stats */}
        <div className="space-y-4">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Statistik Hari Ini
          </h3>

          <Card className="bg-gradient-to-br from-primary to-primary/70 text-foreground border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-foreground/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground/80">Total Diredeem</p>
                  <p className="text-2xl font-bold">{todayStats.totalRedeemed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-400 border border-amber-500/15">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <CircleDot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-amber-300/70">Sisa Gelang</p>
                  <p className="text-2xl font-bold">{todayStats.wristbandsRemaining.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Floor Zone Diredeem</p>
                  <p className="text-2xl font-bold text-foreground">{todayStats.floorRedeemed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tribun Zone Diredeem</p>
                  <p className="text-2xl font-bold text-foreground">{todayStats.tribunRedeemed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
