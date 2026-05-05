'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import Image from 'next/image'
import {
  Music,
  ChevronDown,
  MapPin,
  Calendar,
  Clock,
  Users,
  Ticket,
  Sparkles,
  Shield,
  Star,
  Check,
  ArrowRight,
  Heart,
  Mic2,
  Zap,
  Camera,
  Flame,
  Utensils,
  Handshake,
  Volume2,
  Chrome,
  Loader2,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/utils'
import { publicApi, paymentApi, orderApi } from '@/lib/api'
// DOKU payment integration (replaced Midtrans)
import { useAuthStore } from '@/lib/auth-store'
import { usePageStore } from '@/lib/page-store'
import { GoogleLoginModal } from '@/components/GoogleLoginModal'
import { SeatSelectionModal } from '@/components/seat/SeatSelectionModal'
import { AutoAssignModal } from '@/components/seat/AutoAssignModal'
import { defaultSeatConfigs, getSelectionModeLabel } from '@/lib/seat-data'
import dynamic from 'next/dynamic'

// ─── Lazy imports for page views ────────────────────────────
const CheckoutPage = dynamic(() => import('@/components/pages/checkout-page'), { ssr: false })
const PaymentPage = dynamic(() => import('@/components/pages/payment-page'), { ssr: false })
const PaymentStatusPage = dynamic(() => import('@/components/pages/payment-status-page'), { ssr: false })
const ETicketPage = dynamic(() => import('@/components/pages/eticket-page'), { ssr: false })
const MyOrdersPage = dynamic(() => import('@/components/pages/my-orders-page'), { ssr: false })
const ProfilePage = dynamic(() => import('@/components/pages/profile-page'), { ssr: false })

// ─── WRISTBAND COLOR MAPPING ───────────────────────────────
export const WRISTBAND_COLORS: Record<string, { color: string; hex: string; label: string }> = {
  'VVIP PIT':   { color: 'Gold',    hex: '#FFD700', label: 'Gold' },
  'VIP ZONE':   { color: 'Teal',    hex: '#00A39D', label: 'Teal' },
  'FESTIVAL':   { color: 'Orange',  hex: '#F8AD3C', label: 'Orange' },
  'CAT 1':      { color: 'Merah',   hex: '#EF4444', label: 'Red' },
  'CAT 2':      { color: 'Biru',    hex: '#3B82F6', label: 'Blue' },
  'CAT 3':      { color: 'Hijau',   hex: '#22C55E', label: 'Green' },
  'CAT 4':      { color: 'Ungu',    hex: '#A855F7', label: 'Purple' },
  'CAT 5':      { color: 'Putih',   hex: '#F8FAFC', label: 'White' },
  'CAT 6':      { color: 'Kuning',  hex: '#EAB308', label: 'Yellow' },
}

// ─── TOUR CITIES ─────────────────────────────────────────
const TOUR_CITIES = [
  { slug: 'sheila-on7-bandung', city: 'Bandung', date: '1 Juni 2025', venue: 'Baros Field', day: '01', month: 'JUN' },
  { slug: 'sheila-on7-makassar', city: 'Makassar', date: '8 Juni 2025', venue: 'Pantai Losari Arena', day: '08', month: 'JUN' },
  { slug: 'sheila-on7-medan', city: 'Medan', date: '15 Juni 2025', venue: 'Lapangan Merdeka', day: '15', month: 'JUN' },
  { slug: 'sheila-on7-jakarta', city: 'Jakarta', date: '22 Juni 2025', venue: 'GBK Madya Stadium', day: '22', month: 'JUN' },
  { slug: 'sheila-on7-balikpapan', city: 'Balikpapan', date: '29 Juni 2025', venue: 'Lapangan Merdeka BPN', day: '29', month: 'JUN' },
] as const

// ─── FALLBACK STATIC DATA ──────────────────────────────────
// Used when the backend API is not available
const FALLBACK_EVENT = {
  id: '30000000-0000-0000-0000-000000000001',
  slug: 'sheila-on7-jakarta',
  title: 'Sheila On 7 — JAKARTA',
  subtitle: 'Melompat Lebih Tinggi Tour 2026',
  date: '2026-06-22',
  time: '19:00 WIB',
  doorsOpen: '16:00 WIB',
  venue: 'GBK Madya Stadium',
  city: 'Jakarta',
  address: 'Jl. Gatot Subroto, Senayan, Kebayoran Baru, Jakarta Pusat 10270',
  capacity: 18800,
  status: 'published' as 'published' | 'draft' | 'sold_out',
}

const FALLBACK_TICKET_TYPES = [
  {
    id: 'tt-vvip',
    name: 'VVIP PIT',
    description: 'Standing paling depan — barisan depan panggung',
    price: 3500000,
    quota: 300,
    sold: 247,
    tier: 'floor' as const,
    emoji: '👑',
    platformFee: 5,
    benefits: [
      'Standing paling depan (barrier VVIP)',
      'Welcome drink + F&B gratis sepuasnya',
      'Exclusive merchandise pack (T-shirt + Poster)',
      'Early entry 30 menit sebelum gate buka',
      'Wristband premium (gold embossed)',
      'Meet & Greet session sebelum konser',
      'Photobooth area eksklusif',
      'Lounge area dengan sofa dan AC',
    ],
  },
  {
    id: 'tt-vip',
    name: 'VIP ZONE',
    description: 'Standing VIP — di belakang VVIP Pit',
    price: 2800000,
    quota: 500,
    sold: 412,
    tier: 'floor' as const,
    emoji: '⭐',
    platformFee: 5,
    benefits: [
      'Standing zone VIP (di belakang VVIP)',
      'Dedicated bar & food stall',
      'Merchandise discount 20%',
      'Early entry 15 menit',
      'Wristband VIP (teal embossed)',
    ],
  },
  {
    id: 'tt-festival',
    name: 'FESTIVAL',
    description: 'General admission standing — bebas pilih posisi',
    price: 2200000,
    quota: 3000,
    sold: 2150,
    tier: 'floor' as const,
    emoji: '🎵',
    platformFee: 5,
    benefits: [
      'General admission standing area',
      'Bebas pilih posisi dalam area festival',
      'Akses food court & merchandise area',
    ],
  },
  {
    id: 'tt-cat1',
    name: 'CAT 1',
    description: 'Tribun Bawah Kiri — kursi bernomor',
    price: 1750000,
    quota: 2000,
    sold: 1780,
    tier: 'tribun' as const,
    emoji: '🎟️',
    platformFee: 5,
    benefits: [
      'Kursi bernomor (assigned seating)',
      'Tribun bawah kiri — view premium',
      'Pemandangan stage jelas',
      'Akses food court & merchandise',
    ],
  },
  {
    id: 'tt-cat2',
    name: 'CAT 2',
    description: 'Tribun Tengah Kiri — kursi bernomor',
    price: 1400000,
    quota: 3000,
    sold: 2410,
    tier: 'tribun' as const,
    emoji: '🎫',
    platformFee: 5,
    benefits: [
      'Kursi bernomor (assigned seating)',
      'Tribun tengah kiri — view baik',
      'Akses food court & merchandise',
    ],
  },
  {
    id: 'tt-cat3',
    name: 'CAT 3',
    description: 'Tribun Tengah Kanan — kursi bernomor',
    price: 1100000,
    quota: 3000,
    sold: 1950,
    tier: 'tribun' as const,
    emoji: '🎫',
    platformFee: 5,
    benefits: [
      'Kursi bernomor (assigned seating)',
      'Tribun tengah kanan — view baik',
      'Akses food court & merchandise',
    ],
  },
  {
    id: 'tt-cat4',
    name: 'CAT 4',
    description: 'Tribun Atas Kanan — kursi bernomor',
    price: 850000,
    quota: 4000,
    sold: 2680,
    tier: 'tribun' as const,
    emoji: '🎟️',
    platformFee: 5,
    benefits: [
      'Kursi bernomor (assigned seating)',
      'Tribun atas kanan',
      'Akses food court & merchandise',
    ],
  },
  {
    id: 'tt-cat5',
    name: 'CAT 5',
    description: 'Tribun Ujung Belakang — kursi bernomor',
    price: 550000,
    quota: 3000,
    sold: 1520,
    tier: 'tribun' as const,
    emoji: '🎟️',
    platformFee: 5,
    benefits: [
      'Kursi bernomor (assigned seating)',
      'Tribun ujung belakang',
      'Akses food court & merchandise',
    ],
  },
  {
    id: 'tt-cat6',
    name: 'CAT 6',
    description: 'Tribun Belakang — kursi bernomor',
    price: 350000,
    quota: 2500,
    sold: 890,
    tier: 'tribun' as const,
    emoji: '🎫',
    platformFee: 5,
    benefits: [
      'Kursi bernomor (assigned seating)',
      'Tribun belakang',
      'Akses food court & merchandise',
    ],
  },
]

const FALLBACK_FAQS = [
  {
    question: 'Bagaimana cara membeli tiket?',
    answer:
      'Klik tombol "Beli Tiket" di halaman utama, login dengan akun Google, pilih kategori dan jumlah tiket, isi data peserta, lalu lakukan pembayaran melalui DOKU (QRIS, Virtual Account, E-Wallet, Kartu Kredit, dll). Setelah pembayaran berhasil, e-tiket akan otomatis tersedia di halaman "Tiket Saya".',
  },
  {
    question: 'Berapa batas maksimal pembelian tiket?',
    answer:
      'Maksimal 5 tiket per transaksi. Jika Anda ingin membeli lebih dari 5 tiket, silakan lakukan transaksi terpisah.',
  },
  {
    question: 'Apa metode pembayaran yang diterima?',
    answer:
      'Kami menerima pembayaran melalui DOKU: QRIS, Virtual Account (BCA, Mandiri, BSI, BRI, BNI, Permata), E-Wallet (OVO, ShopeePay, DANA, LinkAja), Kartu Kredit/Debit, Gerai Retail (Alfamart, Indomaret), dan PayLater.'
  },
  {
    question: 'Apa yang harus dibawa ke venue pada hari H?',
    answer:
      'Bawa e-tiket (QR Code) yang ditampilkan di aplikasi, identitas (KTP/SIM/Paspor) sesuai data pemesanan, dan pastikan sudah melakukan penukaran gelang di booth redeem sebelum masuk gate.',
  },
  {
    question: 'Apa itu gelang (wristband) dan bagaimana mendapatkannya?',
    answer:
      'Gelang adalah identitas masuk venue Anda. Setelah pembayaran berhasil, tunjukkan e-tiket (QR Code) di booth redeem yang tersedia di sekitar venue. Crew kami akan memasangkan gelang sesuai warna kategori tiket Anda. Gelang wajib dikenakan untuk masuk area konser.',
  },
  {
    question: 'Apakah tiket bisa ditransfer ke orang lain?',
    answer:
      'Tiket bersifat personal dan tidak dapat ditransfer. Nama peserta yang tertera di tiket harus sesuai dengan identitas yang dibawa saat redeem gelang.',
  },
  {
    question: 'Apakah ada refund jika event dibatalkan?',
    answer:
      'Jika event dibatalkan oleh penyelenggara, 100% pembayaran akan dikembalikan ke rekening asal. Jika event ditunda, tiket tetap berlaku untuk tanggal reschedule. Proses refund membutuhkan waktu 7-14 hari kerja.',
  },
  {
    question: 'Kapan harus datang ke venue?',
    answer:
      'Pintu venue dibuka pukul 16:00 WIB. Kami menyarankan untuk datang minimal 2 jam sebelum konser dimulai (pukul 17:00 WIB) untuk menghindari antrean panjang di booth redeem dan gate.',
  },
]

const BAND_MEMBERS = [
  { name: 'Duta', role: 'Vokal', emoji: '🎤', image: '/images/band/vocalist-duta-v2.jpg', description: 'Sang vokalis karismatik yang menjadi ikon Sheila On 7 selama lebih dari 2 dekade.' },
  { name: 'Adam', role: 'Keyboard', emoji: '🎹', image: '/images/band/keyboar.jpg', description: 'Maestro keyboard yang mengisi melodi dan harmoni khas Sheila On 7.' },
  { name: 'Eross', role: 'Gitar', emoji: '🎸', image: '/images/band/gitaris.jpg', description: 'Gitaris utama yang menciptakan riff-riff ikonik di setiap lagu hits.' },
  { name: 'Brian', role: 'Drum', emoji: '🥁', image: '/images/band/drumer.jpg', description: 'Drummer enerjik yang menjadi beat andalan di setiap penampilan live.' },
]

const SPECIAL_GUEST = {
  name: 'TBA',
  role: 'Special Guest',
  emoji: '🎤',
  image: '/images/band/tba-guest-v2.jpg',
  tagline: 'Akan segera diumumkan',
  badge: 'SPECIAL GUEST',
}

const HIGHLIGHTS = [
  { emoji: '🎵', title: '30+ Hits Legendaris', description: 'Dari Sheila On 7, Dan, Peephole, hingga single terbaru' },
  { emoji: '🤝', title: 'Meet & Greet VVIP', description: 'Kesempatan bertemu langsung Sheila On 7 (VVIP PIT)' },
  { emoji: '🎤', title: 'Sing Along', description: 'Lantangkan suara bersama ribuan Sobat Duta' },
  { emoji: '🔥', title: 'Stage Megah', description: 'Panggung spektakuler dengan efek visual terbaik' },
  { emoji: '📸', title: 'Photo Booth', description: 'Momen berkesan dengan latar konser yang ikonik' },
  { emoji: '🍜', title: 'Food Festival', description: 'Berbagai pilihan kuliner di area food court' },
]

const VENUE_FACILITIES = [
  { icon: '🍽️', name: 'Food Court' },
  { icon: '👕', name: 'Merchandise' },
  { icon: '🚻', name: 'Toilet & Mushola' },
  { icon: '🅿️', name: 'Parkir' },
  { icon: '🏥', name: 'Medical Tent' },
  { icon: '📸', name: 'Photo Spot' },
  { icon: '🚬', name: 'Smoking Area' },
  { icon: '🏧', name: 'ATM Centre' },
]

const HIGHLIGHT_IMAGES: Record<string, string> = {
  '30+ Hits Legendaris': '/images/sections/highlight-crowd.png',
  'Meet & Greet VVIP': '/images/sections/highlight-vvip.png',
  'Sing Along': '/images/sections/highlight-crowd.png',
  'Stage Megah': '/images/sections/highlight-stage.png',
  'Photo Booth': '/images/sections/highlight-photobooth.png',
  'Food Festival': '/images/sections/highlight-food.png',
}

const HIGHLIGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '30+ Hits Legendaris': Volume2,
  'Meet & Greet VVIP': Handshake,
  'Sing Along': Mic2,
  'Stage Megah': Flame,
  'Photo Booth': Camera,
  'Food Festival': Utensils,
}

// ─── Intersection Observer Hook ────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

// ─── Ticket type with computed data ────────────────────────
interface TicketTypeDisplay {
  id: string
  name: string
  description: string
  price: number
  quota: number
  sold: number
  tier: 'floor' | 'tribun'
  emoji: string
  benefits: string[]
  platformFee?: number
}

function getAvailableQuota(tt: TicketTypeDisplay): number {
  return Math.max(0, tt.quota - tt.sold)
}

function getQuotaPercentage(tt: TicketTypeDisplay): number {
  return Math.round((tt.sold / tt.quota) * 100)
}

// ─────────────────────────────────────────────────────────
// Section 1 — Hero
// ─────────────────────────────────────────────────────────
function HeroSection({ onLoginClick, isAuthenticated, selectedCity }: { onLoginClick: () => void; isAuthenticated: boolean; selectedCity: typeof TOUR_CITIES[number] }) {
  return (
    <section id="beranda" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero image background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/sections/hero-banner.png"
          alt="Sheila On 7 Concert"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="hero-gradient absolute inset-0" />
      </div>

      {/* Animated blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-blob" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold/8 rounded-full blur-[100px] animate-blob delay-2000" />

      <div className="container mx-auto px-4 relative z-10 text-center py-32">
        {/* Pre-title */}
        <div className="animate-fade-in-down">
          <div className="inline-flex items-center gap-2 mb-6 mx-auto w-fit px-5 py-2 rounded-full text-base sm:text-lg font-bold tracking-widest uppercase text-white border border-primary/50 bg-primary/80">
            <Music className="h-4 w-4" />
            Sheila On 7
          </div>
        </div>

        {/* Main heading */}
        <h1 className="text-hero animate-fade-in-up text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95] mb-4">
          <span className="gradient-text-gold">MELOMPAT </span>
          <span className="gradient-text-white">LEBIH TINGGI</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up delay-150 text-lg sm:text-2xl md:text-3xl text-white font-semibold mt-6 mb-2 tracking-wide">
          Tour 2026 — {selectedCity.city}
        </p>

        {/* Date & Venue */}
        <div className="animate-fade-in-up delay-300 flex items-center justify-center gap-3 text-sm text-white mt-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/80 animate-pulse-glow">
            <Calendar className="h-4 w-4 text-white" />
            <span className="font-semibold">{selectedCity.date.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/80 animate-pulse-glow">
            <MapPin className="h-4 w-4 text-white" />
            <span className="font-semibold">{selectedCity.venue}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up delay-500 flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Button
            size="lg"
            className="btn-shine text-sm px-8 h-11 rounded-full glow-bsi-strong animate-pulse-glow"
            onClick={() => {
              if (!isAuthenticated) {
                onLoginClick()
                return
              }
              const el = document.querySelector('#tickets')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <Ticket className="mr-2 h-4 w-4" />
            Beli Tiket Sekarang
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-sm px-8 h-11 rounded-full glass animate-pulse-glow"
            onClick={() => {
              const el = document.querySelector('#venue')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Lihat Venue
          </Button>
        </div>

        {/* Google Login Quick Button */}
        {!isAuthenticated && (
          <div className="animate-fade-in-up delay-700 mt-6">
            <Button
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground gap-2"
              onClick={onLoginClick}
            >
              <Chrome className="h-3.5 w-3.5" />
              Login dengan Google untuk membeli tiket
            </Button>
          </div>
        )}

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[10px] text-muted-foreground/60 tracking-widest uppercase">Scroll</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 2 — Brand Story
// ─────────────────────────────────────────────────────────
function BrandStorySection() {
  const { ref, inView } = useInView()

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-section-mesh" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-5 mx-auto w-fit">
              <Music className="h-3 w-3" />
              Tentang Konser
            </div>
          </div>

          <h2 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold mb-5', inView && 'animate-fade-in-up delay-100')}>
            Bersama <span className="gradient-text">Sobat Duta</span>
          </h2>

          <p className={cn('text-muted-foreground text-sm sm:text-base leading-relaxed', inView && 'animate-fade-in-up delay-200')}>
            Setelah lebih dari dua dekade mewarnai industri musik Indonesia, Sheila On 7
            kembali dengan konser spektakuler <strong className="text-foreground">Melompat Lebih Tinggi</strong>.
            Sebuah pengalaman konser yang dirancang khusus untuk Sobat Duta — dari hits legendaris
            seperti <em>Dan</em>, <em>Peephole</em>, <em>Sephia</em>, hingga <em>Anugerah Terindah</em>,
            semuanya akan dibawakan dengan penampilan panggung terbaik.
          </p>

          <p className={cn('text-muted-foreground text-sm sm:text-base leading-relaxed mt-3', inView && 'animate-fade-in-up delay-300')}>
            Malam itu bukan sekadar konser — ini adalah perayaan nostalgia, persahabatan,
            dan cinta musik yang melintasi generasi. Bersama ribuan Sobat Duta,
            kita akan melompat lebih tinggi.
          </p>

          <div className={cn('flex items-center justify-center gap-4 mt-7 text-xs text-muted-foreground flex-wrap', inView && 'animate-fade-in-up delay-400')}>
            {[
              { icon: Sparkles, label: '30+ Hits', color: 'text-gold' },
              { icon: Users, label: '18.800 Kursi', color: 'text-primary' },
              { icon: Music, label: '1 Malam', color: 'text-primary' },
              { icon: Zap, label: 'Full Production', color: 'text-gold' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 glass-teal px-3 py-1.5 rounded-full">
                <item.icon className={cn('h-3.5 w-3.5', item.color)} />
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative dots */}
      <div className="absolute top-10 right-10 w-32 h-32 dot-pattern opacity-30 rounded-full" />
      <div className="absolute bottom-10 left-10 w-24 h-24 dot-pattern-gold opacity-20 rounded-full" />
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 2.5 — Tour Schedule
// ─────────────────────────────────────────────────────────
function TourScheduleSection({
  selectedCity,
  onSelectCity,
}: {
  selectedCity: typeof TOUR_CITIES[number]
  onSelectCity: (city: typeof TOUR_CITIES[number]) => void
}) {
  const { ref, inView } = useInView()

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-section-dark" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge section-badge-gold mb-4 mx-auto w-fit">
              <Calendar className="h-3 w-3" />
              Jadwal Tour
            </div>
          </div>
          <h2 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold', inView && 'animate-fade-in-up delay-100')}>
            <span className="gradient-text-gold">TOUR 5 KOTA</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">Pilih kota dan dapatkan tiket konser terdekat</p>
        </div>

        {/* City cards — horizontal scroll on mobile, grid on desktop */}
        <div className={cn('flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0 scrollbar-hide max-w-5xl mx-auto', inView && 'animate-fade-in-up delay-200')}>
          {TOUR_CITIES.map((city, idx) => {
            const isSelected = city.slug === selectedCity.slug
            return (
              <div
                key={city.slug}
                className={cn(
                  'min-w-[200px] md:min-w-0 flex-shrink-0 snap-start group',
                  inView && 'animate-fade-in-up'
                )}
                style={inView ? { animationDelay: `${200 + idx * 100}ms` } : undefined}
              >
                <div
                  className={cn(
                    'relative rounded-2xl p-5 text-center transition-all duration-300 hover-lift cursor-pointer border-2',
                    isSelected
                      ? 'border-gold/60 glass-gold shadow-[0_0_20px_rgba(255,215,0,0.15)]'
                      : 'border-border/50 glass hover:border-primary/40'
                  )}
                  onClick={() => onSelectCity(city)}
                >
                  {/* Date badge */}
                  <div className={cn(
                    'inline-flex flex-col items-center rounded-xl px-3 py-2 mb-3',
                    isSelected ? 'bg-gold/20' : 'bg-primary/10'
                  )}>
                    <span className={cn('text-2xl font-black leading-none', isSelected ? 'text-gold' : 'text-primary')}>
                      {city.day}
                    </span>
                    <span className={cn('text-[10px] font-bold tracking-wider', isSelected ? 'text-gold/80' : 'text-muted-foreground')}>
                      {city.month}
                    </span>
                  </div>

                  {/* City name */}
                  <h3 className={cn(
                    'font-bold text-base mb-1',
                    isSelected && 'gradient-text-gold'
                  )}>
                    {city.city}
                  </h3>

                  {/* Venue */}
                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                    {city.venue}
                  </p>

                  {/* Select button */}
                  <Button
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'w-full rounded-full text-[11px]',
                      isSelected && 'bg-gold text-gold-foreground hover:bg-gold/90 btn-shine glow-gold-strong'
                    )}
                  >
                    {isSelected ? '✓ Terpilih' : 'Pilih'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 3 — Lineup
// ─────────────────────────────────────────────────────────
function LineupSection() {
  const { ref, inView } = useInView()

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-section-teal" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-14">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-4 mx-auto w-fit">
              <Star className="h-3 w-3" />
              Artis
            </div>
          </div>
          <h2 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold', inView && 'animate-fade-in-up delay-100')}>
            <span className="gradient-text">LINEUP</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Musisi legendaris yang siap menggebrak malam ini
          </p>
        </div>

        {/* Band Members Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7 max-w-4xl mx-auto">
          {BAND_MEMBERS.map((member, idx) => (
            <div
              key={member.name}
              className={cn('group flex flex-col items-center text-center', inView && 'animate-fade-in-up')}
              style={inView ? { animationDelay: `${150 + idx * 120}ms` } : undefined}
            >
              <div className="relative mb-4">
                <div className={cn(
                  'absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700',
                  idx === 0 ? 'animate-sonar bg-gold/20' : 'animate-sonar bg-primary/20'
                )} style={{ animationDelay: `${idx * 200}ms` }} />
                <div className={cn(
                  'absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 blur-[1px]',
                  idx === 0
                    ? 'bg-gradient-to-br from-gold via-amber-400 to-gold'
                    : 'bg-gradient-to-br from-primary via-teal-400 to-primary'
                )} />
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-card img-zoom">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 128px, 144px"
                  />
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
                  <Badge className={cn(
                    'text-[9px] px-2 py-0.5 rounded-full font-semibold shadow-lg',
                    idx === 0
                      ? 'bg-gold text-gold-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}>
                    {member.emoji} {member.role}
                  </Badge>
                </div>
              </div>
              <h3 className={cn(
                'font-bold text-sm tracking-wide',
                idx === 0 && 'gradient-text-gold text-base'
              )}>
                {member.name}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed max-w-[160px]">
                {member.description}
              </p>
            </div>
          ))}
        </div>

        {/* Special Guest — Mystery Card */}
        <div className={cn('mt-12 max-w-xs mx-auto w-full', inView && 'animate-scale-in delay-700')}>
          <div className="group relative rounded-2xl border border-dashed border-gold/25 hover:border-gold/50 glass-gold transition-all duration-500 p-6 text-center overflow-hidden hover-lift">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(248,173,60,0.06)_0%,_transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden img-zoom">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-gold/50 via-amber-500/30 to-gold/50 rounded-full blur-[1px]" />
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={SPECIAL_GUEST.image}
                    alt="Special Guest"
                    fill
                    className="object-cover object-center blur-md brightness-75 group-hover:blur-sm transition-all duration-700"
                    sizes="80px"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Mic2 className="h-7 w-7 text-gold/70 group-hover:text-gold transition-colors duration-500" />
                </div>
              </div>
              <Badge className="mb-2 bg-gold text-gold-foreground hover:bg-gold/90 text-[10px] tracking-wider">
                SPECIAL GUEST
              </Badge>
              <h3 className="font-bold text-sm text-gold tracking-wide">TBA</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Akan segera diumumkan</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 4 — Wristband Color Guide
// ─────────────────────────────────────────────────────────
function WristbandSection() {
  const { ref, inView } = useInView()

  return (
    <section className="py-16 md:py-20 relative overflow-hidden bg-section-dark" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-4 mx-auto w-fit">
              <Shield className="h-3 w-3" />
              Gelang
            </div>
          </div>
          <h2 className={cn('text-2xl sm:text-3xl font-bold', inView && 'animate-fade-in-up delay-100')}>
            Warna <span className="gradient-text">Gelang</span> per Kategori
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">Setiap kategori tiket memiliki warna gelang khusus</p>
        </div>

        <div className={cn('grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 max-w-4xl mx-auto', inView && 'animate-fade-in-up delay-200')}>
          {Object.entries(WRISTBAND_COLORS).map(([tier, info], idx) => (
            <div
              key={tier}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl glass hover-lift text-center',
                inView && 'animate-fade-in-up'
              )}
              style={inView ? { animationDelay: `${200 + idx * 60}ms` } : undefined}
            >
              {/* Color circle */}
              <div
                className="w-10 h-10 rounded-full border-2 border-white/10 shadow-lg"
                style={{ backgroundColor: info.hex, boxShadow: `0 0 15px ${info.hex}40` }}
              />
              <span className="text-[10px] font-bold">{tier}</span>
              <span className="text-[9px] text-muted-foreground">{info.color}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 5 — Tickets Floor Zone
// ─────────────────────────────────────────────────────────
function TicketsFloorSection({ ticketTypes, onBuy }: { ticketTypes: TicketTypeDisplay[]; onBuy: (tt: TicketTypeDisplay) => void }) {
  const { ref, inView } = useInView()
  const floorTiers = ticketTypes.filter((t) => t.tier === 'floor')

  return (
    <section id="tickets" className="py-20 md:py-28 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 z-0 opacity-[0.08]">
        <Image src="/images/sections/floor-zone.png" alt="" fill className="object-cover" sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-[1]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-4 mx-auto w-fit">
              <Ticket className="h-3 w-3" />
              Tiket
            </div>
          </div>
          <h2 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold', inView && 'animate-fade-in-up delay-100')}>
            <span className="gradient-text-gold">PILIHKAN</span> TIKETMU
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">Floor Zone</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 max-w-4xl mx-auto">
          {floorTiers.map((tier, idx) => {
            const isVVIP = tier.id === 'tt-vvip'
            const pct = getQuotaPercentage(tier)
            const available = getAvailableQuota(tier)
            const wristband = WRISTBAND_COLORS[tier.name]

            return (
              <Card
                key={tier.id}
                className={cn(
                  'card-modern group relative overflow-hidden',
                  isVVIP ? 'border-gold/30 animate-pulse-glow-gold' : 'border-border',
                  inView && 'animate-fade-in-up'
                )}
                style={inView ? { animationDelay: `${200 + idx * 150}ms` } : undefined}
              >
                {isVVIP && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className="bg-gold text-gold-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                      EXCLUSIVE
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-0">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-500">{tier.emoji}</div>
                  <CardTitle className={cn('text-base', isVVIP && 'gradient-text-gold')}>
                    {tier.name}
                  </CardTitle>
                  <CardDescription className="text-xs">{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="pt-4 pb-5">
                  {/* Price */}
                  <div className="text-center mb-3">
                    <span className={cn(
                      'text-2xl font-black',
                      isVVIP ? 'gradient-text-gold' : 'gradient-text-white'
                    )}>
                      {formatRupiah(tier.price)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">/orang</span>
                    {tier.platformFee && tier.platformFee > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        + {formatRupiah(Math.round(tier.price * tier.platformFee / 100))} fee platform ({tier.platformFee}%)
                      </div>
                    )}
                  </div>

                  {/* Wristband color indicator */}
                  {wristband && (
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <div
                        className="w-3 h-3 rounded-full border border-white/10"
                        style={{ backgroundColor: wristband.hex }}
                      />
                      <span className="text-[10px] text-muted-foreground">Gelang {wristband.color}</span>
                    </div>
                  )}

                  {/* Quota progress */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Sisa {available} kursi</span>
                      <span className={cn(pct >= 90 ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                        {pct}% terjual
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={cn('h-1.5', isVVIP && '[&>div]:bg-gold')}
                    />
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-1.5 mb-5">
                    {tier.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs">
                        <Check className={cn('h-3 w-3 shrink-0 mt-0.5', isVVIP ? 'text-gold' : 'text-primary')} />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className="w-full rounded-full h-10 text-xs btn-shine glow-gold-strong"
                    variant="default"
                    disabled={available === 0}
                    onClick={() => {
                      if (available === 0) { toast.error('Maaf, tiket sudah habis!'); return }
                      onBuy(tier)
                    }}
                  >
                    {available === 0 ? 'Habis Terjual' : 'Pilih Kursi'}
                    {available > 0 && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 6 — Tickets Tribun Zone
// ─────────────────────────────────────────────────────────
function TicketsTribunSection({ ticketTypes, onBuy }: { ticketTypes: TicketTypeDisplay[]; onBuy: (tt: TicketTypeDisplay) => void }) {
  const { ref, inView } = useInView()
  const tribunTiers = ticketTypes.filter((t) => t.tier === 'tribun')

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-section-diagonal" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className={cn('text-xl sm:text-2xl font-bold', inView && 'animate-fade-in-up')}>
            <span className="gradient-text">Tribun</span> Zone
          </h2>
          <p className="text-muted-foreground mt-1.5 text-xs">Pilihan kursi tribun untuk semua Sobat Duta</p>
        </div>

        {/* Scrollable on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-6 md:overflow-visible md:pb-0 scrollbar-hide">
          {tribunTiers.map((tier, idx) => {
            const pct = getQuotaPercentage(tier)
            const available = getAvailableQuota(tier)
            const wristband = WRISTBAND_COLORS[tier.name]

            return (
              <Card
                key={tier.id}
                className={cn(
                  'min-w-[180px] md:min-w-0 flex-shrink-0 snap-start card-modern',
                  inView && 'animate-fade-in-up'
                )}
                style={inView ? { animationDelay: `${100 + idx * 100}ms` } : undefined}
              >
                <CardContent className="pt-5 pb-5 px-4 flex flex-col h-full">
                  <div className="text-2xl mb-1.5">{tier.emoji}</div>
                  <h3 className="font-bold text-xs mb-1">{tier.name}</h3>

                  <div className="text-lg font-black gradient-text-white mb-1">
                    {formatRupiah(tier.price)}
                  </div>
                  {tier.platformFee && tier.platformFee > 0 && (
                    <div className="text-[9px] text-muted-foreground mb-1">
                      + {formatRupiah(Math.round(tier.price * tier.platformFee / 100))} fee ({tier.platformFee}%)
                    </div>
                  )}

                  {/* Wristband indicator */}
                  {wristband && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-white/10"
                        style={{ backgroundColor: wristband.hex }}
                      />
                      <span className="text-[9px] text-muted-foreground">{wristband.color}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground mb-2">
                    {tier.sold.toLocaleString()} / {tier.quota.toLocaleString()}
                  </div>

                  <Progress value={pct} className="h-1 mb-3" />

                  <ul className="space-y-1 mb-3 flex-1">
                    {tier.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Check className="h-2.5 w-2.5 text-primary shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="sm"
                    className="w-full rounded-full text-[11px] btn-shine"
                    disabled={available === 0}
                    onClick={() => {
                      if (available === 0) { toast.error('Maaf, tiket sudah habis!'); return }
                      onBuy(tier)
                    }}
                  >
                    {available === 0 ? 'Habis' : getSelectionModeLabel(defaultSeatConfigs.find(c => c.tierId === tier.id)?.seatSelectionMode || 'seat_selection')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 7 — Venue
// ─────────────────────────────────────────────────────────
function VenueSection({ selectedCity }: { selectedCity: typeof TOUR_CITIES[number] }) {
  const { ref, inView } = useInView()

  // Map city-specific venue details
  const venueDetails: Record<string, { area: string; capacity: string }> = {
    'Bandung': { area: 'Cimahi, Bandung', capacity: '12.000 Kursi' },
    'Makassar': { area: 'Pantai Losari, Makassar', capacity: '15.000 Kursi' },
    'Medan': { area: 'Kota Medan, Sumatera Utara', capacity: '14.000 Kursi' },
    'Jakarta': { area: 'Gelora Bung Karno, Jakarta Pusat', capacity: '18.800 Kursi' },
    'Balikpapan': { area: 'Kota Balikpapan, Kalimantan Timur', capacity: '10.000 Kursi' },
  }

  const currentVenue = venueDetails[selectedCity.city] || venueDetails['Jakarta']

  return (
    <section id="venue" className="py-20 md:py-28 relative overflow-hidden bg-section-dark" ref={ref}>
      <div className="px-4 sm:px-6 md:px-10 lg:px-16 relative z-10 text-center mb-8">
        <div className={cn(inView && 'animate-fade-in-up')}>
          <div className="section-badge mb-4 mx-auto w-fit">
            <MapPin className="h-3 w-3" />
            Lokasi
          </div>
        </div>
        <h2 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold', inView && 'animate-fade-in-up delay-100')}>
          <span className="gradient-text">VENUE</span>
        </h2>
      </div>

      <div className={cn('relative w-full h-64 sm:h-80 md:h-96 img-zoom', inView && 'animate-fade-in-up delay-150')}>
        <Image
          src="/images/sections/venue.png"
          alt={selectedCity.venue}
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute bottom-8 left-6 sm:left-10 z-10">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{selectedCity.venue}</h3>
          <p className="text-sm text-white/80 mt-1">{currentVenue.area}</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-10 lg:px-16 relative z-10">
        <div className={cn('w-full', inView && 'animate-fade-in-up delay-200')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: MapPin, label: 'Lokasi', value: selectedCity.city },
              { icon: Users, label: 'Kapasitas', value: currentVenue.capacity },
              { icon: Calendar, label: 'Tanggal', value: selectedCity.date },
              { icon: Clock, label: 'Waktu', value: '19:00 WIB' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 glass-teal rounded-xl p-4">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="divider-gradient my-8" />

          <h4 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider">Fasilitas Venue</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 pb-6">
            {VENUE_FACILITIES.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-2 p-3 rounded-lg glass text-xs hover:bg-primary/10 transition-colors duration-300"
              >
                <span className="text-base">{f.icon}</span>
                <span className="text-muted-foreground text-[11px]">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 8 — Highlights
// ─────────────────────────────────────────────────────────
function HighlightsSection() {
  const { ref, inView } = useInView()

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-section-mesh" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge section-badge-gold mb-4 mx-auto w-fit">
              <Sparkles className="h-3 w-3" />
              Highlights
            </div>
          </div>
          <h2 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold', inView && 'animate-fade-in-up delay-100')}>
            Yang Menanti <span className="gradient-text-gold">Sobat Duta</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">Pengalaman konser yang tak terlupakan</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
          {HIGHLIGHTS.map((item, idx) => {
            const ImgComp = HIGHLIGHT_ICONS[item.title] || Sparkles
            const imgSrc = HIGHLIGHT_IMAGES[item.title]

            return (
              <Card
                key={idx}
                className={cn(
                  'card-modern group overflow-hidden',
                  inView && 'animate-fade-in-up'
                )}
                style={inView ? { animationDelay: `${150 + idx * 120}ms` } : undefined}
              >
                {imgSrc && (
                  <div className="h-36 relative img-zoom">
                    <Image
                      src={imgSrc}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                    <div className="absolute bottom-3 left-3 z-10">
                      <div className="h-8 w-8 rounded-lg bg-primary/80 backdrop-blur-sm flex items-center justify-center">
                        <ImgComp className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className="pt-4 pb-4">
                  {!imgSrc && (
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5 group-hover:bg-primary/20 transition-colors">
                      <ImgComp className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <h3 className="font-bold text-xs mb-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 9 — VVIP Showcase
// ─────────────────────────────────────────────────────────
function VVIPShowcaseSection({ ticketTypes, onBuy }: { ticketTypes: TicketTypeDisplay[]; onBuy: (tt: TicketTypeDisplay) => void }) {
  const { ref, inView } = useInView()
  const vvip = ticketTypes.find(t => t.id === 'tt-vvip')
  if (!vvip) return null

  const pct = getQuotaPercentage(vvip)
  const available = getAvailableQuota(vvip)

  return (
    <section className="py-20 md:py-28 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-section-gold" />
      <div className="absolute top-10 right-20 w-40 h-40 dot-pattern-gold opacity-20 rounded-full animate-float-slow" />
      <div className="absolute bottom-20 left-10 w-28 h-28 dot-pattern-gold opacity-15 rounded-full animate-float delay-1000" />

      <div className="container mx-auto px-4 relative z-10">
        <div className={cn('max-w-4xl mx-auto', inView && 'animate-fade-in-up')}>
          <Card className="border-gold/25 overflow-hidden animate-pulse-glow-gold card-modern-gold">
            <CardContent className="py-0 px-0">
              <div className="grid md:grid-cols-2">
                <div className="p-7 md:p-10 bg-gradient-to-br from-gold/15 via-gold/8 to-transparent flex flex-col justify-center">
                  <Badge className="w-fit bg-gold text-gold-foreground hover:bg-gold/90 text-[10px] mb-3 tracking-wider">
                    👑 VVIP PIT
                  </Badge>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                    Pengalaman <span className="gradient-text-gold">Eksklusif</span>
                  </h2>
                  <p className="text-muted-foreground text-xs mb-5 leading-relaxed">
                    {vvip.description}
                  </p>
                  <div className="space-y-1 mb-5">
                    <div className="text-xs text-muted-foreground">
                      Hanya tersisa <strong className="text-gold">{available}</strong> kursi dari {vvip.quota}
                    </div>
                    <Progress value={pct} className="h-1.5 [&>div]:bg-gold" />
                  </div>
                  <Button
                    className="rounded-full w-fit text-xs btn-shine glow-gold-strong"
                    disabled={available === 0}
                    onClick={() => {
                      if (available === 0) { toast.error('Maaf, VVIP PIT sudah habis!'); return }
                      onBuy(vvip)
                    }}
                  >
                    Dapatkan VVIP PIT
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="p-7 md:p-10">
                  <h3 className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                    Semua Keistimewaan
                  </h3>
                  <ul className="space-y-2.5">
                    {vvip.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2.5">
                        <div className="h-4 w-4 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-2.5 w-2.5 text-gold" />
                        </div>
                        <span className="text-xs">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 10 — Payment Methods
// ─────────────────────────────────────────────────────────
function PaymentMethodsSection() {
  const { ref, inView } = useInView()

  const methods = [
    { name: 'QRIS', icon: '📱', description: 'GoPay, OVO, Dana, ShopeePay, LinkAja' },
    { name: 'Bank Transfer', icon: '🏦', description: 'BCA, BNI, BRI, Mandiri, Permata' },
    { name: 'GoPay', icon: '💰', description: 'GoPay Balance & GoPayLater' },
    { name: 'Kartu Kredit', icon: '💳', description: 'Visa, Mastercard, JCB' },
  ]

  return (
    <section className="py-16 md:py-20 relative overflow-hidden bg-section-teal" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-4 mx-auto w-fit">
              <CreditCard className="h-3 w-3" />
              Pembayaran
            </div>
          </div>
          <h2 className={cn('text-xl sm:text-2xl font-bold', inView && 'animate-fade-in-up delay-100')}>
            Pembayaran <span className="gradient-text">Aman</span> via DOKU
          </h2>
          <p className="text-muted-foreground mt-2 text-xs">Semua transaksi dijamin aman dan terenkripsi</p>
        </div>

        <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto', inView && 'animate-fade-in-up delay-200')}>
          {methods.map((method, idx) => (
            <div key={method.name} className="glass rounded-xl p-4 text-center hover-lift">
              <div className="text-3xl mb-2">{method.icon}</div>
              <h3 className="font-bold text-xs mb-1">{method.name}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{method.description}</p>
            </div>
          ))}
        </div>

        <div className={cn('mt-8 text-center', inView && 'animate-fade-in-up delay-300')}>
          <div className="inline-flex items-center gap-2 glass-teal px-4 py-2 rounded-full">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Transaksi dilindungi SSL 256-bit encryption</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 11 — FAQ
// ─────────────────────────────────────────────────────────
function FAQSection({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const { ref, inView } = useInView()

  return (
    <section id="faq" className="py-20 md:py-28 relative overflow-hidden bg-section-dark" ref={ref}>
      <div className="absolute inset-0 dot-pattern opacity-[0.03]" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-4 mx-auto w-fit">FAQ</div>
          </div>
          <h2 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold', inView && 'animate-fade-in-up delay-100')}>
            Pertanyaan <span className="gradient-text">Umum</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">Jawaban untuk pertanyaan yang sering ditanyakan</p>
        </div>

        <div className={cn('max-w-2xl mx-auto', inView && 'animate-fade-in-up delay-200')}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border-border/50">
                <AccordionTrigger className="text-left text-xs sm:text-sm hover:no-underline hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 12 — Trust + Final CTA
// ─────────────────────────────────────────────────────────
function TrustCTASection({ onLoginClick, isAuthenticated }: { onLoginClick: () => void; isAuthenticated: boolean }) {
  const { ref, inView } = useInView()

  const trustBadges = [
    { icon: Shield, label: 'Tiket Resmi & Aman' },
    { icon: Users, label: '18.800+ Sobat Duta' },
    { icon: Star, label: '30+ Hits Legendaris' },
    { icon: Heart, label: '2 Dekade Karir' },
  ]

  return (
    <section className="py-20 md:py-28 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-section-radial" />
      <div className="absolute inset-0 bg-section-radial-gold" />

      <div className="container mx-auto px-4 relative z-10">
        <div className={cn('flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-14', inView && 'animate-fade-in-up')}>
          {trustBadges.map((badge, idx) => (
            <div
              key={badge.label}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-full glass-teal text-xs text-muted-foreground hover-lift',
                inView && 'animate-fade-in-up'
              )}
              style={inView ? { animationDelay: `${idx * 80}ms` } : undefined}
            >
              <badge.icon className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{badge.label}</span>
            </div>
          ))}
        </div>

        <div className={cn('text-center', inView && 'animate-fade-in-up delay-300')}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Jangan Sampai <span className="gradient-text-gold">Kehabisan!</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-7 leading-relaxed">
            Kuota terbatas! Pastikan kamu menjadi bagian dari malam bersejarah ini
            bersama Sheila On 7 dan ribuan Sobat Duta lainnya.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="btn-shine text-sm px-10 h-12 rounded-full glow-bsi-strong animate-pulse-glow"
              onClick={() => {
                if (!isAuthenticated) {
                  onLoginClick()
                  return
                }
                const el = document.querySelector('#tickets')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <Ticket className="mr-2 h-4 w-4" />
              Beli Tiket Sekarang
            </Button>
            {!isAuthenticated && (
              <Button
                size="lg"
                variant="outline"
                className="text-sm px-8 h-12 rounded-full glass gap-2"
                onClick={onLoginClick}
              >
                <Chrome className="h-4 w-4" />
                Login dengan Google
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, isAuthenticated, isLoading, login, rehydrateSession } = useAuthStore()
  const { currentPage, currentOrderId } = usePageStore()

  // ─── Ticket data state (API + fallback) ────────────────
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDisplay[]>(FALLBACK_TICKET_TYPES)
  const [faqs, setFaqs] = useState(FALLBACK_FAQS)
  const [eventData, setEventData] = useState(FALLBACK_EVENT)

  // ─── Tour city selection state ─────────────────────────
  const [selectedSlug, setSelectedSlug] = useState('sheila-on7-jakarta')
  const [selectedCity, setSelectedCity] = useState<typeof TOUR_CITIES[number]>(TOUR_CITIES[3]) // Jakarta default

  // ─── Auth modal state ──────────────────────────────────
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  // ─── Seat selection modals ─────────────────────────────
  const [seatModalOpen, setSeatModalOpen] = useState(false)
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<TicketTypeDisplay | null>(null)

  // ─── Rehydrate session on mount ────────────────────────
  useEffect(() => {
    rehydrateSession()
  }, [rehydrateSession])

  // ─── Fetch event data from API ─────────────────────────
  useEffect(() => {
    async function fetchEventData() {
      try {
        const response = await publicApi.getEventBySlug(selectedSlug)
        if (response && typeof response === 'object' && 'event' in response) {
          const event = (response as { event: Record<string, unknown> }).event
          if (event) {
            setEventData(prev => ({
              ...prev,
              id: (event.id as string) || prev.id,
              slug: (event.slug as string) || prev.slug,
              title: (event.title as string) || prev.title,
              subtitle: (event.subtitle as string) || prev.subtitle,
              date: (event.date as string) || prev.date,
              venue: (event.venue as string) || prev.venue,
              city: (event.city as string) || prev.city,
              capacity: (event.capacity as number) || prev.capacity,
              status: (event.status as 'published' | 'draft' | 'sold_out') || prev.status,
            }))

            // Extract ticket types from the event response (backend preloads them via db.Preload("TicketTypes"))
            const eventTicketTypes = event.ticketTypes
            if (Array.isArray(eventTicketTypes) && eventTicketTypes.length > 0) {
              const apiTickets: TicketTypeDisplay[] = eventTicketTypes.map((tt: Record<string, unknown>) => ({
                id: (tt.id as string) || '',
                name: (tt.name as string) || '',
                description: (tt.description as string) || '',
                price: (tt.price as number) || 0,
                quota: (tt.quota as number) || 0,
                sold: (tt.sold as number) || 0,
                tier: ((tt.tier as string) === 'tribun' ? 'tribun' : 'floor') as 'floor' | 'tribun',
                emoji: (tt.emoji as string) || '🎟️',
                platformFee: (tt.platformFee as number) || 0,
                benefits: (() => {
                  if (Array.isArray(tt.benefits)) return tt.benefits as string[]
                  if (typeof tt.benefits === 'string') {
                    try { const parsed = JSON.parse(tt.benefits); return Array.isArray(parsed) ? parsed : [] }
                    catch { return [] }
                  }
                  return []
                })(),
              }))
              setTicketTypes(apiTickets)
            }
          }
        }
      } catch {
        // Silently use fallback data
      }
    }

    fetchEventData()
  }, [selectedSlug])

  // ─── Login handler ─────────────────────────────────────
  const handleLogin = useCallback(async () => {
    setLoginLoading(true)
    try {
      await login()
      setLoginModalOpen(false)
      toast.success('Berhasil masuk! Selamat datang, Sobat Duta 🎵')
    } catch (error) {
      toast.error('Gagal masuk. Silakan coba lagi.')
    } finally {
      setLoginLoading(false)
    }
  }, [login])

  // ─── Login modal trigger ───────────────────────────────
  const openLoginModal = useCallback(() => {
    setLoginModalOpen(true)
  }, [])

  // Listen for navbar's custom event
  useEffect(() => {
    const handler = () => setLoginModalOpen(true)
    window.addEventListener('open-login-modal', handler)
    return () => window.removeEventListener('open-login-modal', handler)
  }, [])

  // ─── Buy ticket handler ────────────────────────────────
  const handleBuyTicket = useCallback((tt: TicketTypeDisplay) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true)
      toast.info('Silakan login terlebih dahulu untuk membeli tiket')
      return
    }

    const config = defaultSeatConfigs.find(c => c.tierId === tt.id)
    const mode = config?.seatSelectionMode || 'seat_selection'

    setSelectedTier(tt)

    if (mode === 'auto_assign') {
      setAutoAssignModalOpen(true)
    } else {
      setSeatModalOpen(true)
    }
  }, [isAuthenticated])

  // ─── City selection handler ────────────────────────────
  const handleSelectCity = useCallback((city: typeof TOUR_CITIES[number]) => {
    setSelectedCity(city)
    setSelectedSlug(city.slug)
    // Scroll to tickets section after a brief delay for data to load
    setTimeout(() => {
      const el = document.querySelector('#tickets')
      el?.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }, [])

  // ─── Render page views ─────────────────────────────────
  if (currentPage === 'checkout') {
    return <CheckoutPage />
  }

  if (currentPage === 'payment') {
    return <PaymentPage />
  }

  if (currentPage === 'payment-status') {
    return <PaymentStatusPage />
  }

  if (currentPage === 'eticket') {
    return <ETicketPage />
  }

  if (currentPage === 'my-orders') {
    return <MyOrdersPage />
  }

  if (currentPage === 'profile') {
    return <ProfilePage />
  }

  // ─── Render Landing Page ───────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <HeroSection onLoginClick={openLoginModal} isAuthenticated={isAuthenticated} selectedCity={selectedCity} />
        <BrandStorySection />
        <TourScheduleSection selectedCity={selectedCity} onSelectCity={handleSelectCity} />
        <LineupSection />
        <WristbandSection />
        <TicketsFloorSection ticketTypes={ticketTypes} onBuy={handleBuyTicket} />
        <TicketsTribunSection ticketTypes={ticketTypes} onBuy={handleBuyTicket} />
        <VenueSection selectedCity={selectedCity} />
        <HighlightsSection />
        <VVIPShowcaseSection ticketTypes={ticketTypes} onBuy={handleBuyTicket} />
        <PaymentMethodsSection />
        <FAQSection faqs={faqs} />
        <TrustCTASection onLoginClick={openLoginModal} isAuthenticated={isAuthenticated} />
      </main>

      <Footer />

      {/* Google Login Modal */}
      <GoogleLoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onLogin={handleLogin}
        isLoading={loginLoading}
      />

      {/* Seat Selection Modal */}
      {selectedTier && (
        <SeatSelectionModal
          open={seatModalOpen}
          onOpenChange={setSeatModalOpen}
          tierId={selectedTier.id}
          tierName={selectedTier.name}
          tierEmoji={selectedTier.emoji}
          price={selectedTier.price}
        />
      )}

      {/* Auto Assign Modal */}
      {selectedTier && (
        <AutoAssignModal
          open={autoAssignModalOpen}
          onOpenChange={setAutoAssignModalOpen}
          tierId={selectedTier.id}
          tierName={selectedTier.name}
          tierEmoji={selectedTier.emoji}
          price={selectedTier.price}
        />
      )}
    </div>
  )
}
