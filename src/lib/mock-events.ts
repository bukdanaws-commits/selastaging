// ─── SHARED MOCK EVENTS LIST ────────────────────────────────────────────────
// Used by AdminLayout (event selector) and useCurrentEventSlug hook.
// In production, this would be replaced by an API call.

export interface MockEvent {
  id: string
  name: string
  slug: string
}

export const MOCK_EVENTS: MockEvent[] = [
  { id: 'evt-sheila-on7-jakarta-001', name: 'Sheila On 7 — Jakarta', slug: 'sheila-on-7-melompat-lebih-tinggi' },
  { id: 'evt-sheila-on7-bandung-001', name: 'Sheila On 7 — Bandung', slug: 'sheila-on-7-bandung-2026' },
  { id: 'evt-sheila-on7-surabaya-001', name: 'Sheila On 7 — Surabaya', slug: 'sheila-on-7-surabaya-2026' },
]

/** Default fallback slug when no event is selected */
export const DEFAULT_EVENT_SLUG = 'sheila-on-7-melompat-lebih-tinggi'
