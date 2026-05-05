'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, ChevronDown, ChevronUp, ShoppingCart, Filter } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

// ─── Mock Orders ────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: OrderStatus | ''; label: string; color: string }[] = [
  { value: '', label: 'All', color: '' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  { value: 'refunded', label: 'Refunded', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
]

const MOCK_ORDERS = Array.from({ length: 25 }, (_, i) => {
  const statuses: OrderStatus[] = ['paid', 'paid', 'paid', 'paid', 'paid', 'pending', 'cancelled', 'expired', 'refunded', 'paid']
  const methods = ['QRIS - GoPay', 'QRIS - Dana', 'Transfer BSI', 'Transfer Mandiri', 'QRIS - OVO', 'QRIS - ShopeePay']
  const status = statuses[i % statuses.length]
  const names = ['Andi Pratama', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Raka Wibowo', 'Nina Kusuma', 'Fajar Hidayat', 'Maya Indah', 'Dimas Arya', 'Putri Rahayu',
    'Andi Pratama', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Raka Wibowo', 'Nina Kusuma', 'Fajar Hidayat', 'Maya Indah', 'Dimas Arya', 'Putri Rahayu',
    'Andi Pratama', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Raka Wibowo']
  const ticketCounts = [1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 1, 2, 3, 1, 2]
  const prices = [3500000, 2800000, 2200000, 1750000, 1400000, 1100000, 850000, 550000, 350000, 1750000,
    2800000, 2200000, 350000, 1100000, 850000, 550000, 1750000, 3500000, 1400000, 2200000,
    850000, 1100000, 1750000, 550000, 2800000]
  return {
    id: `ord-${i + 1}`,
    orderCode: `SHL-JKT-${String(100000 + i * 137).toUpperCase()}`,
    customer: names[i],
    tickets: ticketCounts[i],
    amount: prices[i] * ticketCounts[i],
    method: methods[i % methods.length],
    status,
    date: new Date(2025, 5, 20 - Math.floor(i / 4), 10 + (i % 8), 15 + i * 3).toISOString(),
  }
})

export default function MyOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const filtered = MOCK_ORDERS.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!o.orderCode.toLowerCase().includes(s) && !o.customer.toLowerCase().includes(s)) return false
    }
    return true
  })

  const getStatusBadge = (status: OrderStatus) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status)
    return opt ? opt.color : ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Orders</h1>
        <p className="text-[#7FB3AE] mt-1">Semua pesanan tiket event kamu</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
          <Input
            placeholder="Cari order code atau nama..."
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

      {/* Orders Table */}
      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[#7FB3AE] w-8"></TableHead>
                  <TableHead className="text-[#7FB3AE]">Order Code</TableHead>
                  <TableHead className="text-[#7FB3AE]">Customer</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Tickets</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Amount</TableHead>
                  <TableHead className="text-[#7FB3AE]">Payment</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                  <TableHead className="text-[#7FB3AE]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[#7FB3AE]">Tidak ada pesanan ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(order => (
                    <>
                      <TableRow
                        key={order.id}
                        className="border-white/5 hover:bg-white/[0.02] cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}
                      >
                        <TableCell className="w-8">
                          {expandedRow === order.id
                            ? <ChevronUp className="w-4 h-4 text-[#7FB3AE]" />
                            : <ChevronDown className="w-4 h-4 text-[#7FB3AE]" />
                          }
                        </TableCell>
                        <TableCell className="font-mono text-sm text-white font-medium">{order.orderCode}</TableCell>
                        <TableCell className="text-white">{order.customer}</TableCell>
                        <TableCell className="text-right text-white">{order.tickets}</TableCell>
                        <TableCell className="text-right text-white font-semibold">{formatRupiah(order.amount)}</TableCell>
                        <TableCell className="text-[#7FB3AE] text-xs">{order.method}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(order.status)}>{order.status.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-[#7FB3AE] text-xs">{formatDateTimeShort(order.date)}</TableCell>
                      </TableRow>
                      {expandedRow === order.id && (
                        <TableRow key={`${order.id}-detail`} className="border-white/5 bg-white/[0.01]">
                          <TableCell colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-[#7FB3AE] text-xs mb-1">Order Code</p>
                                <p className="text-white font-mono">{order.orderCode}</p>
                              </div>
                              <div>
                                <p className="text-[#7FB3AE] text-xs mb-1">Customer</p>
                                <p className="text-white">{order.customer}</p>
                              </div>
                              <div>
                                <p className="text-[#7FB3AE] text-xs mb-1">Payment Method</p>
                                <p className="text-white">{order.method}</p>
                              </div>
                              <div>
                                <p className="text-[#7FB3AE] text-xs mb-1">Total Tickets</p>
                                <p className="text-white">{order.tickets} tiket</p>
                              </div>
                              <div>
                                <p className="text-[#7FB3AE] text-xs mb-1">Total Amount</p>
                                <p className="text-white font-semibold">{formatRupiah(order.amount)}</p>
                              </div>
                              <div>
                                <p className="text-[#7FB3AE] text-xs mb-1">Ordered At</p>
                                <p className="text-white">{formatDateTimeShort(order.date)}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-white/30 text-right">Showing {filtered.length} of {MOCK_ORDERS.length} orders</p>
    </div>
  )
}
