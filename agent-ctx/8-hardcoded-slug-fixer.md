# Task 8: Hardcoded Event Slug Fix — Agent Work Record

## Summary
Replaced all 8 hardcoded `sheila-on-7-melompat-lebih-tinggi` slug usages in API calls with a dynamic `useCurrentEventSlug()` hook that reads from the auth store's `selectedEventId`.

## New Files Created
1. **`src/lib/mock-events.ts`** — Shared MOCK_EVENTS array + DEFAULT_EVENT_SLUG constant
2. **`src/hooks/use-current-event.ts`** — `useCurrentEventSlug()` hook

## Files Modified
1. **`src/components/organizer/OrganizerLiveMonitor.tsx`** — 3 slug replacements
2. **`src/components/organizer/RedeemHistoryPage.tsx`** — 1 slug replacement
3. **`src/components/organizer/RedeemPage.tsx`** — 2 slug replacements
4. **`src/app/(admin)/admin/organizer-dashboard/page.tsx`** — 1 slug replacement
5. **`src/app/(admin)/admin/my-event/page.tsx`** — Dynamic event lookup via auth store
6. **`src/components/admin/AdminLayout.tsx`** — Import MOCK_EVENTS from shared module

## Files Intentionally NOT Changed
- `src/lib/mock/mock-data.ts` — Data definitions, not API call arguments
- `src/lib/mock-events.ts` — Contains slug values by design (shared constants)

## Lint Result
`bun run lint` — 0 errors, 0 warnings
