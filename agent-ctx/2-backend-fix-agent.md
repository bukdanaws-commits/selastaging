# Task 2 - Backend Fix Agent Work Record

## Task: Fix critical backend bugs and add missing models/routes/config for DOKU migration

## Changes Made:

### 1. `internal/database/database.go`
- Fixed import: `internal/model` → `internal/models` (plural)
- Replaced hardcoded 5-model migration list with `models.AllModels()` (27 models)
- Removed non-existent `model.Payment{}` reference

### 2. `internal/models/models.go`
- Added `OrganizerID *string` to User model
- Added `PaymentChannel *string` and `DokuTransactionID *string` to Order model
- Kept `MidtransTransactionID` as deprecated field
- Added 6 new models matching FE TypeScript interfaces:
  - Coupon (matches ICoupon)
  - CouponUsage (matches ICouponUsage)
  - OrganizerBankAccount (matches IOrganizerBankAccount)
  - WithdrawalRequest (matches IWithdrawalRequest)
  - PaymentLog (matches IPaymentLog)
  - OrganizerFeeConfig (matches IOrganizerFeeConfig)
- Added Organizer model (used by handlers)
- Added Refund model
- Updated AllModels() to include all 27 models

### 3. `internal/config/config.go`
- Added DokuConfig struct with DOKU-specific fields
- Added DOKU env var bindings (DOKU_CLIENT_ID, DOKU_CLIENT_SECRET, DOKU_SHARED_KEY, DOKU_PRIVATE_KEY, DOKU_IS_SANDBOX)
- Added Cloud Run secret paths for DOKU credentials
- Kept MidtransConfig as deprecated for migration compatibility

### 4. `cmd/server/main.go`
- Added `config.Load()` call
- Initialized SSEHub with `services.NewSSEHub()` and set global `services.Hub`
- Passed `database.DB` and `hub` to `routes.Setup(app, db, hub)`
- Fixed import from `internal/route` to `internal/routes`

### 5. `internal/routes/routes.go`
- Added organizer routes: finance, balance, bank-accounts CRUD, withdrawals, payment-logs, refunds, events CRUD, ticket-types CRUD, orders
- Added admin routes: organizers (approve/reject), withdrawals (approve/reject/proof/check-doku), payment-logs, refunds (approve/reject)
- Added coupon routes (CRUD + public validate)
- Added DOKU payment routes (create, notification, status)
- Fixed handler function name references

### 6. Handler files
- Rewrote organizer_extended_handler.go with new model names
- Rewrote admin_extended_handler.go with new model names
- Created stub_handler.go for placeholder routes

## Verification
- `go build ./cmd/server/` compiles cleanly with zero errors
