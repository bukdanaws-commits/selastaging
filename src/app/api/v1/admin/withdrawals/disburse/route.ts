import { NextRequest, NextResponse } from 'next/server'

// POST /api/v1/admin/withdrawals/disburse
// Called by SUPER_ADMIN when approving with AUTO_DOKU method
// In production, this calls DOKU Disbursement API
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { withdrawalId, amount, bankCode, bankAccountNumber, bankAccountName } = body

  // Validate required fields
  if (!withdrawalId || !amount || !bankCode || !bankAccountNumber || !bankAccountName) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: withdrawalId, amount, bankCode, bankAccountNumber, bankAccountName' },
      { status: 400 }
    )
  }

  // In mock mode, simulate DOKU API response
  // Standard: mock is ON by default, only OFF when explicitly 'false'
  if (process.env.NEXT_PUBLIC_USE_MOCK !== 'false') {
    // Simulate a small delay for realism
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: {
        disbursementId: `DOKU-DISB-${Date.now()}`,
        referenceNo: `DOKU-REF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        status: 'PROCESSING',
        amount,
        bankCode,
        bankAccountNumber,
        bankAccountName,
        message: 'Disbursement request sent to DOKU',
      }
    })
  }

  // Production: Call DOKU Disbursement API
  // POST https://api.doku.com/disbursement/v1/transfer
  // Headers: B2B token + HMAC-SHA512 signature
  // Body: { disbursementId, amount, bankCode, bankAccountNumber, bankAccountName }
  return NextResponse.json(
    { success: false, error: 'DOKU Disbursement not configured for production' },
    { status: 501 }
  )
}
