# Task 2c+2d - Backend Setup & Connection Agent

## Task
Set up Go Fiber backend as mini-service, configure FE↔BE connection, fix API routing, fix DOKU payment/notification routes

## Work Completed

### Files Modified
1. `/home/z/my-project/.env` - Full env configuration with DB, API, DOKU, OAuth, App variables
2. `/home/z/my-project/start-backend.sh` - Backend startup script (Go check → run or mock mode message)
3. `/home/z/my-project/src/lib/api.ts` - Fixed URL construction bugs, added 401 handling
4. `/home/z/my-project/src/lib/mock/mock-store.ts` - Fixed order expiry to 30min, Math.round on nominal discount
5. `/home/z/my-project/src/app/api/doku/create-payment/route.ts` - Replaced hardcoded orderAmount with dynamic lookup
6. `/home/z/my-project/src/app/api/doku/notification/route.ts` - Enhanced real notification handler to forward to Go backend
7. `/home/z/my-project/db/` - Created directory for SQLite

### Key Bugs Fixed
- **API URL construction**: Removed broken `getBaseUrl()` causing double `/api` and malformed XTransformPort URLs
- **DOKU payment amount**: Replaced hardcoded `100000` with actual order `totalAmount`
- **Order expiry**: Changed from 2 hours to 30 minutes
- **401 handling**: Added token clearing and redirect on unauthorized responses

### Verification
- `bun run lint` passes with zero errors
- Dev server running on port 3000
