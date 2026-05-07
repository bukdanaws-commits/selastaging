'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp, AlertTriangle, ExternalLink, Loader2, Zap, Landmark } from 'lucide-react'
import { formatRupiah, formatDateTimeShort } from '@/lib/utils'
import { useWithdrawalHistory } from '@/hooks/use-api'
import { useMockStore } from '@/lib/mock/mock-store'
import { toast } from 'sonner'
import type { IWithdrawalRequest, WithdrawalStatus, WithdrawalMethod } from '@/lib/types'

const STATUS_COLORS: Record<WithdrawalStatus, string> = {
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
    <Badge className={`${STATUS_COLORS[status]} flex items-center gap-1`}>
      {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function MethodBadge({ method }: { method: WithdrawalMethod }) {
  if (method === 'AUTO_DOKU') {
    return (
      <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/20 flex items-center gap-1">
        <Zap className="w-3 h-3" /> Auto (DOKU)
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-500/15 text-gray-400 border-gray-500/20 flex items-center gap-1">
      <Landmark className="w-3 h-3" /> Manual
    </Badge>
  )
}

const ALL_STATUSES: WithdrawalStatus[] = ['pending', 'approved', 'processing', 'transferred', 'completed', 'rejected', 'cancelled', 'dispute']

export default function WithdrawalHistoryPage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [disputeId, setDisputeId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Data hooks
  const { data: withdrawalData, isLoading, refetch } = useWithdrawalHistory()
  const withdrawals = ((withdrawalData as { data?: IWithdrawalRequest[] } | undefined)?.data ?? []) as IWithdrawalRequest[]

  // Sort by date (newest first) and apply filter
  const filteredWithdrawals = useMemo(() => {
    const sorted = [...withdrawals].sort((a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    )
    if (statusFilter === 'all') return sorted
    return sorted.filter(w => w.status === statusFilter)
  }, [withdrawals, statusFilter])

  const handleDispute = () => {
    if (!disputeId) return
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute')
      return
    }
    try {
      useMockStore.getState().disputeWithdrawal(disputeId, disputeReason.trim())
      toast.success('Dispute submitted', {
        description: 'Our team will review your dispute within 1-3 business days.',
      })
      setDisputeId(null)
      setDisputeReason('')
      refetch()
    } catch {
      toast.error('Failed to submit dispute')
    }
  }

  const maskAccountNumber = (acc: string) => {
    if (acc.length <= 4) return acc
    return acc.slice(0, 4) + '****' + acc.slice(-3)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Withdrawal History</h1>
          <p className="text-muted-foreground mt-1">Riwayat pencairan dana</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-background border-input text-foreground text-sm">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-input">
              <SelectItem value="all" className="text-foreground">All Status</SelectItem>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-foreground">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-background" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-8"></TableHead>
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">Method</TableHead>
                    <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Bank</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {statusFilter !== 'all' ? 'No withdrawals with this status' : 'No withdrawal history'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWithdrawals.map(w => (
                      <div key={w.id}>
                        <TableRow
                          className="border-border hover:bg-accent/50 cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === w.id ? null : w.id)}
                        >
                          <TableCell className="w-8">
                            {expandedRow === w.id
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            }
                          </TableCell>
                          <TableCell className="font-mono text-xs text-foreground max-w-[100px] truncate">
                            {w.id.slice(0, 16)}...
                          </TableCell>
                          <TableCell>
                            <MethodBadge method={w.method} />
                          </TableCell>
                          <TableCell className="text-right text-foreground font-semibold">{formatRupiah(w.amount)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {w.bankName} — {maskAccountNumber(w.accountNumber)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={w.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateTimeShort(w.requestedAt)}</TableCell>
                        </TableRow>
                        {expandedRow === w.id && (
                          <TableRow className="border-border bg-accent/25">
                            <TableCell colSpan={7} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Withdrawal Amount</p>
                                  <p className="text-foreground font-semibold">{formatRupiah(w.amount)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Platform Fee</p>
                                  <p className="text-red-400">-{formatRupiah(w.fee)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Net Received</p>
                                  <p className="text-foreground font-bold">{formatRupiah(w.netAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Method</p>
                                  <MethodBadge method={w.method} />
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Bank Account</p>
                                  <p className="text-foreground">{w.bankName} — {w.accountNumber}</p>
                                  <p className="text-muted-foreground text-xs">{w.accountHolder}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Requested At</p>
                                  <p className="text-foreground">{formatDateTimeShort(w.requestedAt)}</p>
                                </div>
                                {w.approvedAt && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Approved At</p>
                                    <p className="text-foreground">{formatDateTimeShort(w.approvedAt)}</p>
                                    {w.approvedBy && <p className="text-muted-foreground text-xs">by {w.approvedBy}</p>}
                                  </div>
                                )}
                                {w.transferredAt && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Transferred At</p>
                                    <p className="text-foreground">{formatDateTimeShort(w.transferredAt)}</p>
                                  </div>
                                )}
                                {w.completedAt && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Completed At</p>
                                    <p className="text-foreground">{formatDateTimeShort(w.completedAt)}</p>
                                  </div>
                                )}
                                {w.rejectedAt && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Rejected At</p>
                                    <p className="text-foreground">{formatDateTimeShort(w.rejectedAt)}</p>
                                    {w.rejectedReason && (
                                      <p className="text-red-400 text-xs mt-0.5">Reason: {w.rejectedReason}</p>
                                    )}
                                  </div>
                                )}
                                {w.method === 'AUTO_DOKU' && w.dokuReferenceNo && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">DOKU Reference</p>
                                    <p className="text-foreground font-mono text-xs">{w.dokuReferenceNo}</p>
                                    {w.dokuDisbursementId && (
                                      <p className="text-muted-foreground text-xs mt-0.5">Disbursement: {w.dokuDisbursementId}</p>
                                    )}
                                    {w.dokuStatus && (
                                      <p className="text-muted-foreground text-xs mt-0.5">DOKU Status: {w.dokuStatus}</p>
                                    )}
                                  </div>
                                )}
                                {w.method === 'AUTO_DOKU' && w.status === 'processing' && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">DOKU Processing</p>
                                    <div className="flex items-center gap-2 text-blue-400">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span className="text-xs">Auto-disbursing via DOKU...</span>
                                    </div>
                                    {w.dokuReferenceNo && (
                                      <p className="text-foreground font-mono text-xs mt-1">Ref: {w.dokuReferenceNo}</p>
                                    )}
                                  </div>
                                )}
                                {w.failureReason && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Failure Reason</p>
                                    <p className="text-red-400 text-xs">{w.failureReason}</p>
                                  </div>
                                )}
                                {w.disputeReason && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Dispute Reason</p>
                                    <p className="text-orange-400 text-xs">{w.disputeReason}</p>
                                  </div>
                                )}
                                {w.transferProof && w.transferProof !== 'auto_doku' && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Transfer Proof</p>
                                    <Button variant="outline" size="sm" className="border-input text-muted-foreground hover:text-foreground text-xs h-7">
                                      <ExternalLink className="w-3 h-3 mr-1" /> View Proof
                                    </Button>
                                  </div>
                                )}
                                {w.transferNote && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Transfer Note</p>
                                    <p className="text-foreground text-xs">{w.transferNote}</p>
                                  </div>
                                )}
                                <div className="flex items-end gap-2 col-span-2 md:col-span-4">
                                  {(w.status === 'transferred' || w.status === 'completed') && !w.disputeReason && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs"
                                      onClick={(e) => { e.stopPropagation(); setDisputeId(w.id); setDisputeReason('') }}
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" /> Dispute
                                    </Button>
                                  )}
                                  {w.status === 'pending' && (
                                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                                      Waiting for admin approval
                                    </Badge>
                                  )}
                                  {w.status === 'approved' && (
                                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                                      Approved — awaiting transfer
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </div>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute Dialog */}
      <Dialog open={!!disputeId} onOpenChange={(open) => { if (!open) { setDisputeId(null); setDisputeReason('') } }}>
        <DialogContent className="bg-card border-input text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" /> Dispute Withdrawal?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Jika dana belum diterima, laporkan masalah ini. Tim SeleEvent akan menindaklanjuti dalam 1-3 hari kerja.
            </p>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Reason for dispute *</Label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue..."
                className="bg-background border-input text-foreground placeholder:text-muted-foreground/50 min-h-[80px] text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDisputeId(null); setDisputeReason('') }} className="text-muted-foreground">Cancel</Button>
            <Button
              onClick={handleDispute}
              disabled={!disputeReason.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
