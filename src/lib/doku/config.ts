// ════════════════════════════════════════════════════════════════
// DOKU Payment Gateway — Configuration & Utilities
// ════════════════════════════════════════════════════════════════
// Server-side only! Jangan import di client components.
// Client-safe constants are in ./constants.ts
// ════════════════════════════════════════════════════════════════

import { DOKU_ENDPOINTS, DOKU_PAYMENT_METHODS, DOKU_PM_GROUPS, DOKU_PM_LABELS, DOKU_RESPONSE_CODES } from './constants'

// Re-export constants for backward compatibility (server-side consumers)
export { DOKU_ENDPOINTS, DOKU_PAYMENT_METHODS, DOKU_PM_GROUPS, DOKU_PM_LABELS, DOKU_RESPONSE_CODES } from './constants'

// ─── CONFIGURATION ─────────────────────────────────────────────

export interface DokuConfig {
  clientId: string       // BRN-xxxx — X-CLIENT-KEY / X-PARTNER-ID
  clientSecret: string   // SK-xxxx — HMAC-SHA512 for API request signing
  sharedKey: string      // doku_key_xxx — verify webhook notification signature
  bsn: string            // BSN-xxxx — B2B Secret Number for token request
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
    clientId: process.env.DOKU_CLIENT_ID || process.env.NEXT_PUBLIC_DOKU_CLIENT_ID || 'BRN-0222-1777799032222',
    clientSecret: process.env.DOKU_CLIENT_SECRET || '',  // SK-xxxx, server-side only
    sharedKey: process.env.DOKU_SHARED_KEY || '',         // doku_key_xxx, server-side only
    bsn: process.env.DOKU_BSN || '',                      // BSN-xxxx, server-side only
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

// ─── SIGNATURE UTILITIES ───────────────────────────────────────

/**
 * Generate HMAC-SHA512 signature for DOKU API calls (SNAP)
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
 * Generate RSA signature for B2B Token request (server-side only)
 */
export async function generateDokuRSASignature(clientId: string, timestamp: string): Promise<string> {
  const config = dokuConfig()

  if (!isDokuConfigured()) {
    const message = `${clientId}|${timestamp}`
    const buffer = new TextEncoder().encode(message)
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Production: use real RSA key (server-side only)
  if (typeof window !== 'undefined') {
    throw new Error('RSA signature not available in browser')
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto')
  const keyPath = config.privateKeyPath
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error(`RSA private key not found at ${keyPath}`)
  }
  const privateKeyPem = fs.readFileSync(keyPath, 'utf-8')
  const signer = nodeCrypto.createSign('RSA-SHA256')
  signer.update(`${clientId}|${timestamp}`)
  return signer.sign(privateKeyPem, 'base64')
}

/**
 * Generate X-TIMESTAMP in ISO 8601 format
 */
export function generateDokuTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '+07:00')
}

/**
 * Generate unique X-EXTERNAL-ID
 */
export function generateExternalId(): string {
  return Date.now().toString().slice(-10)
}

// ─── TOKEN MANAGEMENT ──────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get B2B access token (cached, auto-refresh)
 */
export async function getDokuB2BToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  const config = dokuConfig()
  const timestamp = generateDokuTimestamp()
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

    cachedToken = {
      token: data.accessToken,
      expiresAt: Date.now() + (data.expiresIn || 900) * 1000,
    }

    return data.accessToken
  } catch (error) {
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
