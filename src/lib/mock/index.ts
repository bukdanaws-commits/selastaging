// ─── SELEEVENT MOCK SYSTEM — MAIN ENTRY ──────────────────────────────
// When NEXT_PUBLIC_USE_MOCK=true, all API calls are intercepted by the mock layer.
// This is the central integration point.
//
// Usage:
//   1. Set NEXT_PUBLIC_USE_MOCK=true in .env.local
//   2. The apiFetch() in api.ts auto-routes to mock handlers
//   3. Auth auto-logins based on URL path (/admin → SUPER_ADMIN, /counter → COUNTER_STAFF, etc.)

export { useMockStore, onMockStateChange } from './mock-store'
export { handleMockRequest } from './mock-handlers'
export { generateAllMockData } from './mock-data'
export type { MockRequest } from './mock-handlers'

// ─── MOCK MODE CHECK ─────────────────────────────────────────────────────────
// Mock is ON by default. Only OFF when NEXT_PUBLIC_USE_MOCK='false' or
// localStorage sele_use_mock='false'.

export const IS_MOCK_MODE = typeof window !== 'undefined'
  ? !(localStorage.getItem('sele_use_mock') === 'false')
  : process.env.NEXT_PUBLIC_USE_MOCK !== 'false'
