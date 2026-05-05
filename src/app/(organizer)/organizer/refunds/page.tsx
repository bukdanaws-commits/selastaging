'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RotateCcw, Plus, Search } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'

type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed'

interface Refund {
  id: string
  orderCode: string
  customer: string
  amount: number
  reason: string
  status: RefundStatus
  requestedAt: string
  processedAt: string | null
}

const STATUS_COLORS: Record<RefundStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  approved: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/20',
  processed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

const MOCK_REFUNDS: Refund[] = [
  { id: 'rf-1', orderCode: 'SHL-JKT-100137', customer: 'Andi Pratama', amount: 3500000, reason: 'Double payment detected', status: 'processed', requestedAt: '2025-06-20T10:00:00Z', processedAt: '2025-06-21T14:00:00Z' },
  { id: 'rf-2', orderCode: 'SHL-JKT-100274', customer: 'Siti Nurhaliza', amount: 2800000, reason: 'Event schedule changed', status: 'approved', requestedAt: '2025-06-22T08:00:00Z', processedAt: null },
  { id: 'rf-3', orderCode: 'SHL-JKT-100411', customer: 'Budi Santoso', amount: 1750000, reason: 'Customer request — personal reason', status: 'pending', requestedAt: '2025-06-23T09:00:00Z', processedAt: null },
  { id: 'rf-4', orderCode: 'SHL-JKT-100548', customer: 'Dewi Lestari', amount: 1100000, reason: 'Ticket cancelled by admin', status: 'rejected', requestedAt: '2025-06-24T11:00:00Z', processedAt: '2025-06-24T15:00:00Z' },
]

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>(MOCK_REFUNDS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ orderCode: '', amount: '', reason: '' })
  const [search, setSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filtered = refunds.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return r.orderCode.toLowerCase().includes(s) || r.customer.toLowerCase().includes(s)
  })

  const handleRequestRefund = () => {
    if (!form.orderCode || !form.amount || !form.reason) return
    setIsSubmitting(true)
    setTimeout(() => {
      setRefunds(prev => [{
        id: `rf-${Date.now()}`,
        orderCode: form.orderCode.toUpperCase(),
        customer: 'Customer',
        amount: parseInt(form.amount),
        reason: form.reason,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        processedAt: null,
      }, ...prev])
      setForm({ orderCode: '', amount: '', reason: '' })
      setDialogOpen(false)
      setIsSubmitting(false)
    }, 500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Refunds</h1>
          <p className="text-[#7FB3AE] mt-1">Kelola refund tiket</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
          <Plus className="w-4 h-4 mr-1" /> Request Refund
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Refunds</p>
            <p className="text-xl font-bold text-white">{refunds.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Pending</p>
            <p className="text-xl font-bold text-yellow-400">{refunds.filter(r => r.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Processed</p>
            <p className="text-xl font-bold text-emerald-400">{refunds.filter(r => r.status === 'processed').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Amount</p>
            <p className="text-xl font-bold text-amber-400">{formatRupiah(refunds.reduce((s, r) => s + r.amount, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7FB3AE]" />
        <Input
          placeholder="Cari order code atau nama..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#111918] border-white/10 text-white placeholder:text-white/30 pl-9"
        />
      </div>

      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[#7FB3AE]">Order Code</TableHead>
                  <TableHead className="text-[#7FB3AE]">Customer</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Amount</TableHead>
                  <TableHead className="text-[#7FB3AE]">Reason</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                  <TableHead className="text-[#7FB3AE]">Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#7FB3AE]">Tidak ada refund ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => (
                    <TableRow key={r.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-sm text-white font-medium">{r.orderCode}</TableCell>
                      <TableCell className="text-white">{r.customer}</TableCell>
                      <TableCell className="text-right text-white font-semibold">{formatRupiah(r.amount)}</TableCell>
                      <TableCell className="text-[#7FB3AE] text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[r.status]}>{r.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-[#7FB3AE] text-xs">{formatDateTimeShort(r.requestedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Refund Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Request Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Order Code *</Label>
              <Input
                value={form.orderCode}
                onChange={e => setForm(prev => ({ ...prev, orderCode: e.target.value }))}
                placeholder="SHL-JKT-XXXXXXXX"
                className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Refund Amount (IDR) *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="3500000"
                className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Reason *</Label>
              <Textarea
                value={form.reason}
                onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Alasan refund..."
                className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={handleRequestRefund} disabled={!form.orderCode || !form.amount || !form.reason || isSubmitting} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
              {isSubmitting ? 'Submitting...' : 'Submit Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
