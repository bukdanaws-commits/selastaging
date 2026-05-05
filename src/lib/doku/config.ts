// ════════════════════════════════════════════════════════════════
// DOKU Payment Gateway — Configuration & Utilities
// ════════════════════════════════════════════════════════════════
// Server-side only! Jangan import di client components.
//
// Referensi:
//   Docs:    https://docs.doku.com
//   API:     https://developers.doku.com
//   Sandbox: https://sandbox.doku.com
//   Simulator: https://sandbox.doku.com/integration/simulator
// ════════════════════════════════════════════════════════════════

// ─── CONFIGURATION ─────────────────────────────────────────────

export interface DokuConfig {
  clientId: string
  clientSecret: string
  sharedKey: string
  environment: 'sandbox' | 'production'
  apiBaseUrl: string
  checkoutUrl: string
  notificationUrl: string
  finishUrl: string
  errorUrl: string
  unpaymentUrl: string
  privateKeyPath: string
}

function getDokuConfig(): DokuConfig {
  const env = process.env.NEXT_PUBLIC_DOKU_ENVIRONMENT || 'sandbox'
  const isSandbox = env === 'sandbox'

  return {
    clientId: process.env.NEXT_PUBLIC_DOKU_CLIENT_ID || 'BRN-0222-1777799032222',
    clientSecret: process.env.DOKU_CLIENT_SECRET || 'doku_key_3a4d17030ddd4adaa5a398f88c867556',
    sharedKey: process.env.DOKU_SHARED_KEY || 'doku_key_3a4d17030ddd4adaa5a398f88c867556',
    environment: isSandbox ? 'sandbox' : 'production',
    apiBaseUrl: isSandbox
      ? 'https://api-sandbox.doku.com'
      : (process.env.NEXT_PUBLIC_DOKU_API_BASE_URL || 'https://api.doku.com'),
    checkoutUrl: isSandbox
      ? 'https://checkout-sandbox.doku.com'
      : (process.env.NEXT_PUBLIC_DOKU_CHECKOUT_URL || 'https://checkout.doku.com'),
    notificationUrl: process.env.NEXT_PUBLIC_DOKU_NOTIFICATION_URL || '',
    finishUrl: process.env.NEXT_PUBLIC_DOKU_FINISH_URL || '',
    errorUrl: process.env.NEXT_PUBLIC_DOKU_ERROR_URL || '',
    unpaymentUrl: process.env.NEXT_PUBLIC_DOKU_UNPAYMENT_URL || '',
    privateKeyPath: process.env.DOKU_PRIVATE_KEY_PATH || '',
  }
}

// Singleton config
let _config: DokuConfig | null = null
export function dokuConfig(): DokuConfig {
  if (!_config) _config = getDokuConfig()
  return _config
}

// Check if using sandbox (dummy credentials)
export function isDokuSandbox(): boolean {
  return dokuConfig().environment === 'sandbox'
}

// Check if DOKU is properly configured (not dummy)
export function isDokuConfigured(): boolean {
  const config = dokuConfig()
  return (
    config.clientId !== 'MCH-0001-0000000000000' &&
    config.clientId.startsWith('BRN-') &&
    config.clientSecret.length > 20
  )
}

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

// ─── SIGNATURE UTILITIES ───────────────────────────────────────

/**
 * Generate HMAC-SHA512 signature for DOKU API calls (SNAP)
 * Format: HMAC_SHA512(clientSecret, stringToSign)
 * stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" + SHA256(body) + ":" + Timestamp
 */
export async function generateDokuSignature(params: {
  method: string
  endpoint: string
  accessToken: string
  body: string
  timestamp: string
}): Promise<string> {
  const config = dokuConfig()

  // SHA-256 of body
  const bodyBuffer = new TextEncoder().encode(body)
  const bodyHash = await crypto.subtle.digest('SHA-256', bodyBuffer)
  const bodyHex = Array.from(new Uint8Array(bodyHash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // String to sign
  const stringToSign = [
    params.method.toUpperCase(),
    params.endpoint,
    params.accessToken,
    bodyHex.toLowerCase(),
    params.timestamp,
  ].join(':')

  // HMAC-SHA512
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(config.clientSecret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign))
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return signature
}

/**
 * Generate RSA signature for B2B Token request
 * Format: SHA256withRSA(privateKey, client_ID + "|" + timestamp)
 */
export async function generateDokuRSASignature(clientId: string, timestamp: string): Promise<string> {
  // In production, load private key from file
  // For sandbox/mock, return a dummy signature
  const config = dokuConfig()

  if (!isDokuConfigured()) {
    // Sandbox dummy — just hash the input
    const message = `${clientId}|${timestamp}`
    const buffer = new TextEncoder().encode(message)
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Production: use real RSA key (server-side only)
  try {
    if (typeof window !== 'undefined') {
      throw new Error('RSA signature not available in browser')
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto')
    const keyPath = config.privateKeyPath
    if (!keyPath || !fs.existsSync(keyPath)) {
      throw new Error(`RSA private key not found at ${keyPath}`)
    }
    const privateKeyPem = fs.readFileSync(keyPath, 'utf-8')
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(`${clientId}|${timestamp}`)
    return signer.sign(privateKeyPem, 'base64')
  } catch {
    throw new Error('Failed to generate RSA signature. Check DOKU_PRIVATE_KEY_PATH.')
  }
}

/**
 * Generate X-TIMESTAMP in ISO 8601 format
 */
export function generateDokuTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '+07:00')
}

/**
 * Generate unique X-EXTERNAL-ID (request ID per day)
 */
export function generateExternalId(): string {
  return Date.now().toString().slice(-10)
}

// ─── TOKEN MANAGEMENT ──────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get B2B access token (cached, auto-refresh)
 * Token berlaku 900 detik (15 menit)
 */
export async function getDokuB2BToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  const config = dokuConfig()
  const timestamp = generateDokuTimestamp()

  // Generate RSA signature
  const signature = await generateDokuRSASignature(config.clientId, timestamp)

  try {
    const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.B2B_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-CLIENT-KEY': config.clientId,
      },
      body: JSON.stringify({ grantType: 'client_credentials' }),
    })

    const data = await response.json()

    if (data.responseCode !== DOKU_RESPONSE_CODES.SUCCESS) {
      throw new Error(`DOKU B2B Token failed: ${data.responseMessage} (${data.responseCode})`)
    }

    // Cache token
    cachedToken = {
      token: data.accessToken,
      expiresAt: Date.now() + (data.expiresIn || 900) * 1000,
    }

    return data.accessToken
  } catch (error) {
    // If sandbox/not configured, return dummy token
    if (!isDokuConfigured()) {
      const dummyToken = `dummy_b2b_token_${Date.now()}`
      cachedToken = { token: dummyToken, expiresAt: Date.now() + 900000 }
      return dummyToken
    }
    throw error
  }
}

/**
 * Build SNAP headers for API calls
 */
export async function buildDokuHeaders(params: {
  method: string
  endpoint: string
  body: string
  channelId?: string
}): Promise<Record<string, string>> {
  const config = dokuConfig()
  const accessToken = await getDokuB2BToken()
  const timestamp = generateDokuTimestamp()
  const signature = await generateDokuSignature({
    method: params.method,
    endpoint: params.endpoint,
    accessToken,
    body,
    timestamp,
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-TIMESTAMP': timestamp,
    'X-SIGNATURE': signature,
    'X-PARTNER-ID': config.clientId,
    'X-EXTERNAL-ID': generateExternalId(),
    'Authorization': `Bearer ${accessToken}`,
  }

  if (params.channelId) {
    headers['CHANNEL-ID'] = params.channelId
  }

  return headers
}

// ─── AMOUNT HELPER ─────────────────────────────────────────────

export function formatDokuAmount(amount: number): string {
  return amount.toFixed(2)
}

// ─── EXPIRY HELPER ─────────────────────────────────────────────

export function generateDokuExpiry(hours: number = 2): string {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString().replace(/\.\d{3}Z$/, '+07:00')
}
