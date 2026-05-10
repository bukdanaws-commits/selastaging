'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useAdminEvents } from '@/hooks/use-api'

/** Default fallback slug when no event is selected */
const DEFAULT_EVENT_SLUG = 'sheila-on-7-melompat-lebih-tinggi'

/**
 * Returns the slug of the currently selected event from the auth store.
 * Derives slug from API events list by matching selectedEventId.
 * Falls back to DEFAULT_EVENT_SLUG when no event is selected or slug not found.
 *
 * In both mock and real mode, uses the API-fetched events list.
 * (In mock mode, the mock handler provides event data.)
 */
export function useCurrentEventSlug(): string {
  const selectedEventId = useAuthStore((s) => s.selectedEventId)

  // Always fetch events from API (mock handler provides data in mock mode)
  const { data: apiEvents } = useAdminEvents()

  if (!selectedEventId) return DEFAULT_EVENT_SLUG

  // Derive slug from API events by matching ID
  if (apiEvents && Array.isArray(apiEvents)) {
    const events = apiEvents as Record<string, unknown>[]
    const matchedEvent = events.find(
      (event) => String(event.id) === selectedEventId
    )
    if (matchedEvent?.slug) {
      return String(matchedEvent.slug)
    }
  }

  return DEFAULT_EVENT_SLUG
}
