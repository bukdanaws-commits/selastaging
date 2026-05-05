'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  History,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useOrganizerRedemptions } from '@/hooks/use-api'
import { formatDateTimeShort } from '@/lib/utils'

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Aktif</Badge>
    case 'redeemed':
      return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Diredeem</Badge>
    case 'inside':
      return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">Di Dalam Venue</Badge>
    case 'cancelled':
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/20">Dibatalkan</Badge>
    default:
      return <Badge className="bg-gray-500/15 text-gray-400 border-gray-500/20">{status}</Badge>
  }
}

const ITEMS_PER_PAGE = 15

export function RedeemHistoryPage() {
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const { data: redemptionsData, isLoading } = useOrganizerRedemptions('sheila-on-7-melompat-lebih-tinggi')

  // Extract redemptions from paginated response
  const redemptions = useMemo(() => {
    const data = redemptionsData as { data: unknown[] } | undefined
    return (data?.data ?? []) as Record<string, unknown>[]
  }, [redemptionsData])

  // Filter to only redeemed/inside
  const historyData = useMemo(() => {
    return redemptions.filter(
      (t) => String(t.status) === 'redeemed' || String(t.status) === 'inside'
    )
  }, [redemptions])

  // Unique ticket type names
  const ticketTypes = useMemo(() => {
    const types = new Set(historyData.map((t) => String(t.ticketType ?? t.ticketTypeName ?? '')))
    return Array.from(types).filter(Boolean).sort()
  }, [historyData])

  // Filtered data
  const filteredData = useMemo(() => {
    return historyData.filter((t) => {
      const matchesType = ticketTypeFilter === 'all' || String(t.ticketType ?? t.ticketTypeName) === ticketTypeFilter
      const matchesStatus = statusFilter === 'all' || String(t.status) === statusFilter
      return matchesType && matchesStatus
    })
  }, [historyData, ticketTypeFilter, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE))
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleExport = () => {
    toast.success('Export berhasil dimulai', {
      description: 'File riwayat penukaran akan diunduh dalam bentuk Excel.',
    })
  }

  // Reset page when filters change
  const handleTicketTypeChange = (value: string) => {
    setTicketTypeFilter(value)
    setCurrentPage(1)
  }
  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Riwayat Penukaran</h1>
          <p className="text-[#7FB3AE] mt-1">
            Log penukaran gelang hari ini — {filteredData.length} entri
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2 self-start bg-[#111918] border-white/10 text-white hover:bg-white/5 hover:text-white">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#111918] border-white/5">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-[#7FB3AE]" />
            <Select value={ticketTypeFilter} onValueChange={handleTicketTypeChange}>
              <SelectTrigger className="w-[180px] bg-[#0A0F0E] border-white/10 text-white">
                <SelectValue placeholder="Tipe Tiket" />
              </SelectTrigger>
              <SelectContent className="bg-[#111918] border-white/10">
                <SelectItem value="all">Semua Tipe</SelectItem>
                {ticketTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] bg-[#0A0F0E] border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#111918] border-white/10">
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="redeemed">Diredeem</SelectItem>
                <SelectItem value="inside">Di Dalam Venue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-12 text-center text-[#7FB3AE]">#</TableHead>
                  <TableHead className="text-[#7FB3AE]">Kode Tiket</TableHead>
                  <TableHead className="hidden md:table-cell text-[#7FB3AE]">Peserta</TableHead>
                  <TableHead className="hidden sm:table-cell text-[#7FB3AE]">Tipe</TableHead>
                  <TableHead className="hidden lg:table-cell text-[#7FB3AE]">Zona</TableHead>
                  <TableHead className="text-[#7FB3AE]">Kode Gelang</TableHead>
                  <TableHead className="hidden sm:table-cell text-[#7FB3AE]">Waktu</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-[#7FB3AE]">
                        <History className="h-10 w-10 opacity-20" />
                        <p>Tidak ada riwayat penukaran ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((ticket, index) => (
                    <TableRow key={String(ticket.id ?? index)} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="text-center text-[#7FB3AE] text-sm">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-white">
                          {String(ticket.ticketCode ?? '-')}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-white">
                        {String(ticket.userName ?? ticket.attendeeName ?? '-')}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-[#7FB3AE]">
                        {String(ticket.ticketType ?? ticket.ticketTypeName ?? '-')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-[#7FB3AE] capitalize">
                        {String(ticket.tier ?? '-')}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-[#00A39D]">
                          {String(ticket.wristbandCode ?? '—')}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-[#7FB3AE]">
                        {ticket.redeemedAt
                          ? formatDateTimeShort(String(ticket.redeemedAt))
                          : '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(String(ticket.status))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-sm text-[#7FB3AE]">
                Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} dari{' '}
                {filteredData.length} entri
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-[#0A0F0E] border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, i, arr) => (
                    <span key={page} className="contents">
                      {i > 0 && arr[i - 1] !== page - 1 && (
                        <span className="px-1 text-[#7FB3AE]">…</span>
                      )}
                      <Button
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="icon"
                        className={cn(
                          'h-8 w-8',
                          page === currentPage
                            ? 'bg-[#00A39D] hover:bg-[#00A39D]/90 text-white border-0'
                            : 'bg-[#0A0F0E] border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5'
                        )}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </span>
                  ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-[#0A0F0E] border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
