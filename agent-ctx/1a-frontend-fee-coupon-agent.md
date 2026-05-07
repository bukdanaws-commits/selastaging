# Task 1a — Frontend Fee & Coupon Agent

## Task
Update SeleEvent frontend to implement:
1. Platform fee 2% (changed from 5%)
2. PPN 11% (new tax)
3. Coupon input in checkout Step 3
4. Updated order calculation with fee + PPN + discount

## Work Log

### 1. Updated `src/lib/types.ts`
- Added `subTotal?: number`, `adminFee?: number`, `taxAmount?: number`, `discountAmount?: number`, `couponId?: string` to `IOrder` interface
- Added `couponCode?: string`, `subTotal?: number`, `adminFee?: number`, `taxAmount?: number`, `discountAmount?: number` to `ICreateOrderRequest`
- Added `CouponValidationResult` type with `valid`, `discountAmount`, `message?`, `coupon?` fields

### 2. Updated `src/app/page.tsx`
- Changed all 9 instances of `platformFee: 5` to `platformFee: 2` in FALLBACK_TICKET_TYPES
- Fee display in ticket cards will now show "2%" instead of "5%"

### 3. Updated `src/lib/mock/mock-data.ts`
- Changed all 9 instances of `platformFee: 5` to `platformFee: 2` in TICKET_TYPE_DEFS

### 4. Updated `src/lib/mock/mock-store.ts`
- Rewrote `createOrder` function to:
  - Calculate `adminFee` as `Math.round(subTotal * 0.02)` (2% platform fee)
  - Calculate `taxAmount` as `Math.round(subTotal * 0.11)` (11% PPN)
  - Calculate `discountAmount` from coupon if `data.couponCode` provided
  - Use provided fee values from request if available (fallback to calculated)
  - Compute `totalAmount = max(0, subTotal + adminFee + taxAmount - discountAmount)`
  - Store `subTotal`, `adminFee`, `taxAmount`, `discountAmount`, `couponId` on mock order
  - Record coupon usage (ICouponUsage) and increment coupon.usedCount when coupon applied

### 5. Updated `src/lib/api.ts`
- Added `CouponValidationResult` import from types
- Updated `couponApi.validateCoupon` signature: removed `orderId`, kept `code`, `subtotal`, `category?`
- Updated return type to `CouponValidationResult`

### 6. Updated `src/lib/mock/mock-handlers.ts`
- Rewrote `/api/v1/coupons/validate` handler to calculate discount directly instead of delegating to `applyCoupon`
- Performs full validation (status, dates, usage limits, per-user limits)
- Returns `{ valid, discountAmount, coupon? }` or `{ valid: false, message }`

### 7. Rewrote `src/components/pages/checkout-page.tsx` (CRITICAL FILE)
- Added fee/tax constants: `PLATFORM_FEE_PERCENT = 2`, `PPN_PERCENT = 11`
- Added coupon state: `couponCode`, `couponResult`, `isValidatingCoupon`, `appliedCouponCode`
- Added derived calculations: `subTotal`, `adminFee`, `taxAmount`, `discountAmount`, `totalAmount`
- Added coupon handlers: `handleApplyCoupon`, `handleRemoveCoupon`
- Added useEffect to reset coupon when subtotal changes
- Step 3 (Konfirmasi & Bayar) now shows:
  - Full order breakdown: Subtotal, Biaya Admin (2%), PPN (11%), Kupon discount (if applied), TOTAL BAYAR
  - Coupon input card with text input + "Terapkan" button
  - Applied coupon display with green checkmark, discount amount, and remove button
  - Error message display for invalid coupons
- `handleCreateOrder` now sends `couponCode`, `subTotal`, `adminFee`, `taxAmount`, `discountAmount` in the request
- Bottom bar shows total with fee+PPN+discount info when on Step 3
- Terms updated to mention fee and PPN

## Summary
- Platform fee: 5% → 2% (page.tsx, mock-data.ts)
- PPN: 0% → 11% (checkout-page.tsx, mock-store.ts)
- Coupon system fully integrated in checkout Step 3
- Calculation: Total = SubTotal + AdminFee(2%) + PPN(11%) - DiscountAmount
- Lint passes with zero errors/warnings
- Dev server compiles and runs successfully
