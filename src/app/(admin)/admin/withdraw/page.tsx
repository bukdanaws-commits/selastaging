'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Wallet, ArrowDownRight, AlertTriangle, CheckCircle2, Building2, Loader2 } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'
import { useOrganizerFinance, useOrganizerBankAccount, useRequestWithdrawal, useWithdrawalHistory } from '@/hooks/use-api'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import type { IOrganizerBalance, IOrganizerBankAccount, IWithdrawalRequest, WithdrawalStatus } from '@/lib/types'

const MIN_WITHDRAWAL = 1_000_000 // Rp 1.000.000

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  approved: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  transferred: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  completed: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/20',
  cancelled: 'bg-gray-500/15 text-gray-400/60 border-gray-500/20',
  dispute: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
}

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  return (
    <Badge className={`${STATUS_COLORS[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'} flex items-center gap-1`}>
      {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export default function WithdrawPage() {
  const { selectedEventId } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Data hooks
  const { data: finance, isLoading: financeLoading } = useOrganizerFinance(selectedEventId ?? undefined)
  const { data: bankAccount, isLoading: bankLoading } = useOrganizerBankAccount()
  const { data: withdrawalData, isLoading: withdrawalsLoading } = useWithdrawalHistory()
  const requestWithdrawal = useRequestWithdrawal()

  const balance = finance as IOrganizerBalance | undefined
  const bank = bankAccount as IOrganizerBankAccount | null | undefined
  const withdrawals = (withdrawalData as { data?: IWithdrawalRequest[] } | undefined)?.data ?? []
  const recentWithdrawals = withdrawals.slice(0, 5)

  const availableBalance = balance?.availableBalance ?? 0
  const feePercent = balance?.platformFeePercent ?? 5
  const isSettled = balance?.isSettled ?? false
  const isBankVerified = bank?.isVerified ?? false
  const hasBank = !!bank

  const numAmount = parseInt(amount) || 0
  const feeAmount = Math.round(numAmount * feePercent / 100)
  const netAmount = numAmount - feeAmount

  const isValid = useMemo(() => {
    if (numAmount < MIN_WITHDRAWAL) return false
    if (numAmount > availableBalance) return false
    if (!isBankVerified) return false
    if (!isSettled) return false
    return true
  }, [numAmount, availableBalance, isBankVerified, isSettled])

  const handleWithdraw = () => {
    requestWithdrawal.mutate(
      { amount: numAmount },
      {
        onSuccess: () => {
          toast.success('Withdrawal request submitted', {
            description: `${formatRupiah(netAmount)} will be transferred to ${bank?.bankName} — ${bank?.accountNumber}`,
          })
          setAmount('')
          setConfirmOpen(false)
        },
        onError: (error) => {
          toast.error('Withdrawal failed', {
            description: error instanceof Error ? error.message : 'Please try again',
          })
          setConfirmOpen(false)
        },
      }
    )
  }

  const quickAmounts = [25, 50, 75, 100]

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Withdraw</h1>
        <p className="text-muted-foreground mt-1">Cairkan saldo ke rekening bank</p>
      </div>

      {/* Available Balance */}
      <Card className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/20">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10">
            <Wallet className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-amber-200/60">Available Balance</p>
            {financeLoading ? (
              <Skeleton className="h-8 w-48 bg-amber-500/10" />
            ) : (
              <p className="text-2xl font-bold text-amber-400">{formatRupiah(availableBalance)}</p>
            )}
          </div>
          {balance && !isSettled && (
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" /> Not Settled
            </Badge>
          )}
          {balance && isSettled && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Settled
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Bank Account Status */}
      {bankLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full bg-background" />
          </CardContent>
        </Card>
      ) : !hasBank ? (
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">No bank account configured</p>
              <p className="text-xs text-muted-foreground">Set up your bank account to enable withdrawals</p>
            </div>
            <Link href="/admin/bank-account">
              <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10 text-xs">
                Set Up
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : !isBankVerified ? (
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">Bank account not verified</p>
              <p className="text-xs text-muted-foreground">Withdrawals require a verified bank account</p>
            </div>
            <Link href="/admin/bank-account">
              <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs">
                View
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Balance Not Settled Warning */}
      {balance && !isSettled && hasBank && isBankVerified && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">Balance not yet settled</p>
              <p className="text-xs text-muted-foreground">Withdrawals are only available after balance settlement</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal Form */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Request Withdrawal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Amount (IDR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                disabled={!isSettled || !isBankVerified}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground/50 pl-10 text-lg font-semibold"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Min: {formatRupiah(MIN_WITHDRAWAL)}</span>
              <span
                className="text-foreground/40 cursor-pointer hover:text-foreground/60 transition-colors"
                onClick={() => setAmount(String(availableBalance))}
              >
                Max: {formatRupiah(availableBalance)}
              </span>
            </div>
            {numAmount > 0 && numAmount < MIN_WITHDRAWAL && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Minimum withdrawal is {formatRupiah(MIN_WITHDRAWAL)}
              </p>
            )}
            {numAmount > availableBalance && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Amount exceeds available balance
              </p>
            )}
          </div>

          {/* Fee Preview */}
          {numAmount >= MIN_WITHDRAWAL && numAmount <= availableBalance && (
            <div className="bg-background border border-input rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Withdrawal Amount</span>
                <span className="text-foreground font-medium">{formatRupiah(numAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee ({feePercent}%)</span>
                <span className="text-red-400 font-medium">-{formatRupiah(feeAmount)}</span>
              </div>
              <div className="border-t border-input pt-2 flex justify-between">
                <span className="text-muted-foreground font-medium">You Receive</span>
                <span className="text-foreground font-bold">{formatRupiah(netAmount)}</span>
              </div>
            </div>
          )}

          {/* Bank Account Display */}
          {hasBank && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bank Account</Label>
              <div className="bg-background border border-input rounded-md px-3 py-2.5 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground">
                  {bank!.bankName} — {bank!.accountNumber} ({bank!.accountHolder})
                </span>
                {isBankVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 ml-auto shrink-0" />
                )}
              </div>
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map(pct => (
                <Button
                  key={pct}
                  variant="outline"
                  size="sm"
                  className="border-input text-muted-foreground hover:text-foreground hover:bg-accent text-xs"
                  disabled={!isSettled || !isBankVerified || availableBalance === 0}
                  onClick={() => setAmount(String(Math.floor(availableBalance * pct / 100)))}
                >
                  {pct}%
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!isValid}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 text-base font-semibold"
          >
            <ArrowDownRight className="w-5 h-5 mr-2" />
            Withdraw {numAmount > 0 ? formatRupiah(numAmount) : ''}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Withdrawals */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-sm">Recent Withdrawals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {withdrawalsLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-background" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No withdrawal requests yet</TableCell>
                  </TableRow>
                ) : (
                  recentWithdrawals.map(w => (
                    <TableRow key={w.id} className="border-border hover:bg-accent/50">
                      <TableCell className="text-foreground font-semibold">{formatRupiah(w.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={w.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDateTimeShort(w.requestedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-input text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-background border border-input rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Withdrawal Amount</span>
                <span className="text-foreground font-semibold">{formatRupiah(numAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee ({feePercent}%)</span>
                <span className="text-red-400 font-medium">-{formatRupiah(feeAmount)}</span>
              </div>
              <div className="border-t border-input pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Net Amount Received</span>
                <span className="text-foreground font-bold text-lg">{formatRupiah(netAmount)}</span>
              </div>
            </div>
            {hasBank && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Bank: <span className="text-foreground">{bank!.bankName} — {bank!.accountNumber}</span></p>
                <p>Holder: <span className="text-foreground">{bank!.accountHolder}</span></p>
                <p>Method: <span className="text-foreground">Pending admin approval</span></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="text-muted-foreground">Cancel</Button>
            <Button
              onClick={handleWithdraw}
              disabled={requestWithdrawal.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {requestWithdrawal.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                'Confirm Withdrawal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
