'use server'

import { NextRequest, NextResponse } from 'next/server'

// ─── DOKU Check Payment Status ─────────────────────────────────
// Checks the current status of a DOKU payment transaction.
//
// Query params: ?orderId=xxx&paymentMethod=VA|EWALLET
//
// DOKU has different status endpoints per payment type:
//   - VA: POST /orders/v1.0/transfer-va/status
//   - E-Wallet: POST /orders/v1.0/ewallet/status
//   - Direct Debit: POST /orders/v1.0/direct-debit/status
// ──────────────────────────────────────────────────────────────────────

const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// ─── MOCK HANDLER ──────────────────────────────────────────────

async function handleMockCheckStatus(orderId: string): Promise<{
  orderStatus: string
  paidAt?: string
  dokuTransactionId?: string
  paymentMethod?: string
}> {
  const { useMockStore } = await import('@/lib/mock/mock-store')
  const store = useMockStore.getState()
  const order = store.orders.find(
    (o) => o.id === orderId || o.orderCode === orderId
  )

  if (!order) {
    return { orderStatus: 'not_found' }
  }

  return {
    orderStatus: order.status,
    paidAt: order.paidAt,
    dokuTransactionId: order.dokuTransactionId || order.midtransTransactionId || undefined,
    paymentMethod: order.paymentMethod || order.paymentType || undefined,
  }
}

// ─── REAL DOKU HANDLERS ────────────────────────────────────────

async function checkVAStatus(orderId: string): Promise<{
  orderStatus: string
  paidAt?: string
  dokuTransactionId?: string
  paymentMethod?: string
}> {
  const { dokuConfig, DOKU_ENDPOINTS, generateExternalId } = await import('@/lib/doku')
  const config = dokuConfig()

  const requestBody = {
    partnerServiceId: '  19008',
    customerNo: generateExternalId(),
    virtualAccountNo: `  19008${generateExternalId()}`,
    inquiryRequestId: `INQ-${orderId}-${Date.now()}`,
    paymentDate: '',
    txnDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, '+07:00'),
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.VA_STATUS,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.VA_STATUS}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU VA status check failed: ${data.responseMessage} (${data.responseCode})`)
  }

  // Map DOKU status to order status
  const dokuStatus = data.virtualAccountData?.status || data.virtualAccountData?.paymentFlagReason || 'unknown'
  let orderStatus = 'pending'

  if (dokuStatus === 'Y' || dokuStatus === 'PAID' || dokuStatus === 'SUCCESS') {
    orderStatus = 'paid'
  } else if (dokuStatus === 'EXPIRED') {
    orderStatus = 'expired'
  } else if (dokuStatus === 'FAILED') {
    orderStatus = 'failed'
  }

  return {
    orderStatus,
    paidAt: data.virtualAccountData?.paidTime || undefined,
    dokuTransactionId: data.virtualAccountData?.trxId || orderId,
    paymentMethod: 'Virtual Account',
  }
}

async function checkEwalletStatus(orderId: string): Promise<{
  orderStatus: string
  paidAt?: string
  dokuTransactionId?: string
  paymentMethod?: string
}> {
  const { dokuConfig, DOKU_ENDPOINTS, generateExternalId } = await import('@/lib/doku')
  const config = dokuConfig()

  const requestBody = {
    partnerServiceId: '  19008',
    customerNo: generateExternalId(),
    virtualAccountNo: `  19008${generateExternalId()}`,
    inquiryRequestId: `INQ-${orderId}-${Date.now()}`,
    paymentDate: '',
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.EWALLET_STATUS,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.EWALLET_STATUS}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU E-Wallet status check failed: ${data.responseMessage} (${data.responseCode})`)
  }

  // Map DOKU status
  const dokuStatus = data.transaction?.status || 'unknown'
  let orderStatus = 'pending'

  if (dokuStatus === 'SUCCESS' || dokuStatus === 'PAID') {
    orderStatus = 'paid'
  } else if (dokuStatus === 'EXPIRED') {
    orderStatus = 'expired'
  } else if (dokuStatus === 'FAILED') {
    orderStatus = 'failed'
  }

  return {
    orderStatus,
    paidAt: data.transaction?.date || undefined,
    dokuTransactionId: data.transaction?.id || orderId,
    paymentMethod: 'E-Wallet',
  }
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const paymentMethod = searchParams.get('paymentMethod') || 'VA'

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId query parameter is required' },
        { status: 400 }
      )
    }

    if (useMock) {
      const result = await handleMockCheckStatus(orderId)
      return NextResponse.json({ success: true, data: result })
    }

    // ─── REAL DOKU MODE ───────────────────────────────────────────
    let result: {
      orderStatus: string
      paidAt?: string
      dokuTransactionId?: string
      paymentMethod?: string
    }

    const upperMethod = paymentMethod.toUpperCase()

    if (upperMethod === 'VA' || upperMethod.startsWith('VIRTUAL_ACCOUNT')) {
      result = await checkVAStatus(orderId)
    } else if (upperMethod === 'EWALLET' || upperMethod.startsWith('EMONEY')) {
      result = await checkEwalletStatus(orderId)
    } else {
      // Default to VA status check for unknown methods
      result = await checkVAStatus(orderId)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[DOKU Check Status] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
