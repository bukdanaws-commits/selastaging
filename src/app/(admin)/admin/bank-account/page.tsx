'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Building2, Edit2, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

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

interface BankAccount {
  bankName: string
  accountNumber: string
  accountHolder: string
  verified: boolean
}

const MOCK_BANK: BankAccount | null = {
  bankName: 'Bank BSI',
  accountNumber: '7123456789',
  accountHolder: 'PT SeleEvent Indonesia',
  verified: true,
}

export default function BankAccountPage() {
  const [bank, setBank] = useState<BankAccount | null>(MOCK_BANK)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    bankName: bank?.bankName ?? '',
    accountNumber: bank?.accountNumber ?? '',
    accountHolder: bank?.accountHolder ?? '',
  })

  const handleSave = () => {
    if (!form.bankName || !form.accountNumber || !form.accountHolder) return
    setBank({
      ...form,
      verified: false,
    })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Bank Account</h1>
        <p className="text-[#7FB3AE] mt-1">Kelola rekening pencairan dana</p>
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
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No Bank Account</p>
            <p className="text-sm text-[#7FB3AE] mb-4">Tambahkan rekening bank untuk menerima pencairan dana</p>
            <Button onClick={() => { setForm({ bankName: '', accountNumber: '', accountHolder: '' }); setDialogOpen(true) }} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
              <Edit2 className="w-4 h-4 mr-1" /> Add Bank Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#111918] border-white/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00A39D]" />
                Bank Account Details
              </CardTitle>
              <Badge className={bank.verified
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
              }>
                {bank.verified ? (
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
                <p className="text-[11px] text-[#7FB3AE] mb-1">Bank</p>
                <p className="text-white font-medium">{bank.bankName}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#7FB3AE] mb-1">Account Number</p>
                <p className="text-white font-mono font-medium">{bank.accountNumber}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#7FB3AE] mb-1">Account Holder</p>
                <p className="text-white font-medium">{bank.accountHolder}</p>
              </div>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#00A39D]/30 text-[#00A39D] hover:bg-[#00A39D]/10"
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
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{bank ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Bank Name *</Label>
              <select
                value={form.bankName}
                onChange={e => setForm(prev => ({ ...prev, bankName: e.target.value }))}
                className="w-full bg-[#0A0F0E] border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00A39D]"
              >
                <option value="" className="bg-[#0A0F0E]">Select bank...</option>
                {BANK_OPTIONS.map(bank => (
                  <option key={bank} value={bank} className="bg-[#0A0F0E]">{bank}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Account Number *</Label>
              <Input value={form.accountNumber} onChange={e => setForm(prev => ({ ...prev, accountNumber: e.target.value }))} placeholder="Enter account number" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30 font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Account Holder Name *</Label>
              <Input value={form.accountHolder} onChange={e => setForm(prev => ({ ...prev, accountHolder: e.target.value }))} placeholder="Name as shown on bank account" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.bankName || !form.accountNumber || !form.accountHolder} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
              {bank ? 'Update' : 'Save Bank Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
