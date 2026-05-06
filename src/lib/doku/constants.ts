// ════════════════════════════════════════════════════════════════
// DOKU Payment Gateway — Client-Safe Constants
// ════════════════════════════════════════════════════════════════
// This file ONLY contains constants — safe for both client & server.
// Server-only functions (token, signature, headers) remain in config.ts
// ════════════════════════════════════════════════════════════════

// ─── API ENDPOINTS ─────────────────────────────────────────────

export const DOKU_ENDPOINTS = {
  // Authentication
  B2B_TOKEN: '/authorization/v1/access-token/b2b',
  B2B2C_TOKEN: '/authorization/v1/access-token/b2b2c',

  // Virtual Account (SNAP)
  VA_CREATE: '/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va',
  VA_DELETE: '/virtual-accounts/bi-snap-va/v1.1/transfer-va/delete-va',
  VA_UPDATE: '/virtual-accounts/bi-snap-va/v1.1/transfer-va/update-va',
  VA_DIRECT_INQUIRY: '/virtual-accounts/bi-snap-va/v1.1/transfer-va/direct-inquiry',

  // Check Status
  VA_STATUS: '/orders/v1.0/transfer-va/status',
  DD_STATUS: '/orders/v1.0/direct-debit/status',
  EWALLET_STATUS: '/orders/v1.0/ewallet/status',

  // E-Wallet (Direct Debit / SNAP)
  DD_ACCOUNT_BINDING: '/direct-debit/core/v1/registration-account-binding',
  DD_BALANCE_INQUIRY: '/direct-debit/core/v1/balance-inquiry',
  DD_PAYMENT: '/direct-debit/core/v1/payment',
  DD_REFUND: '/direct-debit/core/v1/refund',
  DD_ACCOUNT_UNBINDING: '/direct-debit/core/v1/account-unbinding',

  // QRIS (SNAP)
  QRIS_GENERATE: '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate',
  QRIS_QUERY: '/snap-adapter/b2b/v1.0/qr/qr-mpm-query',
  QRIS_REFUND: '/snap-adapter/b2b/v1.0/qr/qr-mpm-refund',

  // Credit Card
  CC_PAYMENT_PAGE: '/credit-card/v1/payment-page',
  CC_CAPTURE: '/credit-card/capture',
  CC_REFUND: '/cancellation/credit-card/refund',

  // DOKU Checkout (Hosted Payment Page)
  CHECKOUT_PAYMENT: '/checkout/v1/payment',
} as const

// ─── PAYMENT METHODS ───────────────────────────────────────────

export const DOKU_PAYMENT_METHODS = {
  // Virtual Account
  VA_BCA: 'VIRTUAL_ACCOUNT_BCA',
  VA_MANDIRI: 'VIRTUAL_ACCOUNT_BANK_MANDIRI',
  VA_BSI: 'VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI',
  VA_BRI: 'VIRTUAL_ACCOUNT_BRI',
  VA_BNI: 'VIRTUAL_ACCOUNT_BNI',
  VA_PERMATA: 'VIRTUAL_ACCOUNT_BANK_PERMATA',
  VA_CIMB: 'VIRTUAL_ACCOUNT_BANK_CIMB',
  VA_DANAMON: 'VIRTUAL_ACCOUNT_BANK_DANAMON',
  VA_BTN: 'VIRTUAL_ACCOUNT_BTN',
  VA_BNC: 'VIRTUAL_ACCOUNT_BNC',
  VA_DOKU: 'VIRTUAL_ACCOUNT_DOKU',
  VA_MAYBANK: 'VIRTUAL_ACCOUNT_MAYBANK',

  // E-Wallet
  EWALLET_OVO: 'EMONEY_OVO',
  EWALLET_SHOPEEPAY: 'EMONEY_SHOPEE_PAY',
  EWALLET_DOKU: 'EMONEY_DOKU',
  EWALLET_DANA: 'EMONEY_DANA',
  EWALLET_LINKAJA: 'EMONEY_LINKAJA',

  // Credit Card
  CREDIT_CARD: 'CREDIT_CARD',
  GOOGLE_PAY: 'GOOGLE_PAY',

  // QRIS
  QRIS: 'QRIS',

  // Convenience Store
  ALFA: 'ONLINE_TO_OFFLINE_ALFA',
  INDOMARET: 'ONLINE_TO_OFFLINE_INDOMARET',

  // PayLater
  AKULAKU: 'PEER_TO_PEER_AKULAKU',
  KREDIVO: 'PEER_TO_PEER_KREDIVO',
  INDODANA: 'PEER_TO_PEER_INDODANA',

  // Direct Debit
  DD_BRI: 'DIRECT_DEBIT_BRI',

  // Digital Banking
  JENIUS_PAY: 'JENIUS_PAY',
} as const

// Payment method categories for UI grouping
export const DOKU_PM_GROUPS = {
  virtual_account: {
    label: 'Transfer Virtual Account',
    icon: '🏦',
    methods: [
      DOKU_PAYMENT_METHODS.VA_BCA,
      DOKU_PAYMENT_METHODS.VA_MANDIRI,
      DOKU_PAYMENT_METHODS.VA_BSI,
      DOKU_PAYMENT_METHODS.VA_BRI,
      DOKU_PAYMENT_METHODS.VA_BNI,
      DOKU_PAYMENT_METHODS.VA_PERMATA,
      DOKU_PAYMENT_METHODS.VA_CIMB,
      DOKU_PAYMENT_METHODS.VA_DANAMON,
    ],
  },
  ewallet: {
    label: 'E-Wallet',
    icon: '📱',
    methods: [
      DOKU_PAYMENT_METHODS.EWALLET_OVO,
      DOKU_PAYMENT_METHODS.EWALLET_SHOPEEPAY,
      DOKU_PAYMENT_METHODS.EWALLET_DANA,
      DOKU_PAYMENT_METHODS.EWALLET_LINKAJA,
    ],
  },
  qris: {
    label: 'QRIS',
    icon: '📷',
    methods: [DOKU_PAYMENT_METHODS.QRIS],
  },
  credit_card: {
    label: 'Kartu Kredit / Debit',
    icon: '💳',
    methods: [DOKU_PAYMENT_METHODS.CREDIT_CARD, DOKU_PAYMENT_METHODS.GOOGLE_PAY],
  },
  convenience_store: {
    label: 'Gerai (Alfamart / Indomaret)',
    icon: '🏪',
    methods: [DOKU_PAYMENT_METHODS.ALFA, DOKU_PAYMENT_METHODS.INDOMARET],
  },
  paylater: {
    label: 'PayLater',
    icon: '📆',
    methods: [
      DOKU_PAYMENT_METHODS.AKULAKU,
      DOKU_PAYMENT_METHODS.KREDIVO,
      DOKU_PAYMENT_METHODS.INDODANA,
    ],
  },
} as const

// Human-readable labels for payment methods
export const DOKU_PM_LABELS: Record<string, string> = {
  [DOKU_PAYMENT_METHODS.VA_BCA]: 'BCA Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_MANDIRI]: 'Mandiri Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_BSI]: 'BSI Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_BRI]: 'BRI Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_BNI]: 'BNI Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_PERMATA]: 'Permata Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_CIMB]: 'CIMB Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_DANAMON]: 'Danamon Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_BTN]: 'BTN Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_BNC]: 'BNC Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_DOKU]: 'DOKU Virtual Account',
  [DOKU_PAYMENT_METHODS.VA_MAYBANK]: 'Maybank Virtual Account',
  [DOKU_PAYMENT_METHODS.EWALLET_OVO]: 'OVO',
  [DOKU_PAYMENT_METHODS.EWALLET_SHOPEEPAY]: 'ShopeePay',
  [DOKU_PAYMENT_METHODS.EWALLET_DOKU]: 'DOKU Wallet',
  [DOKU_PAYMENT_METHODS.EWALLET_DANA]: 'DANA',
  [DOKU_PAYMENT_METHODS.EWALLET_LINKAJA]: 'LinkAja',
  [DOKU_PAYMENT_METHODS.CREDIT_CARD]: 'Kartu Kredit / Debit',
  [DOKU_PAYMENT_METHODS.GOOGLE_PAY]: 'Google Pay',
  [DOKU_PAYMENT_METHODS.QRIS]: 'QRIS',
  [DOKU_PAYMENT_METHODS.ALFA]: 'Alfamart / Alfamidi',
  [DOKU_PAYMENT_METHODS.INDOMARET]: 'Indomaret',
  [DOKU_PAYMENT_METHODS.AKULAKU]: 'Akulaku',
  [DOKU_PAYMENT_METHODS.KREDIVO]: 'Kredivo',
  [DOKU_PAYMENT_METHODS.INDODANA]: 'Indodana',
  [DOKU_PAYMENT_METHODS.DD_BRI]: 'BRI Direct Debit',
  [DOKU_PAYMENT_METHODS.JENIUS_PAY]: 'Jenius Pay',
}

// ─── RESPONSE CODES ────────────────────────────────────────────

export const DOKU_RESPONSE_CODES = {
  // Success
  SUCCESS: '2007300',        // B2B Token success
  VA_CREATED: '2002700',     // VA created
  VA_STATUS_SUCCESS: '2002600', // VA status check success
  PAYMENT_SUCCESS: '00',     // Payment successful

  // Pending
  PAYMENT_PENDING: '03',     // Payment pending

  // Errors
  UNAUTHORIZED: '4017300',
  INVALID_PARAM: '4007300',
  NOT_FOUND: '4047300',
  DUPLICATE: '4097300',
  TIMEOUT: '5047300',
  SERVER_ERROR: '5007300',
} as const
