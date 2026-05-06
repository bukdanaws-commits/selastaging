# Task ID: 2b
# Agent: Checkout & Payment Flow Fix Agent
# Task: Ensure the entire checkout flow works end-to-end with correct fee calculation and coupon discount

## Work Log:

### TASK 1: Read and Analyze the Full Checkout Flow
- Read all relevant files in order: page.tsx, checkout-page.tsx, payment-page.tsx, payment-status-page.tsx, eticket-page.tsx, api.ts, page-store.ts, auth-store.ts
- Read mock-handlers.ts, mock-store.ts, types.ts, use-api.ts, and DOKU API routes
- Identified critical issues in the checkout flow

### TASK 2: Fix Payment Page (payment-page.tsx)
- Added fee breakdown display (Subtotal, Biaya Admin 2%, PPN 11%, Diskon) to the order summary card
- Added `subTotal`, `adminFee`, `taxAmount`, `discountAmount` computed values (with fallback calculation from totalAmount when individual fields not available)
- Added `eventCity` variable for better event info display
- The payment page already correctly uses `order.totalAmount` for the payment amount sent to DOKU
- Timer and payment method selection were already working correctly

### TASK 3: Fix Payment Status Page (payment-status-page.tsx)
- Added `useCallback` import (for future use)
- Added `useQueryClient` from @tanstack/react-query
- Added auto-refresh polling: every 3 seconds while order status is 'pending', invalidating both order detail and payment status queries
- Added auto-navigate to e-ticket: when order status becomes 'paid', automatically navigates after 4 seconds (with ref guard to prevent double navigation)
- Added fee breakdown to the order details card: Subtotal, Biaya Admin (2%), PPN (11%), Diskon, Total Bayar
- Added `eventCity` display and `paymentMethod` → `Metode Pembayaran` label improvement
- Used `formatRupiah` and `cn` from utils (removed duplicate import)

### TASK 4: Fix E-Ticket Page (eticket-page.tsx)
- Added `CreditCard` icon import from lucide-react
- Added `eventVenue` variable for complete venue display
- Added fee breakdown card (Rincian Pembayaran) showing: Subtotal, Biaya Admin (2%), PPN (11%), Diskon, Total Bayar
- Improved venue display: shows "Venue, City" format instead of just city
- QR code already uses `activeTicket.qrData` which exists on ITicket type

### TASK 5: Fix API Routes
- Verified `/api/doku/create-payment/route.ts` already looks up order amount from mock store (mock mode) or Go backend (real mode) — no changes needed
- Verified `/api/doku/notification/route.ts` handles both mock and real notifications correctly
- Verified `/api/doku/check-status/route.ts` returns correct status from mock store or real DOKU API
- Health check route (`/api/route.ts`) is simple and correct

### TASK 6: Fix Mock Payment Flow (mock-handlers.ts)
- **Fixed critical bug**: Line 166 `e.slug === slug` where `slug` was undefined — changed to `eventMatch.slug`
- **Added `/api/doku/create-payment` POST handler**: Transforms mock store's `createPayment()` response to match the Next.js API route response shape (transactionId, expiresAt, vaNumber, qrContent, paymentUrl)
- **Added `/api/doku/check-status` GET handler**: Routes to mock store's `getPaymentStatus()` using `params.orderId`
- **Added `/api/doku/notification` POST handler**: Returns 'OK' acknowledgment (matching DOKU webhook expectation)
- Kept legacy `/api/v1/payment/create` and `/api/v1/payment/status/:orderId` handlers for backward compatibility

### TASK 7: Lint Check
- Fixed 1 lint error: Missing `CreditCard` import in eticket-page.tsx
- `bun run lint` passes with zero errors

## Stage Summary:
- **Critical mock flow fix**: Added DOKU endpoint handlers to mock-handlers.ts so the entire checkout flow works in mock mode
- **Bug fix**: Fixed undefined `slug` variable in event matching (would have caused event lookup to fail)
- **Fee breakdown**: All 3 pages (payment, payment-status, e-ticket) now show complete fee breakdown (Subtotal + 2% Admin + 11% PPN - Discount = Total)
- **Auto-refresh**: Payment status page polls every 3 seconds while pending and auto-navigates to e-ticket 4 seconds after payment confirmed
- **Backward compatibility**: Legacy payment endpoints preserved alongside new DOKU endpoints
- **Calculation**: Total = SubTotal + AdminFee(2%) + PPN(11%) - DiscountAmount, total never < 0, uses Math.round()
- Lint clean, dev server running without errors
