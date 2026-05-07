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
  Play,
  ChevronRight,
  ExternalLink,
  Crown,
  Gem,
  CircleDot,
  Navigation,
  Bus,
  Car,
  TrainFront,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/utils'
import { publicApi, paymentApi, orderApi } from '@/lib/api'
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
  { slug: 'sheila-on7-jakarta', city: 'Jakarta', date: '22 Juni 2026', venue: 'GBK Madya Stadium', day: '22', month: 'JUN' },
  { slug: 'sheila-on7-balikpapan', city: 'Balikpapan', date: '29 Juni 2025', venue: 'Lapangan Merdeka BPN', day: '29', month: 'JUN' },
] as const

// ─── FALLBACK STATIC DATA ──────────────────────────────────
const FALLBACK_EVENT = {
  id: '30000000-0000-0000-0000-000000000001',
  slug: 'sheila-on7-jakarta',
  title: 'Sheila On 7 — JAKARTA',
  subtitle: 'Meloncat Lebih Tinggi Tour 2026',
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
    platformFee: 2,
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
    platformFee: 2,
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
    platformFee: 2,
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
    platformFee: 2,
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
    platformFee: 2,
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
    platformFee: 2,
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
    platformFee: 2,
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
    platformFee: 2,
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
    platformFee: 2,
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

// ─── Parallax scroll hook ──────────────────────────────────
function useParallax() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const handler = () => setOffset(window.scrollY * 0.35)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return offset
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
// Section 1 — STUNNING HERO
// ─────────────────────────────────────────────────────────
function HeroSection({ onLoginClick, isAuthenticated, selectedCity }: { onLoginClick: () => void; isAuthenticated: boolean; selectedCity: typeof TOUR_CITIES[number] }) {
  const scrollY = useParallax()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <section id="beranda" className="relative h-screen min-h-[600px] max-h-[1200px] flex items-center justify-center overflow-hidden">
      {/* Hero image background - full visible, no crop */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-concert.png"
          alt="Sheila On 7 — Meloncat Lebih Tinggi Live Concert"
          fill
          className="object-cover object-top sm:object-contain sm:object-center"
          priority
          sizes="100vw"
          quality={95}
        />
      </div>

      {/* Subtle gradient overlay - only bottom for text readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      {/* Very subtle side vignette */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/10 via-transparent to-black/10" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 text-center py-20 flex flex-col items-center justify-center h-full">

        {/* TOUR 2026 — Animated Text */}
        <div className="hero-text-container relative mb-8">
          {/* Sparkle particles around text */}
          {mounted && (
            <>
              <div className="hero-sparkle-dot" style={{ top: '-15px', left: '5%', animationDelay: '0.8s' }} />
              <div className="hero-sparkle-dot" style={{ top: '-10px', right: '8%', animationDelay: '1.5s' }} />
              <div className="hero-sparkle-dot" style={{ bottom: '-12px', left: '12%', animationDelay: '2.2s' }} />
              <div className="hero-sparkle-dot" style={{ bottom: '-8px', right: '15%', animationDelay: '1.1s' }} />
              <div className="hero-sparkle-dot" style={{ top: '50%', left: '-20px', animationDelay: '1.8s' }} />
              <div className="hero-sparkle-dot" style={{ top: '50%', right: '-20px', animationDelay: '2.5s' }} />
            </>
          )}

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none select-none">
            {'TOUR 2026'.split('').map((char, i) => (
              <span
                key={i}
                className={cn(
                  'hero-letter-glow gradient-text-gold',
                  char === ' ' ? 'mr-4' : ''
                )}
                style={{
                  animationDelay: `${0.3 + i * 0.1}s`,
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h1>

          {/* Animated underline */}
          {mounted && (
            <div className="flex items-center justify-center mt-4">
              <div
                className="hero-underline h-[3px] rounded-full bg-gradient-to-r from-transparent via-gold to-transparent"
                style={{
                  width: '80%',
                  maxWidth: '400px',
                  animationDelay: '1.4s',
                  animationFillMode: 'both',
                }}
              />
            </div>
          )}
        </div>

        {/* City & Date pills */}
        <div className={cn('flex items-center justify-center gap-3 flex-wrap mt-2 transition-all duration-1000', mounted ? 'opacity-100 translate-y-0 delay-1000' : 'opacity-0 translate-y-8')}>
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/30 bg-black/40 backdrop-blur-md text-sm">
            <MapPin className="h-4 w-4 text-gold" />
            <span className="font-semibold text-white">{selectedCity.city}</span>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 bg-black/40 backdrop-blur-md text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold text-white">{selectedCity.date}</span>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-sm">
            <MapPin className="h-4 w-4 text-white/60" />
            <span className="font-medium text-white/80">{selectedCity.venue}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className={cn('flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 transition-all duration-1000', mounted ? 'opacity-100 translate-y-0 delay-[1200ms]' : 'opacity-0 translate-y-8')}>
          <Button
            size="lg"
            className="btn-shine text-sm px-10 h-13 rounded-full bg-gradient-to-r from-gold via-amber-500 to-gold text-black font-bold hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 shadow-[0_0_40px_rgba(248,173,60,0.3)] hover:shadow-[0_0_60px_rgba(248,173,60,0.5)] transition-all duration-500 animate-pulse-glow-gold"
            onClick={() => {
              if (!isAuthenticated) {
                onLoginClick()
                return
              }
              const el = document.querySelector('#tickets')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <Ticket className="mr-2 h-5 w-5" />
            Beli Tiket
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-sm px-8 h-13 rounded-full glass border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
            onClick={() => {
              const el = document.querySelector('#schedule')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Lihat Jadwal Tour
          </Button>
        </div>

        {/* Google Login hint */}
        {!isAuthenticated && (
          <div className={cn('mt-6 transition-all duration-1000', mounted ? 'opacity-100 translate-y-0 delay-[1500ms]' : 'opacity-0 translate-y-8')}>
            <Button
              variant="ghost"
              className="text-xs text-white/40 hover:text-white/70 gap-2 transition-colors duration-300"
              onClick={onLoginClick}
            >
              <Chrome className="h-3.5 w-3.5" />
              Login dengan Google untuk membeli tiket
            </Button>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-[10px] text-white/30 tracking-[0.3em] uppercase font-light">Scroll</span>
        <ChevronDown className="h-4 w-4 text-white/20" />
      </div>

      {/* Bottom gradient fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-[5]" />
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 2 — Tour Schedule
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
    <section id="schedule" className="py-24 md:py-32 relative overflow-hidden bg-section-dark" ref={ref}>
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute top-20 right-10 w-40 h-40 dot-pattern-gold opacity-10 rounded-full" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-14">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge section-badge-gold mb-5 mx-auto w-fit">
              <Calendar className="h-3 w-3" />
              Jadwal Tour
            </div>
          </div>
          <h2 className={cn('text-3xl sm:text-4xl md:text-5xl font-black tracking-tight', inView && 'animate-fade-in-up delay-100')}>
            <span className="gradient-text-gold">TOUR 5 KOTA</span>
          </h2>
          <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto">Pilih kota dan dapatkan tiket konser terdekat</p>
        </div>

        {/* City cards */}
        <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-5 max-w-6xl mx-auto', inView && 'animate-fade-in-up delay-200')}>
          {TOUR_CITIES.map((city, idx) => {
            const isSelected = city.slug === selectedCity.slug
            return (
              <div
                key={city.slug}
                className={cn(
                  'group',
                  inView && 'animate-fade-in-up'
                )}
                style={inView ? { animationDelay: `${200 + idx * 100}ms` } : undefined}
              >
                <div
                  className={cn(
                    'relative rounded-2xl p-6 text-center transition-all duration-500 cursor-pointer border-2 hover-lift',
                    isSelected
                      ? 'border-gold/50 bg-gradient-to-b from-gold/10 via-gold/5 to-transparent shadow-[0_0_30px_rgba(248,173,60,0.12)]'
                      : 'border-white/5 bg-white/[0.02] hover:border-gold/20 hover:bg-white/[0.04]'
                  )}
                  onClick={() => onSelectCity(city)}
                >
                  {isSelected && (
                    <div className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-1 bg-gold rounded-b-full" />
                  )}

                  {/* Date badge */}
                  <div className={cn(
                    'inline-flex flex-col items-center rounded-xl px-4 py-3 mb-4',
                    isSelected ? 'bg-gold/15 border border-gold/20' : 'bg-white/5 border border-white/5'
                  )}>
                    <span className={cn('text-3xl font-black leading-none', isSelected ? 'text-gold' : 'text-white/80')}>
                      {city.day}
                    </span>
                    <span className={cn('text-[10px] font-bold tracking-widest mt-1', isSelected ? 'text-gold/70' : 'text-muted-foreground')}>
                      {city.month}
                    </span>
                  </div>

                  {/* City name */}
                  <h3 className={cn(
                    'font-bold text-lg mb-1.5 transition-colors duration-300',
                    isSelected ? 'gradient-text-gold' : 'text-white group-hover:text-gold'
                  )}>
                    {city.city}
                  </h3>

                  {/* Venue */}
                  <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed min-h-[2.5em]">
                    {city.venue}
                  </p>

                  {/* Select indicator */}
                  <div className={cn(
                    'flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-300',
                    isSelected ? 'text-gold' : 'text-muted-foreground group-hover:text-white'
                  )}>
                    {isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Terpilih
                      </>
                    ) : (
                      <>
                        <CircleDot className="h-3 w-3" />
                        Pilih Kota
                      </>
                    )}
                  </div>
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
// Section 3 — Ticket Categories (Floor + Tribune Combined)
// ─────────────────────────────────────────────────────────
function TicketsSection({ ticketTypes, onBuy }: { ticketTypes: TicketTypeDisplay[]; onBuy: (tt: TicketTypeDisplay) => void }) {
  const { ref, inView } = useInView()
  const floorTiers = ticketTypes.filter((t) => t.tier === 'floor')
  const tribunTiers = ticketTypes.filter((t) => t.tier === 'tribun')
  const [activeTab, setActiveTab] = useState<'floor' | 'tribun'>('floor')

  return (
    <section id="tickets" className="py-24 md:py-32 relative overflow-hidden" ref={ref}>
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-section-mesh opacity-50" />
      </div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-5 mx-auto w-fit">
              <Ticket className="h-3 w-3" />
              Tiket
            </div>
          </div>
          <h2 className={cn('text-3xl sm:text-4xl md:text-5xl font-black tracking-tight', inView && 'animate-fade-in-up delay-100')}>
            <span className="gradient-text-gold">PILIHKAN</span> TIKETMU
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">Pilih zona dan kategori tiket sesuai keinginanmu</p>
        </div>

        {/* Floor / Tribune toggle */}
        <div className={cn('flex items-center justify-center gap-2 mb-10', inView && 'animate-fade-in-up delay-200')}>
          <button
            onClick={() => setActiveTab('floor')}
            className={cn(
              'px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300',
              activeTab === 'floor'
                ? 'bg-gradient-to-r from-gold to-amber-500 text-black shadow-[0_0_25px_rgba(248,173,60,0.25)]'
                : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5'
            )}
          >
            <span className="mr-1.5">🎤</span> Floor Zone
          </button>
          <button
            onClick={() => setActiveTab('tribun')}
            className={cn(
              'px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300',
              activeTab === 'tribun'
                ? 'bg-gradient-to-r from-primary to-teal-400 text-black shadow-[0_0_25px_rgba(0,163,157,0.25)]'
                : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5'
            )}
          >
            <span className="mr-1.5">💺</span> Tribune Zone
          </button>
        </div>

        {/* Floor Zone Cards */}
        {activeTab === 'floor' && (
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {floorTiers.map((tier, idx) => {
              const isVVIP = tier.id === 'tt-vvip'
              const pct = getQuotaPercentage(tier)
              const available = getAvailableQuota(tier)
              const wristband = WRISTBAND_COLORS[tier.name]

              return (
                <Card
                  key={tier.id}
                  className={cn(
                    'relative overflow-hidden transition-all duration-500 hover-lift border',
                    isVVIP
                      ? 'border-gold/30 bg-gradient-to-b from-gold/[0.06] via-card to-card animate-pulse-glow-gold'
                      : 'border-white/5 bg-card/80 hover:border-primary/20',
                    inView && 'animate-fade-in-up'
                  )}
                  style={inView ? { animationDelay: `${200 + idx * 150}ms` } : undefined}
                >
                  {isVVIP && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold via-amber-400 to-gold" />
                  )}
                  {isVVIP && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-gold text-black text-[9px] font-bold px-2.5 py-0.5 tracking-wider">
                        EXCLUSIVE
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-6">
                    <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-500">{tier.emoji}</div>
                    <CardTitle className={cn('text-lg font-black', isVVIP && 'gradient-text-gold')}>
                      {tier.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">{tier.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2 pb-6">
                    {/* Price */}
                    <div className="text-center mb-4">
                      <span className={cn(
                        'text-3xl font-black',
                        isVVIP ? 'gradient-text-gold' : 'text-white'
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

                    {/* Wristband indicator */}
                    {wristband && (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <div
                          className="w-4 h-4 rounded-full border border-white/10"
                          style={{ backgroundColor: wristband.hex, boxShadow: `0 0 10px ${wristband.hex}40` }}
                        />
                        <span className="text-[11px] text-muted-foreground">Gelang {wristband.color}</span>
                      </div>
                    )}

                    {/* Quota progress */}
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Sisa <strong className="text-white">{available}</strong> kursi</span>
                        <span className={cn(pct >= 90 ? 'text-destructive font-bold' : 'text-muted-foreground')}>
                          {pct}% terjual
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className={cn('h-1.5', isVVIP && '[&>div]:bg-gold')}
                      />
                    </div>

                    {/* Benefits */}
                    <ul className="space-y-2 mb-6">
                      {tier.benefits.slice(0, isVVIP ? 8 : 3).map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs">
                          <Check className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', isVVIP ? 'text-gold' : 'text-primary')} />
                          <span className="text-muted-foreground">{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      className={cn(
                        'w-full rounded-full h-11 text-xs font-bold btn-shine transition-all duration-300',
                        isVVIP
                          ? 'bg-gradient-to-r from-gold via-amber-500 to-gold text-black hover:shadow-[0_0_30px_rgba(248,173,60,0.4)]'
                          : 'glow-bsi-strong'
                      )}
                      disabled={available === 0}
                      onClick={() => {
                        if (available === 0) { toast.error('Maaf, tiket sudah habis!'); return }
                        onBuy(tier)
                      }}
                    >
                      {available === 0 ? 'Habis Terjual' : 'Pilih Kursi'}
                      {available > 0 && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Tribune Zone Cards */}
        {activeTab === 'tribun' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {tribunTiers.map((tier, idx) => {
              const pct = getQuotaPercentage(tier)
              const available = getAvailableQuota(tier)
              const wristband = WRISTBAND_COLORS[tier.name]

              return (
                <Card
                  key={tier.id}
                  className={cn(
                    'relative overflow-hidden transition-all duration-500 hover-lift border border-white/5 bg-card/80 hover:border-primary/20',
                    inView && 'animate-fade-in-up'
                  )}
                  style={inView ? { animationDelay: `${100 + idx * 80}ms` } : undefined}
                >
                  <CardContent className="pt-5 pb-5 px-5 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-3xl">{tier.emoji}</div>
                      {wristband && (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-full border border-white/10"
                            style={{ backgroundColor: wristband.hex, boxShadow: `0 0 8px ${wristband.hex}40` }}
                          />
                          <span className="text-[9px] text-muted-foreground">{wristband.color}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-sm mb-1">{tier.name}</h3>
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{tier.description}</p>

                    <div className="text-2xl font-black gradient-text-white mb-0.5">
                      {formatRupiah(tier.price)}
                    </div>
                    {tier.platformFee && tier.platformFee > 0 && (
                      <div className="text-[9px] text-muted-foreground mb-3">
                        + {formatRupiah(Math.round(tier.price * tier.platformFee / 100))} fee ({tier.platformFee}%)
                      </div>
                    )}

                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-muted-foreground">Sisa <strong className="text-white">{available}</strong></span>
                        <span className={cn(pct >= 90 ? 'text-destructive font-bold' : 'text-muted-foreground')}>{pct}% terjual</span>
                      </div>
                      <Progress value={pct} className="h-1 mb-4" />

                      <ul className="space-y-1 mb-4">
                        {tier.benefits.slice(0, 2).map((b) => (
                          <li key={b} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Check className="h-2.5 w-2.5 text-primary shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        size="sm"
                        className="w-full rounded-full text-[11px] font-bold btn-shine"
                        disabled={available === 0}
                        onClick={() => {
                          if (available === 0) { toast.error('Maaf, tiket sudah habis!'); return }
                          onBuy(tier)
                        }}
                      >
                        {available === 0 ? 'Habis' : getSelectionModeLabel(defaultSeatConfigs.find(c => c.tierId === tier.id)?.seatSelectionMode || 'seat_selection')}
                        {available > 0 && <ArrowRight className="ml-1 h-3 w-3" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 4 — Venue Info
// ─────────────────────────────────────────────────────────
function VenueSection({ selectedCity }: { selectedCity: typeof TOUR_CITIES[number] }) {
  const { ref, inView } = useInView()

  // Venue details per city
  const VENUE_DETAILS: Record<string, {
    address: string
    mapUrl: string
    transport: { icon: React.ReactNode; label: string; desc: string }[]
    facilities: { icon: React.ReactNode; label: string }[]
  }> = {
    'Bandung': {
      address: 'Jl. Baros No.1, Cimahi, Jawa Barat 40511',
      mapUrl: 'https://maps.google.com/?q=Baros+Field+Cimahi',
      transport: [
        { icon: <TrainFront className="h-4 w-4" />, label: 'Kereta', desc: 'Stasiun Cimahi (5 menit)' },
        { icon: <Bus className="h-4 w-4" />, label: 'Bus', desc: 'Terminal Cimahi (10 menit)' },
        { icon: <Car className="h-4 w-4" />, label: 'Mobil', desc: 'Parkir tersedia di area venue' },
      ],
      facilities: [
        { icon: <Utensils className="h-4 w-4" />, label: 'Food Court' },
        { icon: <Volume2 className="h-4 w-4" />, label: 'Sound System' },
        { icon: <Camera className="h-4 w-4" />, label: 'Photobooth' },
        { icon: <Handshake className="h-4 w-4" />, label: 'Merch Area' },
      ],
    },
    'Makassar': {
      address: 'Pantai Losari, Makassar, Sulawesi Selatan 90173',
      mapUrl: 'https://maps.google.com/?q=Pantai+Losari+Makassar',
      transport: [
        { icon: <TrainFront className="h-4 w-4" />, label: 'Kereta', desc: 'Stasiun Manggala (15 menit)' },
        { icon: <Bus className="h-4 w-4" />, label: 'Bus', desc: 'Terminal Daya (20 menit)' },
        { icon: <Car className="h-4 w-4" />, label: 'Mobil', desc: 'Parkir tersedia' },
      ],
      facilities: [
        { icon: <Utensils className="h-4 w-4" />, label: 'Food Court' },
        { icon: <Volume2 className="h-4 w-4" />, label: 'Sound System' },
        { icon: <Camera className="h-4 w-4" />, label: 'Photobooth' },
        { icon: <Handshake className="h-4 w-4" />, label: 'Merch Area' },
      ],
    },
    'Medan': {
      address: 'Jl. Balai Kota, Medan, Sumatera Utara 20112',
      mapUrl: 'https://maps.google.com/?q=Lapangan+Merdeka+Medan',
      transport: [
        { icon: <TrainFront className="h-4 w-4" />, label: 'Kereta', desc: 'Stasiun Medan (10 menit)' },
        { icon: <Bus className="h-4 w-4" />, label: 'Bus', desc: 'Terminal Amplas (20 menit)' },
        { icon: <Car className="h-4 w-4" />, label: 'Mobil', desc: 'Parkir tersedia' },
      ],
      facilities: [
        { icon: <Utensils className="h-4 w-4" />, label: 'Food Court' },
        { icon: <Volume2 className="h-4 w-4" />, label: 'Sound System' },
        { icon: <Camera className="h-4 w-4" />, label: 'Photobooth' },
        { icon: <Handshake className="h-4 w-4" />, label: 'Merch Area' },
      ],
    },
    'Jakarta': {
      address: 'Jl. Gatot Subroto, Senayan, Kebayoran Baru, Jakarta Pusat 10270',
      mapUrl: 'https://maps.google.com/?q=GBK+Madya+Stadium+Jakarta',
      transport: [
        { icon: <TrainFront className="h-4 w-4" />, label: 'MRT', desc: 'Stasiun Senayan (5 menit jalan)' },
        { icon: <Bus className="h-4 w-4" />, label: 'TransJakarta', desc: 'Halte Senayan (3 menit)' },
        { icon: <Car className="h-4 w-4" />, label: 'Mobil', desc: 'Parkir GBK tersedia' },
      ],
      facilities: [
        { icon: <Utensils className="h-4 w-4" />, label: 'Food Court' },
        { icon: <Volume2 className="h-4 w-4" />, label: 'Sound System' },
        { icon: <Camera className="h-4 w-4" />, label: 'Photobooth' },
        { icon: <Handshake className="h-4 w-4" />, label: 'Merch Area' },
        { icon: <ShieldCheck className="h-4 w-4" />, label: 'Medical Tent' },
        { icon: <CreditCard className="h-4 w-4" />, label: 'Top-up Area' },
      ],
    },
    'Balikpapan': {
      address: 'Jl. MT Haryono, Balikpapan, Kalimantan Timur 76114',
      mapUrl: 'https://maps.google.com/?q=Lapangan+Merdeka+Balikpapan',
      transport: [
        { icon: <TrainFront className="h-4 w-4" />, label: 'Kereta', desc: 'Belum tersedia' },
        { icon: <Bus className="h-4 w-4" />, label: 'Bus', desc: 'Terminal Damai (15 menit)' },
        { icon: <Car className="h-4 w-4" />, label: 'Mobil', desc: 'Parkir tersedia' },
      ],
      facilities: [
        { icon: <Utensils className="h-4 w-4" />, label: 'Food Court' },
        { icon: <Volume2 className="h-4 w-4" />, label: 'Sound System' },
        { icon: <Camera className="h-4 w-4" />, label: 'Photobooth' },
        { icon: <Handshake className="h-4 w-4" />, label: 'Merch Area' },
      ],
    },
  }

  const details = VENUE_DETAILS[selectedCity.city] || VENUE_DETAILS['Jakarta']!

  return (
    <section id="venue" className="py-24 md:py-32 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-section-mesh opacity-50" />
      </div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-14">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge section-badge-gold mb-5 mx-auto w-fit">
              <MapPin className="h-3 w-3" />
              Lokasi
            </div>
          </div>
          <h2 className={cn('text-3xl sm:text-4xl md:text-5xl font-black tracking-tight', inView && 'animate-fade-in-up delay-100')}>
            <span className="gradient-text-gold">VENUE</span> KONSER
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">Informasi lokasi dan akses menuju venue</p>
        </div>

        <div className={cn('max-w-5xl mx-auto', inView && 'animate-fade-in-up delay-200')}>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Venue image & map */}
            <div className="space-y-4">
              {/* Venue image */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video">
                <Image
                  src="/images/sections/venue.png"
                  alt={`Venue ${selectedCity.venue}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-gold" />
                    <span className="font-bold text-white text-sm">{selectedCity.venue}</span>
                  </div>
                  <span className="text-[11px] text-white/60">{selectedCity.city}</span>
                </div>
              </div>

              {/* Google Maps link */}
              <a
                href={details.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl glass border border-white/5 hover:border-gold/20 hover:bg-white/[0.04] transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                  <Navigation className="h-4 w-4 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Buka di Google Maps</p>
                  <p className="text-[11px] text-muted-foreground">{details.address}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
              </a>
            </div>

            {/* Right: Transport & Facilities */}
            <div className="space-y-6">
              {/* Transport */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gold mb-4 flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Cara Menuju Venue
                </h3>
                <div className="space-y-3">
                  {details.transport.map((t) => (
                    <div key={t.label} className="flex items-center gap-4 p-3 rounded-xl glass border border-white/5">
                      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-primary">
                        {t.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{t.label}</p>
                        <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gold mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Fasilitas Venue
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {details.facilities.map((f) => (
                    <div key={f.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="text-primary">{f.icon}</div>
                      <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important notice */}
              <div className="p-4 rounded-xl border border-gold/20 bg-gold/[0.04]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold mb-1">Penting untuk Diketahui</p>
                    <ul className="text-[11px] text-muted-foreground space-y-1">
                      <li>• Pintu dibuka pukul 16:00 WIB, datanglah lebih awal</li>
                      <li>• Wajib menukarkan e-tiket dengan gelang di booth redeem</li>
                      <li>• Dilarang membawa makanan/minuman dari luar</li>
                      <li>• Parkir terbatas, disarankan gunakan transportasi umum</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Section 5 — Wristband Color Guide
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
// Section 5 — FAQ
// ─────────────────────────────────────────────────────────
function FAQSection({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const { ref, inView } = useInView()

  return (
    <section id="faq" className="py-24 md:py-32 relative overflow-hidden bg-section-dark" ref={ref}>
      <div className="absolute inset-0 dot-pattern opacity-[0.03]" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-14">
          <div className={cn(inView && 'animate-fade-in-up')}>
            <div className="section-badge mb-5 mx-auto w-fit">FAQ</div>
          </div>
          <h2 className={cn('text-3xl sm:text-4xl md:text-5xl font-black tracking-tight', inView && 'animate-fade-in-up delay-100')}>
            Pertanyaan <span className="gradient-text">Umum</span>
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">Jawaban untuk pertanyaan yang sering ditanyakan</p>
        </div>

        <div className={cn('max-w-2xl mx-auto', inView && 'animate-fade-in-up delay-200')}>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border border-white/5 rounded-xl px-5 bg-white/[0.02] overflow-hidden data-[state=open]:border-primary/20 data-[state=open]:bg-primary/[0.03] transition-colors duration-300">
                <AccordionTrigger className="text-left text-sm hover:no-underline hover:text-primary transition-colors py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
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
// Section 6 — Trust + Final CTA
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
    <section className="py-24 md:py-32 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-section-radial" />
      <div className="absolute inset-0 bg-section-radial-gold" />

      <div className="container mx-auto px-4 relative z-10">
        <div className={cn('flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-14', inView && 'animate-fade-in-up')}>
          {trustBadges.map((badge, idx) => (
            <div
              key={badge.label}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full glass-teal text-xs text-muted-foreground hover-lift',
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
            Jangan Sampai <span className="gradient-text-gold">Kehabisan!</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            Kuota terbatas! Pastikan kamu menjadi bagian dari malam bersejarah ini
            bersama Sheila On 7 dan ribuan Sobat Duta lainnya.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="btn-shine text-sm px-10 h-13 rounded-full bg-gradient-to-r from-gold via-amber-500 to-gold text-black font-bold hover:shadow-[0_0_40px_rgba(248,173,60,0.4)] transition-all duration-500 animate-pulse-glow-gold"
              onClick={() => {
                if (!isAuthenticated) {
                  onLoginClick()
                  return
                }
                const el = document.querySelector('#tickets')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <Ticket className="mr-2 h-5 w-5" />
              Beli Tiket Sekarang
            </Button>
            {!isAuthenticated && (
              <Button
                size="lg"
                variant="outline"
                className="text-sm px-8 h-13 rounded-full glass gap-2"
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
        <TourScheduleSection selectedCity={selectedCity} onSelectCity={handleSelectCity} />
        <TicketsSection ticketTypes={ticketTypes} onBuy={handleBuyTicket} />
        <VenueSection selectedCity={selectedCity} />
        <WristbandSection />
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
