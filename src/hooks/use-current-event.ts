'use client'

import { useAuthStore } from '@/lib/auth-store'
import { MOCK_EVENTS, DEFAULT_EVENT_SLUG } from '@/lib/mock-events'

/**
 * Returns the slug of the currently selected event from the auth store.
 * Falls back to DEFAULT_EVENT_SLUG when no event is selected.
 *
 * Usage:
 *   const eventSlug = useCurrentEventSlug()
 *   const { data } = useOrganizerDashboard(eventSlug)
 */
export function useCurrentEventSlug(): string {
  const selectedEventId = useAuthStore((s) => s.selectedEventId)

  if (!selectedEventId) return DEFAULT_EVENT_SLUG

  const event = MOCK_EVENTS.find((e) => e.id === selectedEventId)
  return event?.slug ?? DEFAULT_EVENT_SLUG
}
