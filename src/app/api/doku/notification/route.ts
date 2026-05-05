'use server'

import { NextRequest, NextResponse } from 'next/server'

// ─── DOKU Webhook / Payment Notification Handler ─────────────────
// Receives payment notifications from DOKU (both SNAP and Non-SNAP formats).
// DOKU expects HTTP 200 with "OK" body to acknowledge receipt.
//
// SNAP format (Virtual Account, QRIS, Direct Debit):
//   { virtualAccountData: { ... }, transaction: { ... } }
//
// Non-SNAP format (Credit Card, E-Wallet, DOKU Checkout):
//   { order: { ... }, payment: { ... }, customer: { ... } }
// ──────────────────────────────────────────────────────────────────────

const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

interface DokuSnapNotification {
  virtualAccountData?: {
    partnerServiceId?: string
    customerNo?: string
    virtualAccountNo?: string
    trxId?: string
    totalAmount?: { value: string; currency: string }
    virtualAccountTrxType?: string
    paidAmount?: { value: string; currency: string }
    paymentFlagReason?: string
    paidTime?: string
  }
  transaction?: {
    id?: string
    status?: string
    date?: string
  }
  // QRIS specific
  qrStringData?: {
    qrString?: string
    nns?: string
    merchantPan?: string
    amount?: { value: string; currency: string }
    trxDate?: string
    referenceNo?: string
    merchantName?: string
    merchantCity?: string
    merchantId?: string
    terminalId?: string
    acquirer?: string
  }
  // Generic SNAP fields
  responseCode?: string
  responseMessage?: string
  additionalInfo?: Record<string, unknown>
}

interface DokuNonSnapNotification {
  order?: {
    invoiceNumber?: string
    amount?: string
    session?: string
    createdAt?: string
  }
  payment?: {
    paymentCode?: string
    totalAmount?: { value: string; currency: string }
    paymentMethod?: string
    paymentDate?: string
    channel?: string
    status?: string
  }
  acquirer?: {
    bank?: string
    id?: string
  }
  customer?: {
    id?: string
    name?: string
    email?: string
    phone?: string
  }
  transaction?: {
    id?: string
    status?: string
  }
  virtualAccountInfo?: {
    virtualAccountNumber?: string
    howToPayPage?: string
    howToPayApi?: string
    paymentCode?: string
  }
  secureVerification?: string
  webhookDate?: string
}

async function handleMockNotification(body: unknown): Promise<void> {
  const { useMockStore } = await import('@/lib/mock/mock-store')
  const store = useMockStore.getState()
  const notification = body as Record<string, unknown>

  // Extract order reference — try common fields
  const orderId = String(
    (notification as DokuSnapNotification).virtualAccountData?.trxId
    || (notification as DokuNonSnapNotification).order?.invoiceNumber
    || notification.orderId
    || notification.transactionId
    || ''
  )

  // Extract status
  const rawStatus = String(
    (notification as DokuSnapNotification).transaction?.status
    || (notification as DokuNonSnapNotification).transaction?.status
    || (notification as DokuNonSnapNotification).payment?.status
    || notification.status
    || 'unknown'
  ).toLowerCase()

  if (!orderId) {
    console.warn('[DOKU Notification] No orderId found in notification:', JSON.stringify(notification))
    return
  }

  // Find the order in mock store
  const order = store.orders.find(
    (o) => o.id === orderId || o.orderCode === orderId || o.midtransTransactionId === orderId
  )

  if (!order) {
    console.warn(`[DOKU Notification] Order ${orderId} not found in mock store`)
    return
  }

  // Map DOKU status to order status
  let newStatus: 'paid' | 'failed' | 'expired' | 'cancelled' | null = null

  if (rawStatus === 'success' || rawStatus === 'paid' || rawStatus === 'settlement') {
    newStatus = 'paid'
  } else if (rawStatus === 'failed' || rawStatus === 'denied' || rawStatus === 'cancelled') {
    newStatus = 'failed'
  } else if (rawStatus === 'expired') {
    newStatus = 'expired'
  }

  if (!newStatus) {
    console.log(`[DOKU Notification] Unhandled status "${rawStatus}" for order ${orderId}`)
    return
  }

  // If payment is successful, update order and activate tickets
  if (newStatus === 'paid') {
    const paidAt = new Date().toISOString()

    const updatedOrders = store.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: 'paid' as const,
            paidAt,
            paymentMethod: (notification as DokuNonSnapNotification).payment?.paymentMethod || o.paymentMethod || 'DOKU',
            paymentType: 'doku',
            updatedAt: paidAt,
          }
        : o
    )

    const updatedTickets = store.tickets.map((t) =>
      t.orderId === order.id && t.status === 'pending'
        ? { ...t, status: 'active' as const, updatedAt: paidAt }
        : t
    )

    store.setState({ orders: updatedOrders, tickets: updatedTickets })
  } else if (newStatus === 'expired' || newStatus === 'failed') {
    const now = new Date().toISOString()

    const updatedOrders = store.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: newStatus as 'expired' | 'failed',
            updatedAt: now,
          }
        : o
    )

    const updatedTickets = store.tickets.map((t) =>
      t.orderId === order.id && t.status === 'pending'
        ? { ...t, status: newStatus as 'expired' | 'failed', updatedAt: now }
        : t
    )

    store.setState({ orders: updatedOrders, tickets: updatedTickets })
  }
}

async function handleRealNotification(request: NextRequest, body: unknown): Promise<void> {
  const { dokuConfig, generateDokuSignature, generateDokuTimestamp } = await import('@/lib/doku')
  const config = dokuConfig()

  // Verify signature from X-SIGNATURE header
  const xSignature = request.headers.get('x-signature')
  const xTimestamp = request.headers.get('x-timestamp')

  if (!xSignature || !xTimestamp) {
    console.warn('[DOKU Notification] Missing X-SIGNATURE or X-TIMESTAMP headers')
    return
  }

  // Reconstruct signature for verification
  // DOKU uses HMAC-SHA512(sharedKey, clientId + requestId + body)
  // For webhooks, verify using sharedKey
  const bodyStr = JSON.stringify(body)
  const crypto = await import('crypto')
  const verifier = crypto.createHmac('sha512', config.sharedKey)
  verifier.update(config.clientId)
  verifier.update(xTimestamp || '')
  verifier.update(bodyStr)
  const expectedSignature = verifier.digest('hex')

  if (xSignature !== expectedSignature) {
    console.error('[DOKU Notification] Signature verification failed!')
    console.error(`  Expected: ${expectedSignature}`)
    console.error(`  Received: ${xSignature}`)
    // Still return 200 to prevent DOKU from retrying with bad signature
    return
  }

  console.log('[DOKU Notification] Signature verified successfully')

  // Parse notification and extract order info
  const snapBody = body as DokuSnapNotification
  const nonSnapBody = body as DokuNonSnapNotification

  // Extract fields from both formats
  const transactionId = snapBody.virtualAccountData?.trxId
    || nonSnapBody.order?.invoiceNumber
    || ''

  const paymentMethod = nonSnapBody.payment?.paymentMethod
    || nonSnapBody.virtualAccountInfo?.paymentCode
    || snapBody.additionalInfo?.channel as string
    || 'unknown'

  const amountStr = snapBody.virtualAccountData?.totalAmount?.value
    || snapBody.qrStringData?.amount?.value
    || nonSnapBody.order?.amount
    || '0'
  const amount = parseFloat(amountStr)

  const paidTime = snapBody.virtualAccountData?.paidTime
    || nonSnapBody.payment?.paymentDate
    || new Date().toISOString()

  const status = snapBody.transaction?.status
    || nonSnapBody.transaction?.status
    || nonSnapBody.payment?.status
    || 'unknown'

  console.log(`[DOKU Notification] Transaction ${transactionId}: status=${status}, method=${paymentMethod}, amount=${amount}`)

  // In production, this would update the database
  // For now, log the processed notification
  // TODO: integrate with Prisma/database when backend is connected
  console.log('[DOKU Notification] Processed notification:', {
    transactionId,
    paymentMethod,
    amount,
    paidTime,
    status,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log all incoming notifications for debugging
    console.log('[DOKU Notification] Received webhook:', JSON.stringify(body, null, 2))

    if (useMock) {
      await handleMockNotification(body)
    } else {
      await handleRealNotification(request, body)
    }

    // DOKU expects HTTP 200 with "OK" to acknowledge receipt
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    console.error('[DOKU Notification] Error processing webhook:', error)

    // Still return 200 to prevent DOKU from retrying
    // but log the error for investigation
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
