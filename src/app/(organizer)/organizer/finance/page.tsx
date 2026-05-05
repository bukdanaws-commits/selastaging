'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, DollarSign, Wallet, Clock, AlertTriangle, CheckCircle2, ArrowDownRight, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/utils'

// ─── Mock Finance Data ──────────────────────────────────────────────────────
const MOCK_FINANCE = {
  grossRevenue: 25_800_000_000, // Rp 25.8B
  platformFeePercent: 5,
  platformFee: 1_290_000_000,
  netRevenue: 24_510_000_000,
  availableBalance: 24_510_000_000,
  totalWithdrawn: 0,
  settlementStatus: 'settled' as 'not_settled' | 'settled',
  settlementDate: '2025-06-29',
  eventDate: '2025-06-22',
  // Payment method breakdown
  paymentBreakdown: [
    { method: 'QRIS - GoPay', amount: 9_030_000_000, percent: 35 },
    { method: 'QRIS - Dana', amount: 5_160_000_000, percent: 20 },
    { method: 'Transfer BSI', amount: 3_870_000_000, percent: 15 },
    { method: 'QRIS - OVO', amount: 2_580_000_000, percent: 10 },
    { method: 'Transfer Mandiri', amount: 2_064_000_000, percent: 8 },
    { method: 'QRIS - ShopeePay', amount: 1_806_000_000, percent: 7 },
    { method: 'QRIS - LinkAja', amount: 1_290_000_000, percent: 5 },
  ],
  // Daily revenue (last 7 days)
  dailyRevenue: [
    { date: '20 Jun', amount: 2_100_000_000 },
    { date: '21 Jun', amount: 3_200_000_000 },
    { date: '22 Jun', amount: 8_500_000_000 },
    { date: '23 Jun', amount: 4_000_000_000 },
    { date: '24 Jun', amount: 3_500_000_000 },
    { date: '25 Jun', amount: 2_500_000_000 },
    { date: '26 Jun', amount: 2_000_000_000 },
  ],
}

const MAX_DAILY = Math.max(...MOCK_FINANCE.dailyRevenue.map(d => d.amount))

export default function FinancePage() {
  const finance = MOCK_FINANCE
  const isSettled = finance.settlementStatus === 'settled'
  const daysUntilSettlement = !isSettled ? 7 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Finance</h1>
        <p className="text-[#7FB3AE] mt-1">Ringkasan keuangan event kamu</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-[#00A39D]/20 to-[#00A39D]/5 border-[#00A39D]/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[#00A39D]" />
              <span className="text-[11px] text-[#7FB3AE]">Gross Revenue</span>
            </div>
            <p className="text-xl font-bold text-white">{formatRupiah(finance.grossRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-red-400" />
              <span className="text-[11px] text-[#7FB3AE]">Platform Fee ({finance.platformFeePercent}%)</span>
            </div>
            <p className="text-xl font-bold text-red-400">-{formatRupiah(finance.platformFee)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-[#7FB3AE]">Net Revenue</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">{formatRupiah(finance.netRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] text-[#7FB3AE]">Available Balance</span>
            </div>
            <p className="text-xl font-bold text-amber-400">{formatRupiah(finance.availableBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Status */}
      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={cn(
            'p-3 rounded-lg',
            isSettled ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
          )}>
            {isSettled
              ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              : <Clock className="w-6 h-6 text-yellow-400" />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Settlement Status</p>
              <Badge className={isSettled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
              }>
                {isSettled ? 'SETTLED' : 'NOT SETTLED'}
              </Badge>
            </div>
            <p className="text-xs text-[#7FB3AE] mt-0.5">
              {isSettled
                ? `Settled on ${finance.settlementDate} • H+7 after event`
                : `Estimated settlement: ${finance.settlementDate} (${daysUntilSettlement} days remaining)`
              }
            </p>
          </div>
          {isSettled && (
            <Badge className="bg-[#00A39D]/15 text-[#00A39D] border-[#00A39D]/20">
              Ready to Withdraw
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Revenue Chart (Bar Chart Placeholder) */}
      <Card className="bg-[#111918] border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00A39D]" />
            Daily Revenue (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end gap-2 h-40">
            {finance.dailyRevenue.map((d, i) => {
              const height = (d.amount / MAX_DAILY) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#7FB3AE] whitespace-nowrap">{formatRupiah(d.amount)}</span>
                  <div
                    className="w-full bg-gradient-to-t from-[#00A39D] to-[#00A39D]/40 rounded-t-md min-h-[4px] transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-white/50">{d.date}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card className="bg-[#111918] border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#00A39D]" />
            Payment Method Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {finance.paymentBreakdown.map((pm, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{pm.method}</span>
                  <span className="text-xs text-[#7FB3AE]">{pm.percent}% — {formatRupiah(pm.amount)}</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00A39D] to-[#00A39D]/60 rounded-full transition-all"
                    style={{ width: `${pm.percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Total Withdrawn */}
      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10">
              <ArrowDownRight className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] text-[#7FB3AE]">Total Withdrawn</p>
              <p className="text-lg font-bold text-purple-400">{formatRupiah(finance.totalWithdrawn)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
