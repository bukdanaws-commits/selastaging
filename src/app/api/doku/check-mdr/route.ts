'use server'

import { NextResponse } from 'next/server'

// ─── DOKU MDR (Merchant Discount Rate) Checker ─────────────────
// Returns MDR info for all supported DOKU payment methods.
// Useful for fee calculation and display in admin/organizer dashboards.
//
// MDR rates are the fees charged by DOKU per transaction.
// These are standard rates — actual rates may differ based on merchant agreement.
// ──────────────────────────────────────────────────────────────────────

interface MDRInfo {
  method: string
  label: string
  mdr: string
  minFee?: number
  maxFee?: number
  notes?: string
}

const MDR_RATES: Record<string, MDRInfo> = {
  // Virtual Account — generally lower MDR
  VA: {
    method: 'VIRTUAL_ACCOUNT',
    label: 'Transfer Virtual Account',
    mdr: '0.5%',
    minFee: 1500,
    notes: 'Rate applies to all VA banks (BCA, Mandiri, BRI, BNI, BSI, etc.)',
  },

  // QRIS
  QRIS: {
    method: 'QRIS',
    label: 'QRIS',
    mdr: '0.7%',
    minFee: 1000,
    notes: 'Bank Indonesia regulated max rate is 0.7% (effective Jan 2025)',
  },

  // Credit Card — higher MDR due to card network fees
  CC: {
    method: 'CREDIT_CARD',
    label: 'Kartu Kredit / Debit',
    mdr: '2.5%',
    minFee: 2000,
    notes: 'Visa/Mastercard. AMEX/JCB may have different rates.',
  },

  // E-Wallet — mid-range MDR
  EWALLET: {
    method: 'EMONEY',
    label: 'E-Wallet',
    mdr: '2%',
    minFee: 1000,
    notes: 'Covers OVO, ShopeePay, DANA, LinkAja, DOKU Wallet',
  },

  // O2O (Online to Offline) — Convenience Store
  O2O: {
    method: 'ONLINE_TO_OFFLINE',
    label: 'Gerai (Alfamart / Indomaret)',
    mdr: '1.5%',
    minFee: 2000,
    maxFee: 10000,
    notes: 'Alfamart/Alfamidi and Indomaret convenience store payments',
  },

  // Direct Debit
  DD: {
    method: 'DIRECT_DEBIT',
    label: 'Direct Debit',
    mdr: '1%',
    minFee: 1500,
    notes: 'BRI, CIMB, Allobank, Mandiri Direct Debit',
  },

  // PayLater
  PAYLATER: {
    method: 'PEER_TO_PEER',
    label: 'PayLater',
    mdr: '3%',
    minFee: 3000,
    notes: 'Akulaku, Kredivo, Indodana, SPayLater, Atome',
  },

  // Google Pay
  GOOGLE_PAY: {
    method: 'GOOGLE_PAY',
    label: 'Google Pay',
    mdr: '2.2%',
    minFee: 2000,
    notes: 'Via DOKU tokenized card payment',
  },
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

export async function GET() {
  try {
    // Group by category for easy UI consumption
    const grouped: Record<string, Record<string, MDRInfo>> = {
      'Virtual Account': {},
      'QRIS': {},
      'Kartu Kredit / Debit': {},
      'E-Wallet': {},
      'Gerai': {},
      'Direct Debit': {},
      'PayLater': {},
      'Lainnya': {},
    }

    for (const [key, info] of Object.entries(MDR_RATES)) {
      if (key.startsWith('VA') || info.method === 'VIRTUAL_ACCOUNT') {
        grouped['Virtual Account'][key] = info
      } else if (key === 'QRIS') {
        grouped['QRIS'][key] = info
      } else if (key === 'CC') {
        grouped['Kartu Kredit / Debit'][key] = info
      } else if (key === 'EWALLET') {
        grouped['E-Wallet'][key] = info
      } else if (key === 'O2O') {
        grouped['Gerai'][key] = info
      } else if (key === 'DD') {
        grouped['Direct Debit'][key] = info
      } else if (key === 'PAYLATER') {
        grouped['PayLater'][key] = info
      } else {
        grouped['Lainnya'][key] = info
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        // Simple flat map for quick lookups
        rates: MDR_RATES,
        // Grouped for UI display
        grouped,
        // Quick summary
        summary: {
          VA: '0.5%',
          QRIS: '0.7%',
          CC: '2.5%',
          EWALLET: '2%',
          O2O: '1.5%',
          DD: '1%',
          PAYLATER: '3%',
          GOOGLE_PAY: '2.2%',
        },
        // Disclaimer
        disclaimer:
          'MDR rates shown are standard indicative rates. Actual rates may vary based on your merchant agreement with DOKU. Contact your DOKU account manager for confirmed rates.',
        lastUpdated: '2025-01-01',
      },
    })
  } catch (error) {
    console.error('[DOKU Check MDR] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MDR information' },
      { status: 500 }
    )
  }
}
