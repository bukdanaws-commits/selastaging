'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Ticket } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'
import type { TicketStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: TicketStatus | ''; label: string; color: string }[] = [
  { value: '', label: 'All', color: '' },
  { value: 'active', label: 'Active', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { value: 'redeemed', label: 'Redeemed', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { value: 'inside', label: 'Inside', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  { value: 'outside', label: 'Outside', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
]

const MOCK_TICKETS = Array.from({ length: 30 }, (_, i) => {
  const statuses: TicketStatus[] = ['active', 'active', 'active', 'redeemed', 'inside', 'cancelled', 'pending', 'expired', 'outside', 'active']
  const types = ['VVIP PIT', 'VIP ZONE', 'FESTIVAL', 'CAT 1', 'CAT 2', 'CAT 3', 'CAT 4', 'CAT 5', 'CAT 6']
  const names = ['Andi Pratama', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Raka Wibowo', 'Nina Kusuma', 'Fajar Hidayat', 'Maya Indah', 'Dimas Arya', 'Putri Rahayu']
  const status = statuses[i % statuses.length]
  return {
    id: `tkt-${i + 1}`,
    code: `SHL-JKT-${types[i % types.length].split(' ')[0]}-${String(1000 + i).padStart(4, '0')}`,
    customer: names[i % names.length],
    type: types[i % types.length],
    status,
    seat: status === 'cancelled' ? null : (types[i % types.length].includes('CAT') ? `${types[i % types.length].replace('CAT ', '')}-${(i % 30) + 1}` : null),
    redeemedAt: status === 'redeemed' || status === 'inside' ? new Date(2025, 5, 22, 12 + (i % 6), i * 2).toISOString() : null,
    price: [3500000, 2800000, 2200000, 1750000, 1400000, 1100000, 850000, 550000, 350000][i % 9],
  }
})

export default function MyTicketsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('')

  const filtered = MOCK_TICKETS.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!t.code.toLowerCase().includes(s) && !t.customer.toLowerCase().includes(s)) return false
    }
    return true
  })

  const getStatusBadge = (status: TicketStatus) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status)
    return opt ? opt.color : ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Tickets</h1>
        <p className="text-[#7FB3AE] mt-1">Semua tiket event kamu</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
          <Input
            placeholder="Cari ticket code atau nama..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111918] border-white/10 text-white placeholder:text-white/30 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
              className={statusFilter === opt.value
                ? 'bg-[#00A39D] text-white border-[#00A39D]'
                : 'border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5'
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[#7FB3AE]">Ticket Code</TableHead>
                  <TableHead className="text-[#7FB3AE]">Customer</TableHead>
                  <TableHead className="text-[#7FB3AE]">Type</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                  <TableHead className="text-[#7FB3AE]">Seat</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Price</TableHead>
                  <TableHead className="text-[#7FB3AE]">Redeemed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#7FB3AE]">Tidak ada tiket ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(ticket => (
                    <TableRow key={ticket.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-sm text-white font-medium">{ticket.code}</TableCell>
                      <TableCell className="text-white">{ticket.customer}</TableCell>
                      <TableCell>
                        <Badge className="bg-[#00A39D]/15 text-[#00A39D] border-[#00A39D]/20">{ticket.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(ticket.status)}>{ticket.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-[#7FB3AE]">{ticket.seat ?? '—'}</TableCell>
                      <TableCell className="text-right text-white">{formatRupiah(ticket.price)}</TableCell>
                      <TableCell className="text-[#7FB3AE] text-xs">{ticket.redeemedAt ? formatDateTimeShort(ticket.redeemedAt) : '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-white/30 text-right">Showing {filtered.length} of {MOCK_TICKETS.length} tickets</p>
    </div>
  )
}
