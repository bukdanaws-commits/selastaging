# Task 5 - FE Cleanup Agent Work Summary

## Task: FE Cleanup - Remove Dead Prisma, Add BE Switch, Fix Types

### Changes Made

1. **Remove Dead Prisma**
   - Deleted `prisma/schema.prisma` → replaced with placeholder comment
   - Deleted `db/custom.db` (331KB empty SQLite file)
   - Updated `src/lib/db.ts` → clean stub
   - Removed 5 db scripts from `package.json`

2. **Add BE Switch**
   - Added `setMockMode()` and `isMockMode()` to `src/lib/api.ts`
   - Updated `.env` with `NEXT_PUBLIC_USE_MOCK`, `NEXT_PUBLIC_USE_DIRECT_BACKEND`, `NEXT_PUBLIC_GO_PORT`
   - Updated `.env.example` with BACKEND SWITCH section

3. **Fix Type Discrepancies**
   - Added `midtransTransactionId?: string` (deprecated) to `IOrder` in types.ts
   - Replaced hardcoded Google Client ID with env var in auth-store.ts
   - Updated `useCurrentEventSlug` hook with mock mode check

4. **Fix Duplicate Mock Handler**
   - Removed duplicate `/api/v1/organizer/finance` GET handler in mock-handlers.ts

5. **Fix Inconsistent Mock Mode Check**
   - Fixed disburse route: `=== 'true'` → `!== 'false'`

6. **Fix Dead midtransTransactionId References**
   - DOKU notification route: check `dokuTransactionId` first, fall back to `midtransTransactionId`
   - DOKU create-payment route: set both `dokuTransactionId` and `midtransTransactionId`
   - DOKU check-status route: check `dokuTransactionId` first, fall back to `midtransTransactionId`

### Verification
- `bun run lint` passes cleanly (no errors)
- Dev server running without errors
- Mock functionality preserved
