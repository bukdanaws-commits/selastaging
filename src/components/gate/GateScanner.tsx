'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  ArrowRightLeft,
  RotateCcw,
  Keyboard,
  User,
  Ticket,
  Watch,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useGateScan, useGateProfile } from '@/hooks/use-api'
import type { IGateScanResponse } from '@/lib/types'

type ScanResultType = 'success_in' | 'success_out' | 'error_not_found' | 'error_already_inside' | 'error_not_entered' | 'error_not_redeemed' | 'idle'

interface ScanResult {
  type: ScanResultType
  attendee: Record<string, unknown> | null
  message: string
}

export function GateScanner() {
  const [searchValue, setSearchValue] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [successAction, setSuccessAction] = useState<'IN' | 'OUT'>('IN')

  const scanMutation = useGateScan()
  const { data: profileData, isLoading: profileLoading } = useGateProfile()

  // Get gate info from profile
  const profile = profileData as Record<string, unknown> | undefined
  const gateInfo = profile?.gate as Record<string, unknown> | undefined
  const gateName = (gateInfo?.name as string) ?? 'Gate'
  const gateType = (gateInfo?.type as string) ?? 'both'
  const gateLocation = (gateInfo?.location as string) ?? ''
  const gateStatus = (gateInfo?.status as string) ?? 'active'
  const gateId = (gateInfo?.id as string) ?? ''

  const staffInfo = profile?.staff as Record<string, unknown> | undefined
  const staffName = (staffInfo?.name as string) ?? 'Gate Staff'

  const handleScan = useCallback(async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return

    try {
      // Determine action based on gate type
      const action: 'entry' | 'exit' = gateType === 'exit' ? 'exit' : 'entry'

      const scanResult = await scanMutation.mutateAsync({
        ticketCode: trimmed,
        gateId,
        action,
      })

      const resp = scanResult as IGateScanResponse

      if (resp.success) {
        if (action === 'entry') {
          setResult({ type: 'success_in', attendee: { ...resp }, message: 'Izinkan masuk' })
        } else {
          setResult({ type: 'success_out', attendee: { ...resp }, message: 'Izinkan keluar' })
        }
      } else {
        // Handle error cases from response
        const errorMsg = resp.error ?? 'Unknown error'
        if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('invalid')) {
          setResult({ type: 'error_not_found', attendee: null, message: 'Tiket tidak ditemukan' })
        } else if (errorMsg.toLowerCase().includes('already inside') || errorMsg.toLowerCase().includes('sudah masuk')) {
          setResult({ type: 'error_already_inside', attendee: { ...resp }, message: 'Sudah di dalam venue' })
        } else if (errorMsg.toLowerCase().includes('not redeemed') || errorMsg.toLowerCase().includes('belum ditukar')) {
          setResult({ type: 'error_not_redeemed', attendee: { ...resp }, message: 'Tiket belum ditukar gelang!' })
        } else if (errorMsg.toLowerCase().includes('not entered') || errorMsg.toLowerCase().includes('belum masuk')) {
          setResult({ type: 'error_not_entered', attendee: { ...resp }, message: 'Penonton belum masuk' })
        } else {
          setResult({ type: 'error_not_found', attendee: null, message: errorMsg })
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Scan gagal'
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('invalid')) {
        setResult({ type: 'error_not_found', attendee: null, message: 'Tiket tidak ditemukan' })
      } else if (message.toLowerCase().includes('already inside')) {
        setResult({ type: 'error_already_inside', attendee: null, message: 'Sudah di dalam venue' })
      } else if (message.toLowerCase().includes('not redeemed')) {
        setResult({ type: 'error_not_redeemed', attendee: null, message: 'Tiket belum ditukar gelang!' })
      } else {
        setResult({ type: 'error_not_found', attendee: null, message })
      }
    }
  }, [gateId, gateType, scanMutation])

  const handleSimulateScan = useCallback(() => {
    toast.info('Fitur simulasi scan tidak tersedia dengan backend API')
  }, [])

  const handleManualSearch = useCallback(() => {
    if (!searchValue.trim()) return
    handleScan(searchValue)
  }, [searchValue, handleScan])

  const handleConfirm = useCallback((action: 'IN' | 'OUT') => {
    setSuccessAction(action)
    setShowSuccessOverlay(true)
    setTimeout(() => {
      setShowSuccessOverlay(false)
      setResult(null)
      setSearchValue('')
    }, 2200)
  }, [])

  const handleReset = useCallback(() => {
    setResult(null)
    setSearchValue('')
  }, [])

  const getWristbandConfig = (ticketType: string) => {
    // Could fetch from API, for now return basic info from scan result
    return null
  }

  if (profileLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-4 gap-4">
        <Skeleton className="h-64 w-64 rounded-2xl" />
        <Skeleton className="h-10 w-full max-w-sm" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── VIEWFINDER / SCANNER AREA ─────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-5"
            >
              {/* Simulated camera viewfinder */}
              <div
                className="relative w-64 h-64 rounded-2xl bg-[#111918] border-2 border-[#00A39D]/30 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={handleSimulateScan}
              >
                {/* Scan grid lines */}
                <div className="absolute inset-0">
                  {/* Corner brackets */}
                  <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#00A39D] rounded-tl-lg" />
                  <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#00A39D] rounded-tr-lg" />
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#00A39D] rounded-bl-lg" />
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#00A39D] rounded-br-lg" />
                  {/* Center cross */}
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-[#00A39D]/20" />
                  <div className="absolute left-1/2 top-4 bottom-4 w-px bg-[#00A39D]/20" />
                </div>

                {scanMutation.isPending ? (
                  <motion.div
                    initial={{ y: -100 }}
                    animate={{ y: [-100, 100, -100] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-[#00A39D] to-transparent"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#7FB3AE] z-10">
                    <ScanLine className="h-10 w-10 text-[#00A39D]/60" />
                    <p className="text-xs font-medium">Tap untuk scan simulasi</p>
                  </div>
                )}
              </div>

              {/* Gate action context */}
              <div className="flex items-center gap-2">
                {gateType === 'entry' && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 gap-1.5 px-3 py-1">
                    <LogIn className="h-3.5 w-3.5" />
                    MASUK
                  </Badge>
                )}
                {gateType === 'exit' && (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 gap-1.5 px-3 py-1">
                    <LogOut className="h-3.5 w-3.5" />
                    KELUAR
                  </Badge>
                )}
                {gateType === 'both' && (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1.5 px-3 py-1">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    MASUK / KELUAR
                  </Badge>
                )}
              </div>

              <p className="text-[11px] text-[#7FB3AE] text-center max-w-[260px]">
                Arahkan kamera ke QR code gelang atau tiket penonton
              </p>

              {/* Manual input */}
              <div className="w-full max-w-sm">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7FB3AE]" />
                    <Input
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                      placeholder="Scan gelang / tiket..."
                      className="pl-9 h-10 bg-[#111918] border-white/10 text-sm placeholder:text-[#7FB3AE]/50 focus:border-[#00A39D]/50"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleManualSearch}
                    disabled={scanMutation.isPending}
                    className="h-10 bg-[#00A39D] hover:bg-[#00A39D]/80 text-white shrink-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── SCAN RESULT PANEL ──────────────────────────────────────── */
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full px-1"
            >
              {/* Error states */}
              {(result.type === 'error_not_found' ||
                result.type === 'error_already_inside' ||
                result.type === 'error_not_entered') && (
                <Card className="bg-[#111918] border-white/5">
                  <CardContent className="p-5 flex flex-col items-center gap-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    >
                      {result.type === 'error_not_found' ? (
                        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
                          <XCircle className="h-8 w-8 text-red-400" />
                        </div>
                      ) : result.type === 'error_already_inside' ? (
                        <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
                          <AlertTriangle className="h-8 w-8 text-amber-400" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
                          <XCircle className="h-8 w-8 text-red-400" />
                        </div>
                      )}
                    </motion.div>
                    <div>
                      <h3 className="text-base font-bold text-white">{result.message}</h3>
                      <p className="text-xs text-[#7FB3AE] mt-1">
                        {result.type === 'error_not_found' && 'Pastikan kode tiket atau gelang sudah benar'}
                        {result.type === 'error_already_inside' && 'Penonton sudah berada di dalam venue saat ini'}
                        {result.type === 'error_not_entered' && 'Penonton belum melakukan scan masuk sebelumnya'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="mt-2 border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Scan Ulang
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Not redeemed warning */}
              {result.type === 'error_not_redeemed' && (
                <Card className="bg-[#111918] border-amber-500/30">
                  <CardContent className="p-5 flex flex-col items-center gap-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    >
                      <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-amber-400" />
                      </div>
                    </motion.div>
                    <div>
                      <h3 className="text-base font-bold text-amber-400">{result.message}</h3>
                      <p className="text-xs text-[#7FB3AE] mt-1">
                        Penonton harus menukar tiket dengan gelang di counter redeem terlebih dahulu
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="border-white/10 text-[#7FB3AE] hover:text-white hover:bg-white/5"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Scan Ulang
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Success states (entry / exit) */}
              {(result.type === 'success_in' || result.type === 'success_out') && result.attendee && (
                <Card className="bg-[#111918] border-white/5">
                  <CardContent className="p-5 space-y-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00A39D]/15">
                          <User className="h-5 w-5 text-[#00A39D]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {String(result.attendee.attendeeName ?? '-')}
                          </h3>
                          <p className="text-[11px] text-[#7FB3AE] mt-0.5">
                            {String(result.attendee.ticketTypeName ?? '-')}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                        {result.type === 'success_in' ? 'MASUK' : 'KELUAR'}
                      </Badge>
                    </div>

                    {/* Detail rows */}
                    <div className="bg-[#0A0F0E] rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-[#7FB3AE]">
                          <Ticket className="h-3.5 w-3.5" />
                          <span>Tiket</span>
                        </div>
                        <span className="text-xs font-mono text-white">{String(result.attendee.ticketCode ?? '-')}</span>
                      </div>
                      {result.attendee.wristbandColor != null && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-[#7FB3AE]">
                            <Watch className="h-3.5 w-3.5" />
                            <span>Gelang</span>
                          </div>
                          <span className="text-xs text-white">{String(result.attendee.wristbandColor)}</span>
                        </div>
                      )}
                      {(result.attendee.reentryCount as number) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#7FB3AE]">Re-entry</span>
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                            {String(result.attendee.reentryCount)}x
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {gateType === 'both' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleConfirm('IN')}
                          className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm gap-2"
                        >
                          <LogIn className="h-4 w-4" />
                          IZINKAN MASUK
                        </Button>
                        <Button
                          onClick={() => handleConfirm('OUT')}
                          className="h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          IZINKAN KELUAR
                        </Button>
                      </div>
                    ) : result.type === 'success_in' ? (
                      <Button
                        onClick={() => handleConfirm('IN')}
                        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm gap-2"
                      >
                        <LogIn className="h-4 w-4" />
                        IZINKAN MASUK
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleConfirm('OUT')}
                        className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        IZINKAN KELUAR
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    )}

                    {/* Reset */}
                    <Button
                      variant="ghost"
                      onClick={handleReset}
                      className="w-full text-[#7FB3AE] hover:text-white hover:bg-white/5 text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Scan Berikutnya
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── SUCCESS OVERLAY ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0A0F0E]/95 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={cn(
                'w-28 h-28 rounded-full flex items-center justify-center mb-6',
                successAction === 'IN' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
              )}
            >
              <CheckCircle2
                className={cn(
                  'h-16 w-16',
                  successAction === 'IN' ? 'text-emerald-400' : 'text-amber-400'
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                'text-7xl font-black tracking-widest',
                successAction === 'IN' ? 'text-emerald-400' : 'text-amber-400'
              )}
            >
              {successAction === 'IN' ? 'IN' : 'OUT'}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-[#7FB3AE] mt-2"
            >
              {successAction === 'IN' ? 'Penonton berhasil masuk' : 'Penonton berhasil keluar'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
