'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, CreditCard, Filter } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'

const PAYMENT_METHODS = ['QRIS - GoPay', 'QRIS - Dana', 'Transfer BSI', 'QRIS - OVO', 'Transfer Mandiri', 'QRIS - ShopeePay', 'QRIS - LinkAja']

const PAYMENT_STATUSES = [
  { value: '', label: 'All', color: '' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  { value: 'failed', label: 'Failed', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
]

const MOCK_PAYMENT_LOGS = Array.from({ length: 30 }, (_, i) => {
  const statuses = ['paid', 'paid', 'paid', 'paid', 'paid', 'pending', 'failed', 'expired']
  const status = statuses[i % statuses.length]
  return {
    id: `pay-${i + 1}`,
    orderCode: `SHL-JKT-${String(100000 + i * 137).toUpperCase()}`,
    txId: `TXN-${Date.now() - i * 86400000}-${String(i).padStart(4, '0')}`,
    method: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
    amount: [3500000, 2800000, 2200000, 1750000, 1400000, 1100000, 850000, 550000, 350000][i % 9],
    status,
    date: new Date(2025, 5, 22 - Math.floor(i / 5), 10 + (i % 12), i * 3).toISOString(),
  }
})

export default function PaymentLogsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  const filtered = MOCK_PAYMENT_LOGS.filter(log => {
    if (statusFilter && log.status !== statusFilter) return false
    if (methodFilter && log.method !== methodFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!log.orderCode.toLowerCase().includes(s) && !log.txId.toLowerCase().includes(s)) return false
    }
    return true
  })

  const getStatusColor = (status: string) => {
    return PAYMENT_STATUSES.find(s => s.value === status)?.color ?? ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Payment Logs</h1>
        <p className="text-[#7FB3AE] mt-1">Log pembayaran event kamu</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
          <Input
            placeholder="Cari order code atau TX ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111918] border-white/10 text-white placeholder:text-white/30 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_STATUSES.map(opt => (
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

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[#7FB3AE] self-center mr-1">Method:</span>
        <Button
          variant={methodFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMethodFilter('')}
          className={methodFilter === '' ? 'bg-[#00A39D] text-white border-[#00A39D]' : 'border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5'}
        >
          All
        </Button>
        {PAYMENT_METHODS.map(m => (
          <Button
            key={m}
            variant={methodFilter === m ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMethodFilter(m)}
            className={methodFilter === m ? 'bg-[#00A39D] text-white border-[#00A39D]' : 'border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5'}
          >
            {m}
          </Button>
        ))}
      </div>

      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[#7FB3AE]">Order Code</TableHead>
                  <TableHead className="text-[#7FB3AE]">TX ID</TableHead>
                  <TableHead className="text-[#7FB3AE]">Method</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Amount</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                  <TableHead className="text-[#7FB3AE]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#7FB3AE]">Tidak ada log ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(log => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-sm text-white font-medium">{log.orderCode}</TableCell>
                      <TableCell className="font-mono text-xs text-[#7FB3AE]">{log.txId.slice(0, 20)}...</TableCell>
                      <TableCell className="text-[#7FB3AE] text-sm">{log.method}</TableCell>
                      <TableCell className="text-right text-white font-semibold">{formatRupiah(log.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(log.status)}>{log.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-[#7FB3AE] text-xs">{formatDateTimeShort(log.date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-white/30 text-right">Showing {filtered.length} of {MOCK_PAYMENT_LOGS.length} logs</p>
    </div>
  )
}
