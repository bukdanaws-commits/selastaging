'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useOrganizerWristbandGuide } from '@/hooks/use-api'
import {
  QrCode,
  ScanLine,
  CheckCircle2,
  Watch,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      className="w-full text-left p-4 rounded-lg bg-[#0A0F0E] border border-white/5 hover:border-[#00A39D]/15 transition-colors"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-4 h-4 text-[#00A39D] shrink-0" />
          <span className="text-sm text-white font-medium">{q}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#7FB3AE] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#7FB3AE] shrink-0" />}
      </div>
      {open && <p className="text-sm text-[#7FB3AE] mt-3 ml-7">{a}</p>}
    </button>
  )
}

export default function WristbandGuidePage() {
  const { data: guideData, isLoading } = useOrganizerWristbandGuide()

  // Extract wristband configs from API
  const wristbandConfigs = (() => {
    const guide = guideData as { guide: unknown[] } | undefined
    return (guide?.guide ?? []) as Record<string, unknown>[]
  })()

  const flowSteps = [
    { step: 1, title: 'Scan E-Tiket', desc: 'Scan QR code e-tiket peserta atau masukkan kode tiket secara manual di stasiun penukaran.', icon: QrCode },
    { step: 2, title: 'Verifikasi Data', desc: 'Pastikan data tiket cocok dengan identitas peserta (nama, tipe tiket, status aktif).', icon: ScanLine },
    { step: 3, title: 'Scan Gelang', desc: 'Scan barcode gelang yang sesuai dengan tipe tiket. Sistem akan otomatis mem-pair gelang dengan tiket.', icon: Watch },
    { step: 4, title: 'Pasang Gelang', desc: 'Pasang gelang di pergelangan tangan peserta. Gelang tidak dapat dipindah tanpa merusaknya.', icon: CheckCircle2 },
  ]

  const faqs = [
    { q: 'Bagaimana jika gelang rusak saat dipasang?', a: 'Langsung ambil gelang pengganti dari stok darurat. Scan gelang baru dan lakukan re-pair dengan tiket yang sama. Log aktivitas akan tercatat otomatis.' },
    { q: 'Peserta datang tanpa e-tiket. Apa yang harus dilakukan?', a: 'Cari data peserta di halaman Cek Tiket berdasarkan nama atau email. Jika ditemukan, buatkan ulang e-tiket melalui menu admin. Jika tidak ditemukan, arahkan ke loket informasi.' },
    { q: 'Apakah peserta bisa bertukar gelang?', a: 'Tidak. Gelang yang sudah dipasang tidak boleh dipindah ke orang lain. Jika ditemukan indikasi pertukaran, laporkan ke koordinator untuk investigasi.' },
    { q: 'Stok gelang untuk tipe tertentu habis?', a: 'Hubungi koordinator logistik melalui radio/walkie-talkie. Stok darurat tersedia di gudang VIP Counter. Tidak boleh menggunakan gelang tipe lain.' },
    { q: 'Bagaimana menangani peserta yang datang terlambat?', a: 'Selama gate masih aktif, peserta tetap bisa melakukan penukaran gelang. Jika gate sudah ditutup, arahkan ke Exit Utama untuk koordinasi lebih lanjut.' },
    { q: 'Sistem scanner tidak bisa membaca QR code?', a: 'Coba bersihkan lensa scanner. Jika masih tidak bisa, masukkan kode tiket secara manual (16 karakter). Pastikan pencahayaan cukup.' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Panduan Gelang</h1>
        <p className="text-[#7FB3AE] mt-1">Panduan lengkap konfigurasi gelang dan alur penukaran</p>
      </div>

      {/* Wristband Configs Grid */}
      <div>
        <h3 className="text-sm font-semibold text-[#7FB3AE] uppercase tracking-wider mb-3">Konfigurasi Gelang</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {wristbandConfigs.map((wb, idx) => (
            <Card key={String(wb.ticketTypeId ?? idx)} className="bg-[#111918] border-white/5 hover:border-[#00A39D]/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full shrink-0 border-2 border-white/10 shadow-lg"
                    style={{ backgroundColor: String(wb.wristbandColorHex ?? '#E5E7EB') }}
                  />
                  <div>
                    <p className="text-sm text-white font-semibold">{String(wb.ticketTypeName ?? '-')}</p>
                    <p className="text-[11px] text-[#7FB3AE]">{String(wb.emoji ?? '')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7FB3AE]">Warna</span>
                    <Badge variant="outline" className="text-[10px] text-white border-white/10">
                      {String(wb.wristbandColor ?? '-')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7FB3AE]">Tipe</span>
                    <span className="text-white font-medium">{String(wb.wristbandType ?? '-')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {wristbandConfigs.length === 0 && (
            <p className="text-sm text-[#7FB3AE] col-span-full text-center py-8">Data konfigurasi gelang belum tersedia</p>
          )}
        </div>
      </div>

      {/* Redemption Flow */}
      <div>
        <h3 className="text-sm font-semibold text-[#7FB3AE] uppercase tracking-wider mb-3">Alur Penukaran Gelang</h3>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {flowSteps.map((step, idx) => (
                <div key={step.step} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#00A39D]/10 border border-[#00A39D]/20 flex items-center justify-center mb-3">
                      <step.icon className="w-6 h-6 text-[#00A39D]" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#00A39D] text-white text-xs font-bold flex items-center justify-center mb-2">
                      {step.step}
                    </div>
                    <p className="text-sm font-semibold text-white">{step.title}</p>
                    <p className="text-xs text-[#7FB3AE] mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                  {idx < flowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-7 -right-3 w-6">
                      <ChevronDown className="w-6 h-6 text-[#00A39D]/40 rotate-[-90deg]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-sm font-semibold text-[#7FB3AE] uppercase tracking-wider mb-3">FAQ & Troubleshooting</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </div>
  )
}
