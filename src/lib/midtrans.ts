// ─── MIDTRANS SNAP INTEGRATION ─────────────────────────────
// Handles loading the Midtrans Snap JS SDK and opening payment popups
// Sandbox: https://app.sandbox.midtrans.com/snap/snap.js
// Production: https://app.midtrans.com/snap/snap.js

declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: MidtransCallbackResult) => void
          onPending?: (result: MidtransCallbackResult) => void
          onError?: (result: MidtransCallbackResult) => void
          onClose?: () => void
        }
      ) => void
    }
  }
}

// ─── MIDTRANS CALLBACK RESULT TYPE ─────────────────────────
export interface MidtransCallbackResult {
  status_code: string
  status_message: string
  transaction_id: string
  order_id: string
  gross_amount: string
  payment_type: string
  transaction_status: string
  transaction_time: string
  fraud_status?: string
  bank?: string
  va_number?: string
  permata_va_number?: string
  bill_key?: string
  biller_code?: string
  acquirer?: string
  redirect_url?: string
  pdf_url?: string
  finish_redirect_url?: string
}

// ─── SNAP PAYMENT CALLBACKS ────────────────────────────────
export interface SnapCallbacks {
  onSuccess?: (result: MidtransCallbackResult) => void
  onPending?: (result: MidtransCallbackResult) => void
  onError?: (result: MidtransCallbackResult) => void
  onClose?: () => void
}

// ─── LOAD MIDTRANS SNAP JS FROM CDN ────────────────────────
let snapLoadPromise: Promise<void> | null = null

export function loadMidtransSnap(): Promise<void> {
  if (snapLoadPromise) return snapLoadPromise

  snapLoadPromise = new Promise((resolve, reject) => {
    // Already loaded
    if (typeof window !== 'undefined' && window.snap) {
      resolve()
      return
    }

    const isSandbox = process.env.NEXT_PUBLIC_MIDTRANS_IS_SANDBOX === 'true'
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''

    const script = document.createElement('script')
    script.src = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/snap.js'
      : 'https://app.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)
    script.async = true

    script.onload = () => resolve()
    script.onerror = () => {
      snapLoadPromise = null
      reject(new Error('Failed to load Midtrans Snap JS SDK'))
    }

    document.head.appendChild(script)
  })

  return snapLoadPromise
}

// ─── PAY WITH SNAP ─────────────────────────────────────────
// Opens the Midtrans Snap payment popup with the given snap token
// Handles success, pending, error, and close callbacks

export async function payWithSnap(
  snapToken: string,
  callbacks: SnapCallbacks = {}
): Promise<void> {
  try {
    // Load Snap SDK if not already loaded
    await loadMidtransSnap()

    // Verify snap is available
    if (!window.snap) {
      throw new Error('Midtrans Snap SDK is not available')
    }

    // Open Snap payment popup
    window.snap.pay(snapToken, {
      onSuccess: (result) => {
        console.log('[Midtrans] Payment success:', result.order_id, result.payment_type, result.gross_amount)
        callbacks.onSuccess?.(result)
      },
      onPending: (result) => {
        console.log('[Midtrans] Payment pending:', result.order_id, result.payment_type, result.transaction_status)
        callbacks.onPending?.(result)
      },
      onError: (result) => {
        console.error('[Midtrans] Payment error:', result.order_id, result.status_message)
        callbacks.onError?.(result)
      },
      onClose: () => {
        console.log('[Midtrans] Payment popup closed by user')
        callbacks.onClose?.()
      },
    })
  } catch (error) {
    console.error('[Midtrans] Failed to open Snap popup:', error)
    throw error
  }
}

// ─── HELPER: GET SNAP ENVIRONMENT INFO ─────────────────────

export function isSandboxMode(): boolean {
  return process.env.NEXT_PUBLIC_MIDTRANS_IS_SANDBOX === 'true'
}

export function getMidtransClientKey(): string {
  return process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
}

export function getSnapBaseUrl(): string {
  return isSandboxMode()
    ? 'https://app.sandbox.midtrans.com/snap'
    : 'https://app.midtrans.com/snap'
}
