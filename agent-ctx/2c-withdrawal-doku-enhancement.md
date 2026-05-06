# Task 2c - Withdrawal DOKU Enhancement Agent

## Summary
Enhanced the SUPER_ADMIN WithdrawalsPage component with Hybrid Method (AUTO_DOKU / MANUAL) and created DOKU Disbursement API route.

## Files Modified

1. **`/home/z/my-project/src/components/admin/WithdrawalsPage.tsx`** — Complete rewrite with:
   - Updated `WithdrawalItem` interface (added method, dokuDisbursementId, dokuReferenceNo, dokuStatus, processing status)
   - New `ApproveMethodDialog` sub-component (method selection dialog with AUTO_DOKU and MANUAL options)
   - New `CheckDokuStatusButton` sub-component (for processing AUTO_DOKU withdrawals)
   - New `ProcessingInfo` sub-component (shows DOKU reference info)
   - New `getMethodBadge()` helper (⚡ Auto (DOKU) / 🏦 Manual)
   - Updated `getWdStatusBadge()` (added 'processing' with spinner)
   - Added 'processing' to status filter
   - Added "Method" column to table
   - Updated `handleApprove` to accept method parameter
   - Updated stats (added DOKU Processing count)

2. **`/home/z/my-project/src/app/api/v1/admin/withdrawals/disburse/route.ts`** — New file:
   - POST handler for DOKU Disbursement API
   - Mock mode: simulates DOKU response with disbursementId, referenceNo
   - Production mode: 501 placeholder

3. **`/home/z/my-project/src/lib/api.ts`** — Added:
   - `WITHDRAWAL_CHECK_DOKU` endpoint constant
   - `adminApi.checkDokuStatus()` method

4. **`/home/z/my-project/src/hooks/use-api.ts`** — Added:
   - `useCheckDokuStatus()` mutation hook

5. **`/home/z/my-project/src/lib/mock/mock-handlers.ts`** — Added:
   - POST /api/v1/admin/withdrawals/:id/check-doku handler

6. **`/home/z/my-project/src/lib/mock/mock-store.ts`** — Added:
   - `checkDokuStatus()` mutation action (processing → transferred)
   - Interface declaration for checkDokuStatus

## Flow
- **AUTO_DOKU**: pending → approve (select AUTO_DOKU) → processing → check DOKU status → transferred
- **MANUAL**: pending → approve (select MANUAL) → approved → upload proof → transferred

## Lint
- ESLint passes clean (0 errors, 0 warnings)
