'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Edit2, CheckCircle2, AlertTriangle, Info, RefreshCw } from 'lucide-react'
import { useOrganizerBankAccount, useSaveBankAccount } from '@/hooks/use-api'
import { toast } from 'sonner'
import type { IOrganizerBankAccount } from '@/lib/types'

const BANK_OPTIONS = [
  'Bank BSI',
  'Bank Mandiri',
  'BCA',
  'BNI',
  'BRI',
  'Bank Permata',
  'CIMB Niaga',
  'Danamon',
  'Maybank',
]

export default function BankAccountPage() {
  // ─── React Query hooks ──────────────────────────────────────────────────
  const {
    data: bankAccount,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrganizerBankAccount()

  const saveBankAccount = useSaveBankAccount()

  // ─── Local dialog state ─────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  })

  // Sync form with fetched data when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setForm({
        bankName: bankAccount?.bankName ?? '',
        accountNumber: bankAccount?.accountNumber ?? '',
        accountHolder: bankAccount?.accountHolder ?? '',
      })
    }
  }, [dialogOpen, bankAccount])

  // ─── Save handler ───────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.bankName || !form.accountNumber || !form.accountHolder) return

    saveBankAccount.mutate(
      {
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountHolder: form.accountHolder,
      },
      {
        onSuccess: () => {
          toast.success(bankAccount ? 'Bank account updated successfully' : 'Bank account added successfully', {
            description: 'Your bank account will be verified by SeleEvent within 1-3 business days.',
          })
          setDialogOpen(false)
        },
        onError: (err) => {
          toast.error('Failed to save bank account', {
            description: err instanceof Error ? err.message : 'Please try again.',
          })
        },
      },
    )
  }

  // ─── Loading State ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Error State ────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bank Account</h1>
          <p className="text-muted-foreground mt-1">Kelola rekening pencairan dana</p>
        </div>
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Failed to Load Bank Account</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An error occurred while loading bank account data'}
            </p>
            <Button variant="outline" onClick={() => refetch()} className="border-primary/30 text-primary hover:bg-primary/10">
              <RefreshCw className="w-4 h-4 mr-1" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Determine bank account state ───────────────────────────────────────
  const bank: IOrganizerBankAccount | null = bankAccount ?? null
  const isVerified = bank?.isVerified ?? false

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bank Account</h1>
        <p className="text-muted-foreground mt-1">Kelola rekening pencairan dana</p>
      </div>

      {/* Info Note */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Verifikasi Rekening</p>
            <p className="text-xs text-blue-200/60 mt-0.5">Rekening akan diverifikasi oleh SeleEvent sebelum pencairan dana. Proses verifikasi membutuhkan 1-3 hari kerja.</p>
          </div>
        </CardContent>
      </Card>

      {!bank ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-foreground/10 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">No Bank Account</p>
            <p className="text-sm text-muted-foreground mb-4">Tambahkan rekening bank untuk menerima pencairan dana</p>
            <Button onClick={() => { setForm({ bankName: '', accountNumber: '', accountHolder: '' }); setDialogOpen(true) }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Edit2 className="w-4 h-4 mr-1" /> Add Bank Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Bank Account Details
              </CardTitle>
              <Badge className={isVerified
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
              }>
                {isVerified ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</>
                ) : (
                  <><AlertTriangle className="w-3 h-3 mr-1" /> Unverified</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Bank</p>
                <p className="text-foreground font-medium">{bank.bankName}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Account Number</p>
                <p className="text-foreground font-mono font-medium">{bank.accountNumber}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Account Holder</p>
                <p className="text-foreground font-medium">{bank.accountHolder}</p>
              </div>
            </div>

            {/* Verification Status Info */}
            {!isVerified && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-foreground font-medium">Verification Pending</p>
                  <p className="text-[11px] text-muted-foreground">This bank account is awaiting verification. Withdrawals will be available once verified.</p>
                </div>
              </div>
            )}

            {isVerified && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-foreground font-medium">Verified Account</p>
                  <p className="text-[11px] text-muted-foreground">This bank account has been verified and is ready for withdrawals.</p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => { setForm({ bankName: bank.bankName, accountNumber: bank.accountNumber, accountHolder: bank.accountHolder }); setDialogOpen(true) }}
              >
                <Edit2 className="w-4 h-4 mr-1" /> Edit Bank Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-input text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{bank ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bank Name *</Label>
              <select
                value={form.bankName}
                onChange={e => setForm(prev => ({ ...prev, bankName: e.target.value }))}
                className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" className="bg-background">Select bank...</option>
                {BANK_OPTIONS.map(bankOpt => (
                  <option key={bankOpt} value={bankOpt} className="bg-background">{bankOpt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Account Number *</Label>
              <Input value={form.accountNumber} onChange={e => setForm(prev => ({ ...prev, accountNumber: e.target.value }))} placeholder="Enter account number" className="bg-background border-input text-foreground placeholder:text-muted-foreground/50 font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Account Holder Name *</Label>
              <Input value={form.accountHolder} onChange={e => setForm(prev => ({ ...prev, accountHolder: e.target.value }))} placeholder="Name as shown on bank account" className="bg-background border-input text-foreground placeholder:text-muted-foreground/50" />
            </div>

            {bank && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-xs text-yellow-200/80">
                  <strong>Note:</strong> Updating your bank account will reset verification status. The new details will need to be re-verified before withdrawals can proceed.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.bankName || !form.accountNumber || !form.accountHolder || saveBankAccount.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saveBankAccount.isPending ? 'Saving...' : bank ? 'Update' : 'Save Bank Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
