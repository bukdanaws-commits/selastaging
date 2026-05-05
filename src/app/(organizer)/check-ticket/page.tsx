'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Ticket,
  User,
  Tag,
  Watch,
  MapPin,
  DollarSign,
  Shield,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckTicket } from '@/hooks/use-api'
import { formatRupiah } from '@/lib/utils'
import { toast } from 'sonner'

function getStatusInfo(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Aktif', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' }
    case 'redeemed':
      return { label: 'Diredeem', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' }
    case 'inside':
      return { label: 'Di Dalam Venue', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' }
    case 'cancelled':
      return { label: 'Dibatalkan', color: 'bg-red-500/15 text-red-400 border-red-500/20' }
    default:
      return { label: status, color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' }
  }
}

interface TicketResult {
  ticketCode: string
  attendeeName: string
  ticketTypeName: string
  tier: string
  status: string
  wristbandCode: string | null
  wristbandColor: string | null
  wristbandColorHex: string | null
  wristbandType: string | null
  price: number
  seatLabel: string | null
  redeemedAt: string | null
  wristbandLinked: boolean
}

export default function CheckTicketPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [foundTicket, setFoundTicket] = useState<TicketResult | null>(null)
  const checkTicketMutation = useCheckTicket()

  const handleSearch = async () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      toast.error('Masukkan kode tiket terlebih dahulu')
      return
    }

    try {
      const result = await checkTicketMutation.mutateAsync(trimmed)
      const resp = result as unknown as Record<string, unknown>
      const ticket = resp.ticket as Record<string, unknown> | undefined

      if (ticket) {
        setFoundTicket({
          ticketCode: String(ticket.ticketCode ?? ''),
          attendeeName: String(ticket.attendeeName ?? ''),
          ticketTypeName: String(ticket.ticketTypeName ?? ticket.ticketType ?? ''),
          tier: String(ticket.tier ?? ''),
          status: String(ticket.status ?? 'active'),
          wristbandCode: (ticket.wristbandCode as string) ?? null,
          wristbandColor: (ticket.wristbandColor as string) ?? null,
          wristbandColorHex: (ticket.wristbandColorHex as string) ?? null,
          wristbandType: (ticket.wristbandType as string) ?? null,
          price: (ticket.price as number) ?? 0,
          seatLabel: (ticket.seatLabel as string) ?? null,
          redeemedAt: (ticket.redeemedAt as string) ?? null,
          wristbandLinked: !!(ticket.wristbandCode || ticket.wristbandLinked),
        })
      } else {
        setFoundTicket(null)
        toast.error('Tiket tidak ditemukan')
      }
    } catch {
      setFoundTicket(null)
      toast.error('Tiket tidak ditemukan')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Cek Tiket</h1>
        <p className="text-[#7FB3AE] mt-1">Cari data tiket dan peserta berdasarkan kode</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-[#111918] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-[#00A39D]" />
                Pencarian Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
                <Input
                  placeholder="Masukkan kode tiket..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (foundTicket) setFoundTicket(null)
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={checkTicketMutation.isPending}
                  className="pl-10 bg-[#0A0F0E] border-white/10 text-white placeholder:text-[#7FB3AE]/50"
                />
              </div>

              {searchQuery.trim() && !foundTicket && checkTicketMutation.isPending && (
                <div className="flex items-center justify-center py-4">
                  <Skeleton className="h-4 w-32" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Ticket Detail */}
          {foundTicket && (
            <Card className="bg-[#111918] border-[#00A39D]/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">Detail Tiket</CardTitle>
                  {(() => {
                    const s = getStatusInfo(foundTicket.status)
                    return <Badge variant="outline" className={cn('text-xs', s.color)}>{s.label}</Badge>
                  })()}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]">
                    <Ticket className="h-5 w-5 text-[#00A39D] shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7FB3AE]">Kode Tiket</p>
                      <p className="font-mono font-semibold text-sm text-white">{foundTicket.ticketCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]">
                    <User className="h-5 w-5 text-[#00A39D] shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7FB3AE]">Nama Peserta</p>
                      <p className="font-semibold text-sm text-white">{foundTicket.attendeeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]">
                    <Tag className="h-5 w-5 text-[#00A39D] shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7FB3AE]">Tipe Tiket</p>
                      <p className="font-semibold text-sm text-white">{foundTicket.ticketTypeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]">
                    <DollarSign className="h-5 w-5 text-[#00A39D] shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7FB3AE]">Harga</p>
                      <p className="font-semibold text-sm text-white">{formatRupiah(foundTicket.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]">
                    <Watch className="h-5 w-5 text-[#00A39D] shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7FB3AE]">Kode Gelang</p>
                      <p className="font-mono font-semibold text-sm text-white">{foundTicket.wristbandCode || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]">
                    <MapPin className="h-5 w-5 text-[#00A39D] shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7FB3AE]">Zona</p>
                      <p className="font-semibold text-sm text-white capitalize">{foundTicket.tier || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Wristband info */}
                {foundTicket.wristbandLinked && foundTicket.wristbandColor && (
                  <div className="p-3 rounded-lg bg-[#00A39D]/5 border border-[#00A39D]/15 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full shrink-0 border-2 border-white/10"
                      style={{ backgroundColor: foundTicket.wristbandColorHex || '#555' }}
                    />
                    <div>
                      <p className="text-xs text-white font-medium">
                        Gelang {foundTicket.wristbandColor} ({foundTicket.wristbandType || '—'})
                      </p>
                      <p className="text-[11px] text-[#7FB3AE]">
                        {foundTicket.redeemedAt
                          ? `Ditukar pada ${new Date(foundTicket.redeemedAt).toLocaleString('id-ID')}`
                          : 'Terhubung'}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  className="w-full text-center text-sm text-[#7FB3AE] hover:text-white transition-colors py-2"
                  onClick={() => { setFoundTicket(null); setSearchQuery('') }}
                >
                  ← Kembali ke pencarian
                </button>
              </CardContent>
            </Card>
          )}

          {/* Empty state when no search */}
          {!foundTicket && !searchQuery.trim() && (
            <Card className="bg-[#111918] border border-dashed border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-12 w-12 text-[#7FB3AE]/20 mb-3" />
                <p className="text-[#7FB3AE] text-sm">Masukkan kode tiket untuk mencari</p>
                <p className="text-[#7FB3AE]/50 text-xs mt-1">Contoh: SHL-JKT-VIPZON-0001</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[#7FB3AE] uppercase tracking-wider">Informasi</h3>
          <Card className="bg-[#111918] border-white/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#00A39D]/10">
                  <Shield className="h-4 w-4 text-[#00A39D]" />
                </div>
                <div>
                  <p className="text-[11px] text-[#7FB3AE]">Pencarian</p>
                  <p className="text-lg font-bold text-white">Real-time</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-[#7FB3AE]">Data Langsung</p>
                  <p className="text-sm text-[#7FB3AE]">Dari server terkini</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
