# Task ID: 1c
# Agent: Backend DOKU Fix & Coupon Integration Agent

## Task Summary
Fix DOKU payment hardcoded amount bug, add discount/coupon fields to Order model, integrate coupon validation into CreateOrder flow, parse categoryConfigs in ValidateCoupon service, and update DOKU notification handler.

## Work Log

### TASK 1: Fix DOKU Payment Amount Bug
- **File:** `backend/internal/handlers/doku_handler.go`
- **Finding:** The `DokuCreatePayment` handler was already fixed by a previous agent (Task 3 - DOKU Payment Service Agent). It already:
  - Parses `orderId` from the request body (line 48-50)
  - Looks up the order using `orderService.GetOrderByID(req.OrderID)` (lines 63-67)
  - Uses `float64(order.TotalAmount)` as the payment amount (line 113)
  - Includes proper error handling if order not found
- **Action:** Verified existing implementation is correct. No changes needed.

### TASK 2: Add Discount Fields to Order Model
- **File:** `backend/internal/models/models.go`
- **Changes:** Added 5 new fields to the `Order` struct:
  - `SubTotal float64` with `gorm:"default:0"` and `json:"subTotal"`
  - `AdminFee float64` with `gorm:"default:0"` and `json:"adminFee"`
  - `TaxAmount float64` with `gorm:"default:0"` and `json:"taxAmount"`
  - `DiscountAmount float64` with `gorm:"default:0"` and `json:"discountAmount"`
  - `CouponID *string` with `gorm:"index"` and `json:"couponId,omitempty"`
- All existing fields preserved intact. GORM auto-migration will add the new columns.

### TASK 3: Integrate Coupon into CreateOrder
- **File:** `backend/internal/handlers/order_handler.go`
  - Added `CouponCode *string` field to `createOrderRequest` struct (`json:"couponCode,omitempty"`)
  - Updated `CreateOrder` handler to pass `couponCode` to `orderService.CreateOrderWithCoupon()`
- **File:** `backend/internal/services/order_service.go`
  - Added `math` import for rounding calculations
  - Kept `CreateOrder()` method as backward-compatible wrapper that delegates to `CreateOrderWithCoupon`
  - Created new `CreateOrderWithCoupon()` method that:
    1. Calculates `subTotal` as `Σ (pricePerTicket × quantity)` for all items
    2. Calculates `adminFee = subTotal × 0.02` (2% platform fee, rounded to 2 decimals)
    3. Calculates `taxAmount = subTotal × 0.11` (11% PPN, rounded to 2 decimals)
    4. If `couponCode` is provided, calls `ValidateCoupon()` and calculates `discountAmount`
    5. If coupon is invalid, returns error with the reason message
    6. Computes `totalAmount = subTotal + adminFee + taxAmount - discountAmount` (clamped to >= 0)
    7. Sets all new fields on the Order before creating
    8. After order creation, calls `ApplyCoupon()` to record coupon usage within the same transaction
    9. Returns the full order with new fields in the response

### TASK 4: Parse CategoryConfigs in ValidateCoupon
- **File:** `backend/internal/services/coupon_service.go`
- **Changes:**
  - Added `encoding/json` import
  - Added `CategoryConfig` struct with `Category`, `DiscountValue`, `MinOrder` fields
  - Updated `ValidateCoupon()` to handle categoryConfigs:
    1. If `coupon.CategoryConfigs` is nil or empty string → coupon applies globally (no change)
    2. If `categoryConfigs` is set, parses it as JSON array of `CategoryConfig`
    3. If `category` parameter is provided and configs exist:
       - Looks up the category in the parsed configs
       - If found, checks `minOrder` requirement (subtotal must be >= minOrder)
       - If found, overrides `discountValue` with category-specific value
       - If category NOT found in configs → coupon is NOT valid for this category
    4. If no category is provided but configs exist → uses default discountValue
  - This allows global coupons (like SAHABATDUTA) to work without category restrictions, while category-specific coupons can override discount values per category.

### TASK 5: Update DOKU Notification Handler
- **File:** `backend/internal/handlers/doku_handler.go`
- **Changes to `DokuNotification` handler:**
  - Added PaymentLog creation after successful payment processing
  - Added SSE broadcast for payment success events
- **New helper function `createDokuPaymentLog()`:**
  - Looks up the order by order code to get eventID and order UUID
  - Creates a `PaymentLog` entry with: eventID, orderID, orderCode, transactionID, paymentMethod="doku", paymentChannel, amount, currency="IDR", status, rawData, and parsed paidAt
  - Logs success/failure
- **New helper function `broadcastPaymentSuccess()`:**
  - Uses the global `services.Hub` to broadcast `payment_success` SSE event
  - Includes: orderCode, transactionId, status, paymentType, amount, paidAt
  - Only broadcasts for "settlement" or "capture" status (successful payment)

## Build Verification
- Installed Go 1.24.4 for build verification
- `go build ./cmd/server/` — **compiles cleanly** ✅
- `go vet ./...` — **zero errors** ✅

## Files Modified
1. `backend/internal/models/models.go` — Added 5 new fields to Order struct
2. `backend/internal/handlers/order_handler.go` — Added couponCode to request, delegated to CreateOrderWithCoupon
3. `backend/internal/services/order_service.go` — Added CreateOrderWithCoupon with fee calculation and coupon integration
4. `backend/internal/services/coupon_service.go` — Added CategoryConfig parsing in ValidateCoupon
5. `backend/internal/handlers/doku_handler.go` — Added PaymentLog creation and SSE broadcast to DokuNotification

## No Breaking Changes
- `CreateOrder()` kept as backward-compatible wrapper
- All existing Order fields preserved
- DOKU notification handler still returns "OK" (200) for DOKU acknowledgement
- PaymentLog creation and SSE broadcast are non-blocking (failures logged but don't affect webhook response)
