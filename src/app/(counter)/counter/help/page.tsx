'use client'

import { HelpCircle, Phone, UserCircle, Headphones } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

// ============================================================
// FAQ Data
// ============================================================

const faqItems = [
  {
    id: 'faq-1',
    question: 'Tiket sudah diredeem tapi belum dapat gelang?',
    answer:
      'Cek kode gelang di riwayat penukaran (menu Riwayat). Jika kode gelang belum muncul, hubungi supervisor untuk verifikasi manual dan pencatatan ulang.',
  },
  {
    id: 'faq-2',
    question: 'QR Code tidak bisa di-scan?',
    answer:
      'Pastikan layar HP peserta bersih dan brightness cukup tinggi. Jika tetap tidak bisa, input manual kode tiket (format: SHL-JKT-XXXX-0000) melalui kolom input di halaman Scan.',
  },
  {
    id: 'faq-3',
    question: 'Gelang rusak saat dipasang?',
    answer:
      'Ambil gelang pengganti dari stok counter, scan ulang tiket peserta, dan catat penggantian gelang di riwayat dengan kode gelang baru. Laporkan stok gelang yang berkurang ke supervisor.',
  },
  {
    id: 'faq-4',
    question: 'Peserta tidak bawa identitas?',
    answer:
      'Minta peserta menunjukkan email konfirmasi dan nomor telepon yang terdaftar di tiket. Verifikasi nama sesuai dengan data tiket sebelum memproses penukaran gelang.',
  },
  {
    id: 'faq-5',
    question: 'Peserta mau tukar gelang ke orang lain?',
    answer:
      'TIDAK BOLEH. Gelang bersifat personal dan non-transferable. Gelang hanya boleh dipasang langsung di tangan peserta yang terdaftar. Jika peserta memaksa, hubungi supervisor.',
  },
  {
    id: 'faq-6',
    question: 'Counter penuh / antrian panjang?',
    answer:
      'Hubungi Command Center melalui hotline untuk membuka counter tambahan. Command Center akan mengirimkan staf cadangan dan mengaktifkan counter cadangan yang tersedia.',
  },
]

// ============================================================
// Component
// ============================================================

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Bantuan</h1>
          <p className="text-xs text-muted-foreground">
            FAQ & kontak darurat untuk counter staff
          </p>
        </div>
      </div>

      {/* ── Quick Contact ── */}
      <Card className="bg-[#111918] border-border/30">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Headphones className="h-4 w-4 text-primary" />
            Kontak Darurat
          </h2>

          {/* Supervisor */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]/60">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Andi Setiawan
              </p>
              <p className="text-[10px] text-muted-foreground">
                Supervisor Counter
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-mono text-primary">
                0812-3456-7890
              </span>
            </div>
          </div>

          {/* Event Hotline */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0F0E]/60">
            <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Event Hotline
              </p>
              <p className="text-[10px] text-muted-foreground">
                Command Center — 24 jam
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-amber-400">
                021-555-0123
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── FAQ Accordion ── */}
      <Card className="bg-[#111918] border-border/30">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Pertanyaan Umum (FAQ)
          </h2>
          <p className="text-[10px] text-muted-foreground mb-4">
            Klik pertanyaan untuk melihat jawaban
          </p>

          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-border/30"
              >
                <AccordionTrigger className="text-xs font-medium text-foreground hover:text-primary hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
