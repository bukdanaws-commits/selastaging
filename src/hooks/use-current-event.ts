'use client'

import { useAuthStore } from '@/lib/auth-store'
import { MOCK_EVENTS, DEFAULT_EVENT_SLUG } from '@/lib/mock-events'
import { isMockMode } from '@/lib/api'

/**
 * Returns the slug of the currently selected event from the auth store.
 * Falls back to DEFAULT_EVENT_SLUG when no event is selected.
 *
 * In mock mode, uses the hardcoded MOCK_EVENTS list.
 * When mock is off, uses the API to fetch the event list.
 *
 * Usage:
 *   const eventSlug = useCurrentEventSlug()
 *   const { data } = useOrganizerDashboard(eventSlug)
 */
export function useCurrentEventSlug(): string {
  const selectedEventId = useAuthStore((s) => s.selectedEventId)

  if (!selectedEventId) return DEFAULT_EVENT_SLUG

  // In mock mode, resolve slug from MOCK_EVENTS
  if (typeof window !== 'undefined' && isMockMode()) {
    const event = MOCK_EVENTS.find((e) => e.id === selectedEventId)
    return event?.slug ?? DEFAULT_EVENT_SLUG
  }

  // When real backend is connected, the selectedEventId might already be a slug
  // or we need to fetch from API — for now, fall back to default
  // TODO: Implement API-based event slug resolution when backend is connected
  return DEFAULT_EVENT_SLUG
}
