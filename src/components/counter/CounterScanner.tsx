'use client'

import { useState } from 'react'
import {
  ScanLine,
  Camera,
  Keyboard,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Ticket,
  MapPin,
  CircleDollarSign,
  Watch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { useCounterScan, useCounterStatus, useCounterRedemptions } from '@/hooks/use-api'
import type { IRedeemTicketResponse } from '@/lib/types'

interface ScanResult {
  ticketCode: string
  attendeeName: string
  ticketType: string
  wristbandColor: string
  wristbandColorHex: string
  wristbandType: string
  wristbandCode: string
  seatLabel: string | null
  price: number
}

export function CounterScanner() {
  const [ticketCode, setTicketCode] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [notFound, setNotFound] = useState(false)

  const scanMutation = useCounterScan()
  const { data: statusData } = useCounterStatus()
  const { data: redemptionsData } = useCounterRedemptions()

  // Extract counter info from status
  const counterInfo = statusData?.counter as Record<string, unknown> | undefined
  const statsInfo = statusData?.stats as Record<string, unknown> | undefined

  const todayRedemptions = (redemptionsData as { data: unknown[] } | undefined)?.data?.length ?? 0
  const counterName = (counterInfo?.name as string) ?? 'Counter'
  const isActive = (counterInfo?.status as string) === 'active'

  const handleLookup = async () => {
    if (!ticketCode.trim()) return

    setNotFound(false)
    setResult(null)

    try {
      // First we scan (lookup) the ticket - use scanAndRedeem but we'll just look it up first
      // Actually we need a check first, then redeem on confirm
      // The counter scan endpoint does both check+redeem, so we use checkTicket first
      const { publicApi } = await import('@/lib/api')
      const checkResult = await publicApi.checkTicket(ticketCode.trim())

      if (checkResult.found && checkResult.ticket) {
        const t = checkResult.ticket
        setResult({
          ticketCode: t.ticketCode,
          attendeeName: t.attendeeName,
          ticketType: t.ticketTypeName,
          wristbandColor: t.wristbandColor ?? '',
          wristbandColorHex: '',
          wristbandType: '',
          wristbandCode: '',
          seatLabel: t.seatLabel ?? '',
          price: t.price,
        })
        setNotFound(false)
      } else {
        setNotFound(true)
        toast.error('Tiket tidak ditemukan', {
          description: `Kode "${ticketCode}" tidak terdaftar dalam sistem.`,
        })
      }
    } catch (err) {
      setNotFound(true)
      toast.error('Tiket tidak ditemukan', {
        description: `Kode "${ticketCode}" tidak terdaftar dalam sistem.`,
      })
    }
  }

  const handleRedeem = async () => {
    if (!result) return

    try {
      // Generate a wristband code
      const wbCode = `WB-${String(Math.floor(10000 + Math.random() * 90000)).padStart(5, '0')}`
      const counterId = (counterInfo?.id as string) ?? ''

      const redeemResult = await scanMutation.mutateAsync({
        ticketCode: result.ticketCode,
        counterId,
        wristbandCode: wbCode,
      })

      const resp = redeemResult as IRedeemTicketResponse
      toast.success('Gelang berhasil ditukar!', {
        description: `${resp.attendeeName} — ${wbCode} (${resp.wristbandColor})`,
      })

      setResult(null)
      setTicketCode('')
      setNotFound(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menukar gelang'
      toast.error('Gagal menukar gelang', { description: message })
    }
  }

  const handleReject = () => {
    if (!result) return

    toast.warning('Tiket ditolak', {
      description: `Penukaran untuk ${result.attendeeName} dibatalkan.`,
    })

    setResult(null)
    setTicketCode('')
    setNotFound(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLookup()
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto w-full">
      {/* ── Today's Quick Stats ── */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-card border-border/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Dituksr Hari Ini
            </p>
            <p className="text-xl font-bold text-primary mt-1">
              {todayRedemptions}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Counter
            </p>
            <p className="text-xl font-bold text-foreground mt-1">{counterName}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Status
            </p>
            <Badge className={cn('text-[10px] mt-1.5', isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400')}>
              {isActive ? '● Aktif' : 'Nonaktif'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* ── Scan Viewfinder (Simulated) ── */}
      <Card className="bg-card border-border/30 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="h-4 w-4 text-primary" />
            Pindai Kode QR Tiket
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {/* Simulated camera viewfinder */}
          <div className="relative w-full aspect-[4/3] max-w-sm bg-black/60 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-3 border-l-3 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-3 border-r-3 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-3 border-l-3 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-3 border-r-3 border-primary rounded-br-lg" />

            {/* Crosshair */}
            <div className="flex flex-col items-center gap-2 text-primary/50">
              <ScanLine className="h-8 w-8 animate-pulse" />
              <p className="text-xs font-medium">
                {scanMutation.isPending ? 'Memindai...' : 'Arahkan QR ke area ini'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Scanner kamera dalam mode demo
              </p>
            </div>

            {/* Scan line animation */}
            {scanMutation.isPending && (
              <div className="absolute inset-x-4 top-0 h-0.5 bg-primary animate-[scanLine_1.5s_ease-in-out_infinite]" />
            )}
          </div>

          {/* Manual Input */}
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                Atau input kode tiket secara manual:
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Contoh: SHL-JKT-VVIPIP-0001"
                className="font-mono text-sm bg-background border-border/50 focus:border-primary"
                disabled={scanMutation.isPending}
              />
              <Button
                onClick={handleLookup}
                disabled={!ticketCode.trim() || scanMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                {scanMutation.isPending ? (
                  <RotateCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Result Panel ── */}
      {result && (
        <Card className="bg-card border-primary/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Tiket Ditemukan
              </CardTitle>
              <Badge
                variant="outline"
                className="font-mono text-[10px] border-border/50"
              >
                {result.ticketCode}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Attendee Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">
                    {result.attendeeName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.ticketType}
                  </p>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Ticket Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tipe Tiket</p>
                    <p className="text-xs font-medium text-foreground">
                      {result.ticketType}
                    </p>
                  </div>
                </div>
                {result.seatLabel && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Kursi</p>
                      <p className="text-xs font-medium text-foreground">
                        {result.seatLabel}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Harga</p>
                    <p className="text-xs font-medium text-amber-400">
                      {formatRupiah(result.price)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Watch className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Kode Gelang</p>
                    <p className="text-xs font-medium text-foreground font-mono">
                      {result.wristbandCode || 'Akan digenerate'}
                    </p>
                  </div>
                </div>
              </div>

              {result.wristbandColor && (
                <>
                  <Separator className="bg-border/30" />
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border border-border/30">
                    <div
                      className="h-8 w-8 rounded-full shrink-0 border-2 border-input"
                      style={{ backgroundColor: result.wristbandColorHex || '#E5E7EB' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        Gelang {result.wristbandColor}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {result.wristbandType}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleRedeem}
                disabled={scanMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-foreground font-semibold h-11"
              >
                {scanMutation.isPending ? (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                TUKAR & PASANG GELANG
              </Button>
              <Button
                onClick={handleReject}
                variant="destructive"
                className="h-11 px-5"
              >
                <XCircle className="h-4 w-4 mr-1" />
                TOLAK
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Not Found State ── */}
      {notFound && !result && (
        <Card className="bg-card border-destructive/30 animate-in fade-in duration-200">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <XCircle className="h-12 w-12 text-destructive/60" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Tiket Tidak Ditemukan
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Kode tiket &quot;{ticketCode}&quot; tidak terdaftar dalam sistem.
                Pastikan kode yang dimasukkan benar.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNotFound(false)
                setTicketCode('')
              }}
              className="mt-1"
            >
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
