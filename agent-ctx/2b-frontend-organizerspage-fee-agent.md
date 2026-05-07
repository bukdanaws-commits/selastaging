# Task 2b: Frontend OrganizersPage Fee Approval Workflow

## Summary
Updated OrganizersPage to show fee management and approval workflow.

## Files Modified
1. `src/lib/api.ts` — Added ORGANIZER_FEE_APPROVE route, getOrganizerFee(), setOrganizerFee(isApproved?), approveOrganizerFee()
2. `src/hooks/use-api.ts` — Added useApproveOrganizerFee(), updated useSetOrganizerFee() with isApproved param
3. `src/lib/mock/mock-store.ts` — Added approveOrganizerFee(), updated setOrganizerFee() with isApproved param
4. `src/lib/mock/mock-handlers.ts` — Added GET fee, PATCH fee/approve handlers; updated PATCH fee to return feeConfig
5. `src/components/admin/OrganizersPage.tsx` — Complete fee management UI with badges, dialogs, approve/reject buttons

## Key Features
- Fee column badges: green ✓ (approved), yellow ⏳ (pending), gray (not set)
- Set Fee dialog with percent input, approve immediately toggle, current fee info
- Approve/Reject buttons for pending fees
- Fee filter dropdown
- Pending Fee Approval stat card
- Full mock support for fee CRUD and approval endpoints
