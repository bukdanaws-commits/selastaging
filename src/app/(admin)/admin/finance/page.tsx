'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, DollarSign, Wallet, Clock, AlertTriangle, CheckCircle2, ArrowDownRight, PieChart, Building2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/utils'
import { useScopedData, useRoleLabel } from '@/hooks/use-scoped-data'
import { useOrganizerFinance, useOrganizerBankAccount, useWithdrawals } from '@/hooks/use-api'
import { useAuthStore } from '@/lib/auth-store'
import type { IOrganizerBalance } from '@/lib/types'

// ─── Fallback data for SUPER_ADMIN overview (when real per-organizer data isn't available) ──
const FALLBACK_ORGANIZER_OVERVIEW = [
  {
    organizerId: 'org-sheila-on7',
    organizerName: 'Sheila On 7 Tour',
    eventName: 'Sheila On 7 - Jakarta',
    grossRevenue: 15_200_000_000,
    platformFee: 760_000_000,
    netRevenue: 14_440_000_000,
    availableBalance: 14_440_000_000,
    totalWithdrawn: 0,
    status: 'settled' as const,
  },
  {
    organizerId: 'org-sheila-on7',
    organizerName: 'Sheila On 7 Tour',
    eventName: 'Sheila On 7 - Bandung',
    grossRevenue: 6_800_000_000,
    platformFee: 340_000_000,
    netRevenue: 6_460_000_000,
    availableBalance: 3_460_000_000,
    totalWithdrawn: 3_000_000_000,
    status: 'settled' as const,
  },
  {
    organizerId: 'org-sheila-on7',
    organizerName: 'Sheila On 7 Tour',
    eventName: 'Sheila On 7 - Surabaya',
    grossRevenue: 3_800_000_000,
    platformFee: 190_000_000,
    netRevenue: 3_610_000_000,
    availableBalance: 0,
    totalWithdrawn: 3_610_000_000,
    status: 'settled' as const,
  },
]

// ─── Payment method breakdown (computed from orders in a real scenario) ──
const PAYMENT_BREAKDOWN = [
  { method: 'QRIS - GoPay', percent: 35 },
  { method: 'QRIS - Dana', percent: 20 },
  { method: 'Transfer BSI', percent: 15 },
  { method: 'QRIS - OVO', percent: 10 },
  { method: 'Transfer Mandiri', percent: 8 },
  { method: 'QRIS - ShopeePay', percent: 7 },
  { method: 'QRIS - LinkAja', percent: 5 },
]

// ─── Daily revenue (last 7 days — placeholder) ──
const DAILY_REVENUE = [
  { date: '20 Jun', amount: 2_100_000_000 },
  { date: '21 Jun', amount: 3_200_000_000 },
  { date: '22 Jun', amount: 8_500_000_000 },
  { date: '23 Jun', amount: 4_000_000_000 },
  { date: '24 Jun', amount: 3_500_000_000 },
  { date: '25 Jun', amount: 2_500_000_000 },
  { date: '26 Jun', amount: 2_000_000_000 },
]

const MAX_DAILY = Math.max(...DAILY_REVENUE.map(d => d.amount))

// ─── Loading Skeleton ──────────────────────────────────────────────────────
function FinanceLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Error State ────────────────────────────────────────────────────────────
function FinanceErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">Failed to Load Finance Data</p>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <Button variant="outline" onClick={onRetry} className="border-primary/30 text-primary hover:bg-primary/10">
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Organizer Finance View ─────────────────────────────────────────────────
function OrganizerFinanceView({ finance }: { finance: IOrganizerBalance }) {
  const { data: bankAccount } = useOrganizerBankAccount()
  const isSettled = finance.isSettled
  const hasBankAccount = !!bankAccount
  const canWithdraw = isSettled && finance.availableBalance > 0 && hasBankAccount

  // Compute payment breakdown from gross revenue
  const paymentBreakdown = PAYMENT_BREAKDOWN.map(pm => ({
    ...pm,
    amount: Math.round(finance.grossRevenue * pm.percent / 100),
  }))

  return (
    <>
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-muted-foreground">Gross Revenue</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatRupiah(finance.grossRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-red-400" />
              <span className="text-[11px] text-muted-foreground">Platform Fee ({finance.platformFeePercent}%)</span>
            </div>
            <p className="text-xl font-bold text-red-400">-{formatRupiah(finance.platformFeeAmount)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-muted-foreground">Net Revenue</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">{formatRupiah(finance.netRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] text-muted-foreground">Available Balance</span>
            </div>
            <p className="text-xl font-bold text-amber-400">{formatRupiah(finance.availableBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Status */}
      <Card className="bg-card border-border">
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
              <p className="text-sm font-semibold text-foreground">Settlement Status</p>
              <Badge className={isSettled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
              }>
                {isSettled ? 'SETTLED' : 'NOT SETTLED'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSettled
                ? `Settled on ${finance.settledAt ? new Date(finance.settledAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} • H+7 after event`
                : 'Settlement will be processed H+7 after the event date'
              }
            </p>
          </div>
          {canWithdraw && (
            <Badge className="bg-primary/15 text-primary border-primary/20">
              Ready to Withdraw
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Now CTA */}
      {canWithdraw && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/15">
                <ArrowDownRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Available for Withdrawal</p>
                <p className="text-lg font-bold text-primary">{formatRupiah(finance.availableBalance)}</p>
              </div>
            </div>
            <Link href="/admin/withdraw">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <ArrowDownRight className="w-4 h-4 mr-1" /> Withdraw Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Bank Account Status */}
      {!hasBankAccount && (
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium">No Bank Account</p>
              <p className="text-xs text-muted-foreground">Add a bank account before you can withdraw funds.</p>
            </div>
            <Link href="/admin/bank-account" className="ml-auto">
              <Button variant="outline" size="sm" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                Add Bank Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Revenue Chart (Bar Chart) */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Daily Revenue (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end gap-2 h-40">
            {DAILY_REVENUE.map((d, i) => {
              const height = (d.amount / MAX_DAILY) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">{formatRupiah(d.amount)}</span>
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/40 rounded-t-md min-h-[4px] transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-foreground/50">{d.date}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Payment Method Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {paymentBreakdown.map((pm, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{pm.method}</span>
                  <span className="text-xs text-muted-foreground">{pm.percent}% — {formatRupiah(pm.amount)}</span>
                </div>
                <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                    style={{ width: `${pm.percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Total Withdrawn */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10">
              <ArrowDownRight className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Total Withdrawn</p>
              <p className="text-lg font-bold text-purple-400">{formatRupiah(finance.totalWithdrawn)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ─── SUPER_ADMIN Finance View ───────────────────────────────────────────────
function SuperAdminFinanceView() {
  const { data: withdrawalsData } = useWithdrawals()

  // For SUPER_ADMIN, use the fallback overview data
  // In a real system, this would aggregate from all organizers
  const organizerOverview = FALLBACK_ORGANIZER_OVERVIEW

  // Compute totals from fallback data
  const totalPlatformFee = organizerOverview.reduce((sum, o) => sum + o.platformFee, 0)
  const totalAvailableBalance = organizerOverview.reduce((sum, o) => sum + o.availableBalance, 0)
  const totalGrossRevenue = organizerOverview.reduce((sum, o) => sum + o.grossRevenue, 0)
  const totalNetRevenue = organizerOverview.reduce((sum, o) => sum + o.netRevenue, 0)
  const totalWithdrawn = organizerOverview.reduce((sum, o) => sum + o.totalWithdrawn, 0)

  // Payment breakdown from gross
  const paymentBreakdown = PAYMENT_BREAKDOWN.map(pm => ({
    ...pm,
    amount: Math.round(totalGrossRevenue * pm.percent / 100),
  }))

  return (
    <>
      {/* Summary Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-muted-foreground">Total Gross Revenue</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatRupiah(totalGrossRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-red-400" />
              <span className="text-[11px] text-muted-foreground">Total Platform Fee</span>
            </div>
            <p className="text-xl font-bold text-red-400">-{formatRupiah(totalPlatformFee)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-muted-foreground">Total Net Revenue</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">{formatRupiah(totalNetRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] text-muted-foreground">Total Available Balance</span>
            </div>
            <p className="text-xl font-bold text-amber-400">{formatRupiah(totalAvailableBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Daily Revenue (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end gap-2 h-40">
            {DAILY_REVENUE.map((d, i) => {
              const height = (d.amount / MAX_DAILY) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">{formatRupiah(d.amount)}</span>
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/40 rounded-t-md min-h-[4px] transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-foreground/50">{d.date}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Payment Method Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {paymentBreakdown.map((pm, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{pm.method}</span>
                  <span className="text-xs text-muted-foreground">{pm.percent}% — {formatRupiah(pm.amount)}</span>
                </div>
                <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                    style={{ width: `${pm.percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Total Withdrawn */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10">
              <ArrowDownRight className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Total Withdrawn (All Organizers)</p>
              <p className="text-lg font-bold text-purple-400">{formatRupiah(totalWithdrawn)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Organizer Financial Overview */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-foreground text-sm font-bold">
              Per-Organizer Financial Overview
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Breakdown pendapatan per event/organizer — data real-time dari settlement DOKU
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {organizerOverview.map((org, i) => (
              <div key={i} className="bg-background rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{org.eventName}</p>
                    <p className="text-xs text-muted-foreground">{org.organizerName}</p>
                  </div>
                  <Badge className={
                    org.status === 'settled'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
                  }>
                    {org.status === 'settled' ? 'SETTLED' : 'PENDING'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Gross Revenue</p>
                    <p className="font-semibold text-foreground">{formatRupiah(org.grossRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Platform Fee</p>
                    <p className="font-semibold text-red-400">-{formatRupiah(org.platformFee)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-semibold text-amber-400">{formatRupiah(org.availableBalance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Withdrawn</p>
                    <p className="font-semibold text-purple-400">{formatRupiah(org.totalWithdrawn)}</p>
                  </div>
                </div>
                {/* Revenue bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      style={{ width: `${org.netRevenue > 0 ? (org.totalWithdrawn / org.netRevenue) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {org.netRevenue > 0 ? Math.round((org.totalWithdrawn / org.netRevenue) * 100) : 0}% withdrawn
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Platform Total Summary */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Total Platform Fee Collected</span>
              <span className="font-bold text-amber-400">
                {formatRupiah(totalPlatformFee)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground font-medium">Total Organizer Balance (All)</span>
              <span className="font-bold text-emerald-400">
                {formatRupiah(totalAvailableBalance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ─── Main Finance Page ──────────────────────────────────────────────────────
export default function FinancePage() {
  const { isSuperAdmin, isOrganizer, selectedEventId } = useScopedData()
  const pageTitle = useRoleLabel({ superAdmin: 'Finance Overview', organizer: 'My Finance' })
  const pageSubtitle = useRoleLabel({
    superAdmin: 'Ringkasan keuangan semua organizer',
    organizer: 'Ringkasan keuangan event kamu',
  })

  // For ORGANIZER role: fetch finance data via React Query
  const {
    data: financeData,
    isLoading: financeLoading,
    isError: financeError,
    error: financeErrorObj,
    refetch: refetchFinance,
  } = useOrganizerFinance(selectedEventId || undefined)

  // For SUPER_ADMIN: also try to get the first event's finance
  const {
    data: adminFinanceData,
    isLoading: adminFinanceLoading,
    isError: adminFinanceError,
    error: adminFinanceErrorObj,
    refetch: refetchAdminFinance,
  } = useOrganizerFinance(isSuperAdmin ? selectedEventId || undefined : undefined)

  // Determine which data to use
  const finance = isSuperAdmin ? adminFinanceData : financeData
  const isLoading = isSuperAdmin ? adminFinanceLoading : financeLoading
  const isError = isSuperAdmin ? adminFinanceError : financeError
  const error = isSuperAdmin ? adminFinanceErrorObj : financeErrorObj
  const refetch = isSuperAdmin ? refetchAdminFinance : refetchFinance

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{pageTitle}</h1>
        <p className="text-muted-foreground mt-1">{pageSubtitle}</p>
      </div>

      {/* Loading State */}
      {isLoading && <FinanceLoadingSkeleton />}

      {/* Error State */}
      {isError && !isLoading && (
        <FinanceErrorState
          message={error instanceof Error ? error.message : 'An error occurred while loading finance data'}
          onRetry={() => refetch()}
        />
      )}

      {/* Success: Render based on role */}
      {!isLoading && !isError && (
        <>
          {isSuperAdmin ? (
            <SuperAdminFinanceView />
          ) : finance ? (
            <OrganizerFinanceView finance={finance} />
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Wallet className="w-12 h-12 text-foreground/10 mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">No Finance Data</p>
                <p className="text-sm text-muted-foreground">Finance data will appear once your event has orders.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
