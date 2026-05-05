'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { useOrganizerRedemptions } from '@/hooks/use-api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

// ─── LOCAL TYPES ──────────────────────────────────────────────────────────────

type TicketRecord = {
  id: string
  ticketCode: string
  attendeeName: string
  ticketTypeName: string
  zone: string
  status: 'active' | 'redeemed' | 'inside_venue' | 'cancelled'
  wristbandCode: string | null
  redeemedAt: string | null
}

function getStatusBadge(status: TicketRecord['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
    case 'redeemed':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Diredeem</Badge>
    case 'inside_venue':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Di Dalam Venue</Badge>
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Dibatalkan</Badge>
  }
}

const ITEMS_PER_PAGE = 15

export function RedeemHistoryPage() {
  const { data: redemptionsData, isLoading, error } = useOrganizerRedemptions('')
  const mockTickets: TicketRecord[] = (redemptionsData as any)?.data ?? (redemptionsData as any) ?? []

  const [ticketTypeFilter, setTicketTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Base data: tickets that have been redeemed or are inside venue
  const historyData = useMemo(() => {
    return mockTickets.filter(
      (t) => t.status === 'redeemed' || t.status === 'inside_venue'
    )
  }, [mockTickets])

  // Unique ticket type names
  const ticketTypes = useMemo(() => {
    const types = new Set(historyData.map((t) => t.ticketTypeName))
    return Array.from(types).sort()
  }, [historyData])

  // Filtered data
  const filteredData = useMemo(() => {
    return historyData.filter((t) => {
      const matchesType = ticketTypeFilter === 'all' || t.ticketTypeName === ticketTypeFilter
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter
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

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>
  if (error) return <div className="p-6 text-red-500">Failed to load data: {error.message}</div>

  // Reset page when filters change
  const handleTicketTypeChange = (value: string) => {
    setTicketTypeFilter(value)
    setCurrentPage(1)
  }
  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Riwayat Penukaran</h1>
          <p className="text-muted-foreground mt-1">
            Log penukaran gelang hari ini — {filteredData.length} entri
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2 self-start">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={ticketTypeFilter} onValueChange={handleTicketTypeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipe Tiket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {ticketTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="redeemed">Diredeem</SelectItem>
                <SelectItem value="inside_venue">Di Dalam Venue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Kode Tiket</TableHead>
                  <TableHead className="hidden md:table-cell">Peserta</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipe</TableHead>
                  <TableHead className="hidden lg:table-cell">Zona</TableHead>
                  <TableHead>Kode Gelang</TableHead>
                  <TableHead className="hidden sm:table-cell">Waktu</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <History className="h-10 w-10 opacity-20" />
                        <p>Tidak ada riwayat penukaran ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((ticket, index) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">
                          {ticket.ticketCode}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {ticket.attendeeName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {ticket.ticketTypeName}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm capitalize">
                        {ticket.zone}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-primary">
                          {ticket.wristbandCode || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {ticket.redeemedAt
                          ? format(new Date(ticket.redeemedAt), 'HH:mm', { locale: localeId })
                          : '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} dari{' '}
                {filteredData.length} entri
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
                        <span className="px-1 text-muted-foreground">…</span>
                      )}
                      <Button
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </span>
                  ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
