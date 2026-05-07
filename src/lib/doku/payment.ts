// ─── DOKU PAYMENT FRONTEND HELPERS ──────────────────────────────
// Client-side utilities for DOKU payment flow
// Safe to import in client components

import { DOKU_PM_LABELS, DOKU_PM_GROUPS } from './constants'

// ─── TYPES ─────────────────────────────────────────────────────

export interface PaymentMethodInfo {
  label: string
  icon: string
  description: string
  color: string
  category: 'va' | 'ewallet' | 'qris' | 'cc' | 'cstore' | 'paylater'
}

// ─── CATEGORY DISPLAY CONFIG ───────────────────────────────────

export const PAYMENT_CATEGORY_CONFIG: Record<string, {
  label: string
  icon: string
  color: string
  description: string
}> = {
  virtual_account: {
    label: 'Transfer Virtual Account',
    icon: 'Building2',
    color: '#2563EB',
    description: 'Bayar via ATM, mobile banking, atau internet banking',
  },
  ewallet: {
    label: 'E-Wallet',
    icon: 'Smartphone',
    color: '#7C3AED',
    description: 'Bayar via OVO, ShopeePay, DANA, LinkAja',
  },
  qris: {
    label: 'QRIS',
    icon: 'QrCode',
    color: '#059669',
    description: 'Scan QR code dengan aplikasi e-wallet atau mobile banking',
  },
  credit_card: {
    label: 'Kartu Kredit / Debit',
    icon: 'CreditCard',
    color: '#DC2626',
    description: 'Visa, Mastercard, JCB, AMEX',
  },
  convenience_store: {
    label: 'Gerai Retail',
    icon: 'Store',
    color: '#EA580C',
    description: 'Bayar di Alfamart, Alfamidi, atau Indomaret',
  },
  paylater: {
    label: 'PayLater',
    icon: 'CalendarClock',
    color: '#0891B2',
    description: 'Bayar nanti dengan Akulaku, Kredivo, Indodana',
  },
}

// ─── BANK ICON MAPPING ─────────────────────────────────────────

const BANK_COLORS: Record<string, string> = {
  BCA: '#003D79',
  Mandiri: '#003366',
  BSI: '#00A650',
  BRI: '#00529C',
  BNI: '#F15A22',
  Permata: '#005BAA',
  CIMB: '#7B0E24',
  Danamon: '#FDDA24',
}

const EWALLET_COLORS: Record<string, string> = {
  OVO: '#4C3494',
  ShopeePay: '#EE4D2D',
  DANA: '#108EE9',
  LinkAja: '#D4145A',
  'DOKU Wallet': '#00A19C',
}

// ─── HELPER: Get payment method display info ───────────────────

export function getPaymentMethodInfo(paymentMethod: string): PaymentMethodInfo {
  const label = DOKU_PM_LABELS[paymentMethod] || paymentMethod

  // Determine category
  let category: PaymentMethodInfo['category'] = 'va'
  let color = '#6B7280'
  let icon = 'CircleDollarSign'

  if (paymentMethod.startsWith('VIRTUAL_ACCOUNT') || paymentMethod.includes('VA')) {
    category = 'va'
    const bankName = label.replace(' Virtual Account', '').trim()
    color = BANK_COLORS[bankName] || '#2563EB'
    icon = 'Building2'
  } else if (paymentMethod.startsWith('EMONEY') || paymentMethod.startsWith('EWALLET')) {
    category = 'ewallet'
    color = EWALLET_COLORS[label] || '#7C3AED'
    icon = 'Smartphone'
  } else if (paymentMethod === 'QRIS') {
    category = 'qris'
    color = '#059669'
    icon = 'QrCode'
  } else if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'GOOGLE_PAY') {
    category = 'cc'
    color = '#DC2626'
    icon = 'CreditCard'
  } else if (paymentMethod.startsWith('ONLINE_TO_OFFLINE')) {
    category = 'cstore'
    color = '#EA580C'
    icon = 'Store'
  } else if (paymentMethod.startsWith('PEER_TO_PEER')) {
    category = 'paylater'
    color = '#0891B2'
    icon = 'CalendarClock'
  } else if (paymentMethod.startsWith('DIRECT_DEBIT')) {
    category = 'va'
    color = '#00529C'
    icon = 'Building2'
  }

  return { label, icon, description: '', color, category }
}

// ─── HELPER: Get payment category label ────────────────────────

export function getPaymentCategoryLabel(categoryKey: string): string {
  return PAYMENT_CATEGORY_CONFIG[categoryKey]?.label || categoryKey
}

// ─── HELPER: Redirect to DOKU Checkout page ────────────────────

export function redirectToDokuCheckout(params: {
  paymentUrl: string
}): void {
  window.location.href = params.paymentUrl
}

// ─── HELPER: Format VA number with spaces ──────────────────────

export function formatVANumber(vaNumber: string): string {
  // Remove existing spaces, then format in 4-digit groups
  const clean = vaNumber.replace(/\s/g, '')
  return clean.replace(/(\d{4})/g, '$1 ').trim()
}

// ─── HELPER: Generate QR code URL ─────────────────────────────

export function getQRCodeUrl(qrContent: string, size: number = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrContent)}`
}

// ─── HELPER: Check if payment method needs inline display ──────
// VA and QRIS show payment details in-app; others redirect

export function isInlinePaymentMethod(paymentMethod: string): boolean {
  return (
    paymentMethod.startsWith('VIRTUAL_ACCOUNT') ||
    paymentMethod.includes('VA') ||
    paymentMethod === 'QRIS'
  )
}

// ─── HELPER: Check if payment method redirects to external ─────

export function isRedirectPaymentMethod(paymentMethod: string): boolean {
  return (
    paymentMethod.startsWith('EMONEY') ||
    paymentMethod === 'CREDIT_CARD' ||
    paymentMethod === 'GOOGLE_PAY' ||
    paymentMethod.startsWith('ONLINE_TO_OFFLINE') ||
    paymentMethod.startsWith('PEER_TO_PEER') ||
    paymentMethod.startsWith('DIRECT_DEBIT')
  )
}

// ─── HELPER: Get payment method instructions ───────────────────

export function getPaymentInstructions(paymentMethod: string): string[] {
  if (paymentMethod.startsWith('VIRTUAL_ACCOUNT') || paymentMethod.includes('VA')) {
    return [
      'Buka aplikasi mobile banking atau ATM terdekat',
      'Pilih menu Transfer ke Bank Lain',
      'Masukkan nomor Virtual Account yang tersedia',
      'Masukkan nominal sesuai total pembayaran',
      'Konfirmasi dan simpan bukti transfer',
    ]
  }

  if (paymentMethod === 'QRIS') {
    return [
      'Buka aplikasi e-wallet (GoPay, OVO, DANA, dll)',
      'Pindai QR code yang ditampilkan',
      'Periksa nominal yang ditagihkan',
      'Konfirmasi pembayaran',
    ]
  }

  if (paymentMethod.startsWith('EMONEY')) {
    return [
      'Klik tombol "Bayar Sekarang"',
      'Anda akan diarahkan ke halaman e-wallet',
      'Selesaikan pembayaran di aplikasi e-wallet',
    ]
  }

  if (paymentMethod === 'CREDIT_CARD') {
    return [
      'Klik tombol "Bayar Sekarang"',
      'Masukkan nomor kartu kredit/debit Anda',
      'Selesaikan verifikasi pembayaran',
    ]
  }

  if (paymentMethod.startsWith('ONLINE_TO_OFFLINE')) {
    return [
      'Klik tombol "Bayar Sekarang"',
      'Anda akan menerima kode pembayaran',
      'Tunjukkan kode di kasir gerai terdekat',
      'Bayar sesuai nominal',
    ]
  }

  if (paymentMethod.startsWith('PEER_TO_PEER')) {
    return [
      'Klik tombol "Bayar Sekarang"',
      'Anda akan diarahkan ke halaman PayLater',
      'Pilih tenor dan selesaikan pengajuan',
    ]
  }

  return [
    'Klik tombol "Bayar Sekarang"',
    'Anda akan diarahkan ke halaman pembayaran',
    'Selesaikan pembayaran sesuai instruksi',
  ]
}

// ─── HELPER: Format expiry countdown ───────────────────────────

export function formatExpiryCountdown(
  expiresAt: string
): { text: string; isUrgent: boolean; percentage: number } {
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const diff = Math.max(0, expiry - now)

  // Assume 2 hours total duration for percentage
  const totalDuration = 2 * 60 * 60 * 1000
  const percentage = Math.max(0, Math.min(100, (diff / totalDuration) * 100))

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  const isUrgent = hours < 1 && minutes < 30

  const text = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { text, isUrgent, percentage }
}

// ─── RE-EXPORT DOKU CONFIG HELPERS ─────────────────────────────

export { DOKU_PM_LABELS, DOKU_PM_GROUPS, DOKU_PAYMENT_METHODS } from './constants'
