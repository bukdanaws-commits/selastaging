'use server'

import { NextRequest, NextResponse } from 'next/server'

// ─── DOKU Refund Payment ───────────────────────────────────────
// Processes a refund for a DOKU payment transaction.
//
// Body: { orderId, reason, amount?, paymentMethod? }
//
// Refund support varies by payment method:
//   - VA: Not directly supported (use VA reversal/delete)
//   - QRIS: POST /snap-adapter/b2b/v1.0/qr/qr-mpm-refund
//   - Credit Card: POST /cancellation/credit-card/refund
//   - E-Wallet: POST /direct-debit/core/v1/refund
//   - DOKU Checkout: Handled via individual PM refund
// ──────────────────────────────────────────────────────────────────────

const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// ─── MOCK HANDLER ──────────────────────────────────────────────

async function handleMockRefund(body: {
  orderId: string
  reason: string
  amount?: number
}): Promise<{
  refundId: string
  status: string
  amount: number
  processedAt: string
}> {
  const { useMockStore } = await import('@/lib/mock/mock-store')
  const store = useMockStore.getState()
  const order = store.orders.find(
    (o) => o.id === body.orderId || o.orderCode === body.orderId
  )

  if (!order) {
    throw new Error(`Order ${body.orderId} tidak ditemukan`)
  }

  if (order.status !== 'paid') {
    throw new Error(`Order ${body.orderId} status is "${order.status}", only paid orders can be refunded`)
  }

  const refundId = `REF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const refundAmount = body.amount || order.totalAmount
  const processedAt = new Date().toISOString()

  // Update order to refunded
  const updatedOrders = store.orders.map((o) =>
    o.id === order.id
      ? {
          ...o,
          status: 'refunded' as const,
          updatedAt: processedAt,
        }
      : o
  )

  // Deactivate all active/redeemed tickets for this order
  const updatedTickets = store.tickets.map((t) =>
    t.orderId === order.id && (t.status === 'active' || t.status === 'redeemed' || t.status === 'inside')
      ? { ...t, status: 'cancelled' as const, updatedAt: processedAt }
      : t
  )

  store.setState({ orders: updatedOrders, tickets: updatedTickets })

  return {
    refundId,
    status: 'SUCCESS',
    amount: refundAmount,
    processedAt,
  }
}

// ─── REAL DOKU HANDLERS ────────────────────────────────────────

async function refundQRIS(body: {
  orderId: string
  amount: number
  reason: string
}): Promise<{
  refundId: string
  status: string
  amount: number
  processedAt: string
}> {
  const { dokuConfig, DOKU_ENDPOINTS, formatDokuAmount } = await import('@/lib/doku')
  const config = dokuConfig()

  const requestBody = {
    partnerReferenceNo: body.orderId,
    originalPartnerReferenceNo: body.orderId,
    originalReferenceNo: body.orderId,
    refundAmount: {
      value: formatDokuAmount(body.amount),
      currency: 'IDR',
    },
    reason: body.reason.slice(0, 255),
    additionalInfo: {
      refundId: `REF-${Date.now()}`,
    },
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.QRIS_REFUND,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.QRIS_REFUND}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU QRIS refund failed: ${data.responseMessage} (${data.responseCode})`)
  }

  return {
    refundId: data.refundId || `REF-QRIS-${Date.now()}`,
    status: 'SUCCESS',
    amount: body.amount,
    processedAt: new Date().toISOString(),
  }
}

async function refundCreditCard(body: {
  orderId: string
  amount: number
  reason: string
}): Promise<{
  refundId: string
  status: string
  amount: number
  processedAt: string
}> {
  const { dokuConfig, DOKU_ENDPOINTS, formatDokuAmount } = await import('@/lib/doku')
  const config = dokuConfig()

  const requestBody = {
    clientId: config.clientId,
    requestId: `REQ-${Date.now()}`,
    invoiceNumber: body.orderId,
    refundAmount: {
      value: formatDokuAmount(body.amount),
      currency: 'IDR',
    },
    refundReason: body.reason.slice(0, 255),
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.CC_REFUND,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.CC_REFUND}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU CC refund failed: ${data.responseMessage} (${data.responseCode})`)
  }

  return {
    refundId: data.refundId || `REF-CC-${Date.now()}`,
    status: 'SUCCESS',
    amount: body.amount,
    processedAt: new Date().toISOString(),
  }
}

async function reverseVA(body: {
  orderId: string
  reason: string
}): Promise<{
  refundId: string
  status: string
  amount: number
  processedAt: string
}> {
  const { dokuConfig, DOKU_ENDPOINTS, generateExternalId } = await import('@/lib/doku')
  const config = dokuConfig()

  // VA reversal uses delete-va endpoint
  const requestBody = {
    partnerServiceId: '  19008',
    customerNo: generateExternalId(),
    virtualAccountNo: `  19008${generateExternalId()}`,
    trxId: body.orderId,
    reversalReason: body.reason.slice(0, 255),
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.VA_DELETE,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.VA_DELETE}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU VA reversal failed: ${data.responseMessage} (${data.responseCode})`)
  }

  return {
    refundId: `REV-VA-${Date.now()}`,
    status: 'SUCCESS',
    amount: 0, // VA reversal doesn't have a refund amount per se
    processedAt: new Date().toISOString(),
  }
}

async function refundEwallet(body: {
  orderId: string
  amount: number
  reason: string
}): Promise<{
  refundId: string
  status: string
  amount: number
  processedAt: string
}> {
  const { dokuConfig, DOKU_ENDPOINTS, formatDokuAmount } = await import('@/lib/doku')
  const config = dokuConfig()

  const requestBody = {
    partnerServiceId: '  19008',
    partnerReferenceNo: body.orderId,
    refundAmount: {
      value: formatDokuAmount(body.amount),
      currency: 'IDR',
    },
    refundReason: body.reason.slice(0, 255),
    additionalInfo: {
      refundId: `REF-EW-${Date.now()}`,
    },
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.DD_REFUND,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.DD_REFUND}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU E-Wallet refund failed: ${data.responseMessage} (${data.responseCode})`)
  }

  return {
    refundId: data.refundId || `REF-EW-${Date.now()}`,
    status: 'SUCCESS',
    amount: body.amount,
    processedAt: new Date().toISOString(),
  }
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, reason, amount, paymentMethod } = body as {
      orderId: string
      reason: string
      amount?: number
      paymentMethod?: string
    }

    if (!orderId || !reason) {
      return NextResponse.json(
        { success: false, error: 'orderId and reason are required' },
        { status: 400 }
      )
    }

    if (useMock) {
      const result = await handleMockRefund({ orderId, reason, amount })
      return NextResponse.json({ success: true, data: result })
    }

    // ─── REAL DOKU MODE ───────────────────────────────────────────
    // In production, fetch order details from backend
    const orderAmount = amount || 100000 // Fallback — should fetch from order
    const resolvedMethod = paymentMethod || 'VA'

    let result: {
      refundId: string
      status: string
      amount: number
      processedAt: string
    }

    const upperMethod = resolvedMethod.toUpperCase()

    if (upperMethod === 'QRIS') {
      result = await refundQRIS({ orderId, amount: orderAmount, reason })
    } else if (upperMethod === 'CREDIT_CARD' || upperMethod === 'GOOGLE_PAY') {
      result = await refundCreditCard({ orderId, amount: orderAmount, reason })
    } else if (upperMethod.startsWith('VIRTUAL_ACCOUNT') || upperMethod === 'VA') {
      result = await reverseVA({ orderId, reason })
    } else if (upperMethod.startsWith('EMONEY') || upperMethod === 'EWALLET') {
      result = await refundEwallet({ orderId, amount: orderAmount, reason })
    } else {
      throw new Error(`Refund not supported for payment method: ${resolvedMethod}`)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[DOKU Refund] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process refund' },
      { status: 500 }
    )
  }
}
