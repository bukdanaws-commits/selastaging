'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, ArrowDownRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'

const AVAILABLE_BALANCE = 24_510_000_000

const MOCK_RECENT: Array<{
  id: string
  amount: number
  bank: string
  status: 'pending' | 'processing' | 'transferred' | 'failed'
  requestedAt: string
  completedAt: string | null
}> = [
  { id: 'wd-1', amount: 5_000_000_000, bank: 'Bank BSI - 7123****789', status: 'transferred', requestedAt: '2025-06-29T10:00:00Z', completedAt: '2025-07-01T14:00:00Z' },
  { id: 'wd-2', amount: 10_000_000_000, bank: 'Bank BSI - 7123****789', status: 'pending', requestedAt: '2025-07-02T08:00:00Z', completedAt: null },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  transferred: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function WithdrawPage() {
  const [amount, setAmount] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recentWithdrawals, setRecentWithdrawals] = useState(MOCK_RECENT)

  const numAmount = parseInt(amount) || 0
  const isValid = numAmount > 0 && numAmount <= AVAILABLE_BALANCE

  const handleWithdraw = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setRecentWithdrawals(prev => [{
        id: `wd-${Date.now()}`,
        amount: numAmount,
        bank: 'Bank BSI - 7123****789',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        completedAt: null,
      }, ...prev].slice(0, 10))
      setAmount('')
      setConfirmOpen(false)
      setIsSubmitting(false)
    }, 1000)
  }

  const formatMax = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1).replace('.0', '')}M`
    return formatRupiah(val)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Withdraw</h1>
        <p className="text-[#7FB3AE] mt-1">Cairkan saldo ke rekening bank</p>
      </div>

      {/* Available Balance */}
      <Card className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/20">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10">
            <Wallet className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] text-amber-200/60">Available Balance</p>
            <p className="text-2xl font-bold text-amber-400">{formatRupiah(AVAILABLE_BALANCE)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      <Card className="bg-[#111918] border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">Request Withdrawal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#7FB3AE]">Amount (IDR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7FB3AE] text-sm">Rp</span>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30 pl-10 text-lg font-semibold"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#7FB3AE]">
              <span>Min: Rp 100.000</span>
              <span className="text-white/40 cursor-pointer" onClick={() => setAmount(String(AVAILABLE_BALANCE))}>Max: {formatRupiah(AVAILABLE_BALANCE)}</span>
            </div>
            {numAmount > AVAILABLE_BALANCE && (
              <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Amount exceeds available balance</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[#7FB3AE]">Bank Account</Label>
            <div className="bg-[#0A0F0E] border border-white/10 rounded-md px-3 py-2.5 text-sm text-white">
              Bank BSI — 7123****789 (PT SeleEvent Indonesia) ✅
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {[10, 25, 50, 75, 100].map(pct => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                className="border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5 text-xs"
                onClick={() => setAmount(String(Math.floor(AVAILABLE_BALANCE * pct / 100)))}
              >
                {pct}%
              </Button>
            ))}
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!isValid}
            className="w-full bg-[#00A39D] hover:bg-[#00A39D]/90 text-white py-5 text-base font-semibold"
          >
            <ArrowDownRight className="w-5 h-5 mr-2" />
            Withdraw {formatRupiah(numAmount)}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Withdrawals */}
      <Card className="bg-[#111918] border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Recent Withdrawals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-[#7FB3AE]">Amount</TableHead>
                <TableHead className="text-[#7FB3AE]">Status</TableHead>
                <TableHead className="text-[#7FB3AE]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentWithdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-[#7FB3AE]">No withdrawal requests yet</TableCell>
                </TableRow>
              ) : (
                recentWithdrawals.map(w => (
                  <TableRow key={w.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="text-white font-semibold">{formatRupiah(w.amount)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[w.status]}>{w.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-[#7FB3AE] text-xs">{formatDateTimeShort(w.requestedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-[#0A0F0E] border border-white/10 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#7FB3AE]">Amount</span>
                <span className="text-white font-semibold">{formatRupiah(numAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#7FB3AE]">Fee</span>
                <span className="text-emerald-400 font-medium">Rp 0</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
                <span className="text-[#7FB3AE] font-medium">You Receive</span>
                <span className="text-white font-bold text-lg">{formatRupiah(numAmount)}</span>
              </div>
            </div>
            <div className="text-xs text-[#7FB3AE] space-y-1">
              <p>Bank: <span className="text-white">Bank BSI — 7123456789</span></p>
              <p>Holder: <span className="text-white">PT SeleEvent Indonesia</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={handleWithdraw} disabled={isSubmitting} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
              {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
