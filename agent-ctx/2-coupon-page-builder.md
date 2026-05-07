# Task 2: Build CouponPage Component + Route + Nav Config

## Work Record

### Agent: CouponPage Builder
### Task ID: 2

---

## Summary

Built the complete CouponPage admin component with CRUD operations, stats cards, filter tabs, create/edit/delete dialogs, and data table. Also created the route page and updated the nav configuration.

## Files Created

1. **`/home/z/my-project/src/components/admin/CouponPage.tsx`** (~600 lines)
   - Stats Cards: Total Coupons, Active, Expired, Total Usage
   - Filter section: Search + Status dropdown (All/Active/Inactive/Expired) + Scope dropdown (All/Global/Per Event)
   - Coupon Table: Code, Name, Type, Discount, Scope, Usage (with progress bar), Status, Actions
   - Create Coupon Dialog with:
     - Code (auto-uppercase via `onChange`)
     - Name
     - Description
     - Discount Type toggle (Percentage / Nominal)
     - Discount Value
     - Max Discount (only for percentage type, conditionally shown)
     - Scope toggle (Global / Per Event) — if Per Event, shows event selector
     - Category Configs table (add/remove rows: Category, Discount Value, Min Order)
     - Usage Limit (total)
     - Usage Limit Per User (default: 1)
     - Start Date / Expiry Date (datetime-local inputs)
     - Status toggle (Switch)
   - Edit Coupon Dialog — same form, pre-filled from existing coupon
   - Delete Confirmation Dialog — shows coupon details + warning if used
   - Uses `useScopedData()` for role-aware page title (My Coupons vs Coupon Management)
   - Uses shadcn theme variables throughout (bg-card, text-foreground, etc.)
   - Uses `toast` from `sonner` for CRUD notifications
   - Uses `formatRupiah` from `@/lib/utils`
   - 8 mock coupons with varied discount types, scopes, statuses, and category configs

2. **`/home/z/my-project/src/app/(admin)/admin/coupons/page.tsx`**
   - Simple route page rendering `<CouponPage />`

## Files Modified

3. **`/home/z/my-project/src/lib/nav-config.ts`**
   - Added "Coupons" nav item in the "Ticketing" section after "Seat Layout"
   - `title: 'Coupons'`, `href: '/admin/coupons'`, `icon: 'Tag'`, `roles: ['SUPER_ADMIN', 'ORGANIZER']`
   - `titleByRole: { ORGANIZER: 'My Coupons' }`

4. **`/home/z/my-project/src/hooks/use-api.ts`** (resolved conflicts with Task 1)
   - Added `couponApi` import
   - Added `ICoupon` to types import
   - Added `coupons` query keys
   - Added `useCoupons()`, `useCreateCoupon()`, `useUpdateCoupon()`, `useDeleteCoupon()` hooks
   - Task 1 had also added `useValidateCoupon()` — kept both

5. **`/home/z/my-project/src/lib/api.ts`** (resolved conflicts with Task 1)
   - Removed my duplicate `COUPONS` API endpoints (Task 1's version was more complete with VALIDATE)
   - Removed my duplicate `couponApi` declaration (Task 1's version had `validateCoupon`)

## Design Decisions

- **Local mock data**: Since mock handlers don't yet support coupons, CouponPage uses `useState` with mock data for CRUD operations (same pattern as ticket-types and seat-layout pages)
- **Responsive design**: Mobile-first with `grid-cols-2 sm:grid-cols-4` for stats, flexible filter layout, and horizontally scrollable table
- **Usage progress bar**: Visual indicator with color coding (green < 70%, amber 70-99%, red at 100%)
- **Category config inline editing**: Grid-based row editor with add/remove buttons inside the dialog
- **Conditional fields**: Max Discount only shows for percentage type; Event selector only shows for per-event scope
- **Consistent styling**: Follows existing admin page patterns (RefundsPage, TicketTypesPage) with shadcn theme variables

## Verification

- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors in changed files
- Pre-existing errors in other files (mock-handlers, mock-store, doku routes) — not from this task
