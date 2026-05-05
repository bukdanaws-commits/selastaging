'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'

type WithdrawalStatus = 'pending' | 'processing' | 'transferred' | 'failed' | 'disputed'

interface Withdrawal {
  id: string
  amount: number
  fee: number
  net: number
  bank: string
  bankAccount: string
  status: WithdrawalStatus
  requestedAt: string
  completedAt: string | null
  transferProof: string | null
  notes: string | null
}

const STATUS_COLORS: Record<WithdrawalStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  transferred: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  disputed: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
}

const MOCK_WITHDRAWALS: Withdrawal[] = [
  { id: 'wd-1', amount: 5_000_000_000, fee: 0, net: 5_000_000_000, bank: 'Bank BSI', bankAccount: '7123****789', status: 'transferred', requestedAt: '2025-06-29T10:00:00Z', completedAt: '2025-07-01T14:00:00Z', transferProof: 'https://example.com/proof/wd1.pdf', notes: 'Transferred successfully' },
  { id: 'wd-2', amount: 10_000_000_000, fee: 0, net: 10_000_000_000, bank: 'Bank BSI', bankAccount: '7123****789', status: 'processing', requestedAt: '2025-07-02T08:00:00Z', completedAt: null, transferProof: null, notes: 'Processing withdrawal' },
  { id: 'wd-3', amount: 2_000_000_000, fee: 0, net: 2_000_000_000, bank: 'Bank BSI', bankAccount: '7123****789', status: 'pending', requestedAt: '2025-07-03T09:00:00Z', completedAt: null, transferProof: null, notes: null },
  { id: 'wd-4', amount: 3_000_000_000, fee: 0, net: 3_000_000_000, bank: 'Bank BSI', bankAccount: '7123****789', status: 'transferred', requestedAt: '2025-06-20T11:00:00Z', completedAt: '2025-06-22T15:00:00Z', transferProof: 'https://example.com/proof/wd4.pdf', notes: 'Transferred successfully' },
  { id: 'wd-5', amount: 1_500_000_000, fee: 0, net: 1_500_000_000, bank: 'Bank Mandiri', bankAccount: '1234****567', status: 'failed', requestedAt: '2025-06-15T08:00:00Z', completedAt: null, transferProof: null, notes: 'Bank account error' },
]

export default function WithdrawalHistoryPage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [disputeId, setDisputeId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Withdrawal History</h1>
        <p className="text-muted-foreground mt-1">Riwayat pencairan dana</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground w-8"></TableHead>
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Bank</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Requested</TableHead>
                  <TableHead className="text-muted-foreground">Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_WITHDRAWALS.map(w => (
                  <>
                    <TableRow
                      key={w.id}
                      className="border-border hover:bg-accent/50 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === w.id ? null : w.id)}
                    >
                      <TableCell className="w-8">
                        {expandedRow === w.id
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">{w.id.toUpperCase()}</TableCell>
                      <TableCell className="text-right text-foreground font-semibold">{formatRupiah(w.amount)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{w.bank} — {w.bankAccount}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[w.status]}>{w.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDateTimeShort(w.requestedAt)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{w.completedAt ? formatDateTimeShort(w.completedAt) : '—'}</TableCell>
                    </TableRow>
                    {expandedRow === w.id && (
                      <TableRow key={`${w.id}-detail`} className="border-border bg-accent/25">
                        <TableCell colSpan={7} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Amount</p>
                              <p className="text-foreground">{formatRupiah(w.amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Fee</p>
                              <p className="text-emerald-400">{formatRupiah(w.fee)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Net Received</p>
                              <p className="text-foreground font-bold">{formatRupiah(w.net)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Bank</p>
                              <p className="text-foreground">{w.bank} — {w.bankAccount}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Notes</p>
                              <p className="text-foreground">{w.notes ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Requested At</p>
                              <p className="text-foreground">{formatDateTimeShort(w.requestedAt)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Completed At</p>
                              <p className="text-foreground">{w.completedAt ? formatDateTimeShort(w.completedAt) : '—'}</p>
                            </div>
                            <div className="flex items-end gap-2">
                              {w.transferProof && (
                                <Button variant="outline" size="sm" className="border-input text-muted-foreground hover:text-foreground text-xs">
                                  <ExternalLink className="w-3 h-3 mr-1" /> Proof
                                </Button>
                              )}
                              {w.status === 'transferred' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs"
                                  onClick={(e) => { e.stopPropagation(); setDisputeId(w.id) }}
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Dispute
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Dialog */}
      <Dialog open={!!disputeId} onOpenChange={() => setDisputeId(null)}>
        <DialogContent className="bg-card border-input text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Dispute Withdrawal?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Jika dana belum diterima, laporkan masalah ini. Tim SeleEvent akan menindaklanjuti dalam 1-3 hari kerja.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDisputeId(null)} className="text-muted-foreground">Cancel</Button>
            <Button onClick={() => setDisputeId(null)} className="bg-orange-500 hover:bg-orange-600 text-foreground">Submit Dispute</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
