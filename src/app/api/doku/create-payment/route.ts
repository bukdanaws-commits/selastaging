'use server'

import { NextRequest, NextResponse } from 'next/server'

// ─── DOKU Create Payment ────────────────────────────────────────
// Creates a payment via DOKU gateway.
//
// Supported paymentMethod values (DokuPaymentType):
//   - DOKU_CHECKOUT: Hosted payment page (redirect)
//   - VA_*: Virtual Account (DGPC — DOKU generates VA number)
//   - QRIS: QRIS payment
//   - CREDIT_CARD: Credit/Debit card
//   - EMONEY_*: E-Wallet (OVO, ShopeePay, DANA, LinkAja)
// ──────────────────────────────────────────────────────────────────────

const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// All DOKU payment method constants
const VA_METHODS = [
  'VIRTUAL_ACCOUNT_BCA',
  'VIRTUAL_ACCOUNT_BANK_MANDIRI',
  'VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI',
  'VIRTUAL_ACCOUNT_BRI',
  'VIRTUAL_ACCOUNT_BNI',
  'VIRTUAL_ACCOUNT_BANK_PERMATA',
  'VIRTUAL_ACCOUNT_BANK_CIMB',
  'VIRTUAL_ACCOUNT_BANK_DANAMON',
  'VIRTUAL_ACCOUNT_BTN',
  'VIRTUAL_ACCOUNT_BNC',
  'VIRTUAL_ACCOUNT_DOKU',
  'VIRTUAL_ACCOUNT_MAYBANK',
] as const

const QRIS_METHOD = 'QRIS' as const
const CC_METHODS = ['CREDIT_CARD', 'GOOGLE_PAY'] as const
const EWALLET_METHODS = ['EMONEY_OVO', 'EMONEY_SHOPEE_PAY', 'EMONEY_DOKU', 'EMONEY_DANA', 'EMONEY_LINKAJA'] as const
const CHECKOUT_METHOD = 'DOKU_CHECKOUT' as const

function isVAMethod(method: string): boolean {
  return (VA_METHODS as readonly string[]).includes(method)
}

function isCCMethod(method: string): boolean {
  return (CC_METHODS as readonly string[]).includes(method)
}

function isEwalletMethod(method: string): boolean {
  return (EWALLET_METHODS as readonly string[]).includes(method)
}

// ─── MOCK HANDLER ──────────────────────────────────────────────

async function handleMockCreatePayment(body: {
  orderId: string
  paymentMethod: string
  channel?: string
}): Promise<{
  paymentUrl?: string
  vaNumber?: string
  qrContent?: string
  transactionId: string
  expiresAt: string
}> {
  const { useMockStore } = await import('@/lib/mock/mock-store')
  const store = useMockStore.getState()
  const order = store.orders.find((o) => o.id === body.orderId)

  if (!order) {
    throw new Error(`Order ${body.orderId} tidak ditemukan`)
  }

  const transactionId = `MOCK-DOKU-TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  // Update order payment info
  const updatedOrders = store.orders.map((o) =>
    o.id === body.orderId
      ? {
          ...o,
          paymentType: 'doku',
          paymentMethod: body.paymentMethod,
          dokuTransactionId: transactionId,
          midtransTransactionId: transactionId, // deprecated, kept for backward compat
          updatedAt: new Date().toISOString(),
        }
      : o
  )
  store.setState({ orders: updatedOrders })

  // Simulate payment success after 2 seconds
  setTimeout(() => {
    const currentState = useMockStore.getState()
    const paidAt = new Date().toISOString()

    const ordersNow = currentState.orders.map((o) =>
      o.id === body.orderId
        ? { ...o, status: 'paid' as const, paidAt, updatedAt: paidAt }
        : o
    )

    const ticketsNow = currentState.tickets.map((t) =>
      t.orderId === body.orderId && t.status === 'pending'
        ? { ...t, status: 'active' as const, updatedAt: paidAt }
        : t
    )

    currentState.setState({ orders: ordersNow, tickets: ticketsNow })
    // notifyStateChange() is called inside setState for each mutation
  }, 2000)

  // Return payment details based on method
  const result: {
    paymentUrl?: string
    vaNumber?: string
    qrContent?: string
    transactionId: string
    expiresAt: string
  } = {
    transactionId,
    expiresAt,
  }

  if (body.paymentMethod === CHECKOUT_METHOD) {
    result.paymentUrl = `https://checkout-sandbox.doku.com/mock/${transactionId}`
  } else if (isVAMethod(body.paymentMethod)) {
    result.vaNumber = `1089${Math.random().toString().slice(2, 16)}`
  } else if (body.paymentMethod === QRIS_METHOD) {
    result.qrContent = `SELEEVENT-QRIS-MOCK-${transactionId.slice(-12)}`
  } else if (isEwalletMethod(body.paymentMethod)) {
    result.paymentUrl = `https://app-sandbox.doku.com/ewallet/${body.paymentMethod}/${transactionId}`
  } else if (isCCMethod(body.paymentMethod)) {
    result.paymentUrl = `https://checkout-sandbox.doku.com/cc/${transactionId}`
  }

  return result
}

// ─── REAL DOKU HANDLERS ────────────────────────────────────────

async function createDokuCheckout(body: {
  orderId: string
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
}): Promise<{ paymentUrl: string; transactionId: string; expiresAt: string }> {
  const { dokuConfig, DOKU_ENDPOINTS } = await import('@/lib/doku')
  const config = dokuConfig()
  const transactionId = `SELE-${body.orderId}-${Date.now()}`

  const requestBody = {
    payment: {
      paymentMethod: 'CHECKOUT',
      paymentDetail: {
        totalAmount: { value: body.amount.toFixed(2), currency: 'IDR' },
      },
      paymentChannel: undefined, // All channels enabled
      order: {
        invoiceNumber: body.orderId,
        lineItems: [
          {
            name: 'SeleEvent Tickets',
            price: body.amount.toFixed(2),
            quantity: 1,
            category: 'Entertainment',
            subCategory: 'Concert',
          },
        ],
      },
    },
    customer: {
      id: `CUST-${Date.now()}`,
      name: body.customerName,
      email: body.customerEmail,
      phone: body.customerPhone,
    },
    social: false,
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.CHECKOUT_PAYMENT,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.CHECKOUT_PAYMENT}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU Checkout failed: ${data.responseMessage} (${data.responseCode})`)
  }

  return {
    paymentUrl: data.response?.payment?.url || data.response?.redirectUrl || '',
    transactionId: data.response?.transactionId || data.response?.payment?.paymentId || transactionId,
    expiresAt: data.response?.expiredDate || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  }
}

async function createDokuVA(body: {
  orderId: string
  amount: number
  paymentMethod: string
  customerName: string
  customerEmail: string
  customerPhone: string
}): Promise<{ vaNumber: string; transactionId: string; expiresAt: string }> {
  const { dokuConfig, DOKU_ENDPOINTS, generateExternalId, formatDokuAmount, generateDokuExpiry } = await import('@/lib/doku')
  const config = dokuConfig()

  const partnerServiceId = '  19008' // 8-digit with left padding
  const customerNo = generateExternalId()
  const virtualAccountNo = `${partnerServiceId}${customerNo}`

  const requestBody = {
    partnerServiceId,
    customerNo,
    virtualAccountNo,
    virtualAccountName: body.customerName.slice(0, 255),
    virtualAccountEmail: body.customerEmail.slice(0, 255),
    virtualAccountPhone: body.customerPhone,
    trxId: body.orderId,
    totalAmount: {
      value: formatDokuAmount(body.amount),
      currency: 'IDR',
    },
    additionalInfo: {
      channel: body.paymentMethod,
      virtualAccountConfig: {
        reusableStatus: false,
      },
    },
    virtualAccountTrxType: 'C', // Closed/Fixed
    expiredDate: generateDokuExpiry(2),
    freeText: [
      { english: 'SeleEvent Ticket Payment', indonesia: 'Pembayaran Tiket SeleEvent' },
    ],
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.VA_CREATE,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.VA_CREATE}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && data.responseCode !== '2002700') {
    throw new Error(`DOKU VA creation failed: ${data.responseMessage} (${data.responseCode})`)
  }

  return {
    vaNumber: (data.virtualAccountData?.virtualAccountNo || virtualAccountNo).replace(/\s/g, ''),
    transactionId: data.virtualAccountData?.trxId || body.orderId,
    expiresAt: data.virtualAccountData?.expiredDate || generateDokuExpiry(2),
  }
}

async function createDokuQRIS(body: {
  orderId: string
  amount: number
}): Promise<{ qrContent: string; transactionId: string; expiresAt: string }> {
  const { dokuConfig, DOKU_ENDPOINTS, formatDokuAmount, generateDokuExpiry } = await import('@/lib/doku')
  const config = dokuConfig()

  const requestBody = {
    partnerReferenceNo: body.orderId,
    merchantId: config.clientId,
    amount: {
      value: formatDokuAmount(body.amount),
      currency: 'IDR',
    },
    validityPeriod: generateDokuExpiry(2),
    storeId: 'SeleEvent-Store',
    terminalId: 'SeleEvent-Terminal-01',
  }

  const bodyStr = JSON.stringify(requestBody)
  const { buildDokuHeaders } = await import('@/lib/doku')
  const headers = await buildDokuHeaders({
    method: 'POST',
    endpoint: DOKU_ENDPOINTS.QRIS_GENERATE,
    body: bodyStr,
    channelId: 'H2H',
  })

  const response = await fetch(`${config.apiBaseUrl}${DOKU_ENDPOINTS.QRIS_GENERATE}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  const data = await response.json()

  if (data.responseCode && !data.responseCode.startsWith('20')) {
    throw new Error(`DOKU QRIS failed: ${data.responseMessage} (${data.responseCode})`)
  }

  return {
    qrContent: data.qrString || '',
    transactionId: data.partnerReferenceNo || body.orderId,
    expiresAt: data.validityPeriod || generateDokuExpiry(2),
  }
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, paymentMethod, channel } = body as {
      orderId: string
      paymentMethod: string
      channel?: string
    }

    if (!orderId || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'orderId and paymentMethod are required' },
        { status: 400 }
      )
    }

    if (useMock) {
      const result = await handleMockCreatePayment({ orderId, paymentMethod, channel })
      return NextResponse.json({ success: true, data: result })
    }

    // ─── REAL DOKU MODE ───────────────────────────────────────────
    // Fetch order details from mock store or backend to get amount & customer info
    let orderAmount = 0
    let customerName = 'SeleEvent Customer'
    let customerEmail = 'customer@seleevent.com'
    let customerPhone = '6281234567890'

    // Try to get order from mock store first (server-side)
    const mockMode = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'
    if (mockMode) {
      try {
        const { useMockStore } = await import('@/lib/mock/mock-store')
        const store = useMockStore.getState()
        const order = store.orders.find((o) => o.id === orderId)
        if (order) {
          orderAmount = order.totalAmount
        } else {
          return NextResponse.json(
            { success: false, error: `Order ${orderId} not found` },
            { status: 404 }
          )
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Failed to load order data' },
          { status: 500 }
        )
      }
    } else {
      // In real mode, fetch order from Go backend via Caddy gateway
      try {
        const goPort = process.env.NEXT_PUBLIC_GO_PORT || '8080'
        const orderResponse = await fetch(`/api/v1/orders/${orderId}?XTransformPort=${goPort}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        const orderData = await orderResponse.json()
        if (orderData.success && orderData.data) {
          orderAmount = orderData.data.totalAmount
          customerName = orderData.data.user?.name || customerName
          customerEmail = orderData.data.user?.email || customerEmail
          customerPhone = orderData.data.user?.phone || customerPhone
        } else {
          return NextResponse.json(
            { success: false, error: `Order ${orderId} not found in backend` },
            { status: 404 }
          )
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch order from backend' },
          { status: 500 }
        )
      }
    }

    if (!orderAmount || orderAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid order amount' },
        { status: 400 }
      )
    }

    let result: {
      paymentUrl?: string
      vaNumber?: string
      qrContent?: string
      transactionId: string
      expiresAt: string
    }

    if (paymentMethod === CHECKOUT_METHOD) {
      const dokuResult = await createDokuCheckout({
        orderId,
        amount: orderAmount,
        customerName,
        customerEmail,
        customerPhone,
      })
      result = { paymentUrl: dokuResult.paymentUrl, transactionId: dokuResult.transactionId, expiresAt: dokuResult.expiresAt }
    } else if (isVAMethod(paymentMethod)) {
      const dokuResult = await createDokuVA({
        orderId,
        amount: orderAmount,
        paymentMethod,
        customerName,
        customerEmail,
        customerPhone,
      })
      result = { vaNumber: dokuResult.vaNumber, transactionId: dokuResult.transactionId, expiresAt: dokuResult.expiresAt }
    } else if (paymentMethod === QRIS_METHOD) {
      const dokuResult = await createDokuQRIS({ orderId, amount: orderAmount })
      result = { qrContent: dokuResult.qrContent, transactionId: dokuResult.transactionId, expiresAt: dokuResult.expiresAt }
    } else {
      // For e-wallet, CC, etc. — use DOKU Checkout as fallback
      const dokuResult = await createDokuCheckout({
        orderId,
        amount: orderAmount,
        customerName,
        customerEmail,
        customerPhone,
      })
      result = { paymentUrl: dokuResult.paymentUrl, transactionId: dokuResult.transactionId, expiresAt: dokuResult.expiresAt }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[DOKU Create Payment] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    )
  }
}
