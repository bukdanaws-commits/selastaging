'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useCurrentEventSlug } from '@/hooks/use-current-event'
import type { UserRole } from '@/lib/types'

// ─── SCOPED DATA HOOK ──────────────────────────────────────────────────────
// Provides role-aware data scoping for shared admin/organizer pages.
// SUPER_ADMIN sees all data; ORGANIZER sees only their own data.

interface ScopedDataOptions {
  /** If true, data will also be filtered by the selected event */
  filterByEvent?: boolean
}

export function useScopedData(options?: ScopedDataOptions) {
  const { user, hasRole, selectedEventId } = useAuthStore()
  const eventSlug = useCurrentEventSlug()

  const userRole = user?.role ?? 'PARTICIPANT'
  const organizerId = user?.organizerId
  const tenantId = user?.tenantId
  const isSuperAdmin = hasRole('SUPER_ADMIN')
  const isOrganizer = hasRole('ORGANIZER')
  const canViewAll = isSuperAdmin

  // Build query params based on role
  const scopeParams = useMemo(() => {
    const params: Record<string, string> = {}

    if (isOrganizer && organizerId) {
      params.organizerId = organizerId
    }

    if (isOrganizer && tenantId) {
      params.tenantId = tenantId
    }

    if (options?.filterByEvent && selectedEventId) {
      params.eventId = selectedEventId
    }

    return params
  }, [isOrganizer, organizerId, tenantId, selectedEventId, options?.filterByEvent])

  // Determine which API to call based on role
  const apiScope = useMemo(() => {
    if (isSuperAdmin) return 'admin' as const
    if (isOrganizer) return 'organizer' as const
    return 'admin' as const // fallback
  }, [isSuperAdmin, isOrganizer])

  return {
    /** Current user role */
    userRole,
    /** Whether user is SUPER_ADMIN */
    isSuperAdmin,
    /** Whether user is ORGANIZER */
    isOrganizer,
    /** Whether user can view all data (across tenants) */
    canViewAll,
    /** Current user's organizer ID (if ORGANIZER) */
    organizerId,
    /** Current user's tenant ID (if multi-tenant) */
    tenantId,
    /** Currently selected event ID */
    selectedEventId,
    /** Currently selected event slug */
    eventSlug,
    /** Pre-built query params for scoped API calls */
    scopeParams,
    /** Which API scope to use: 'admin' or 'organizer' */
    apiScope,
  }
}

// ─── ROLE-BASED LABEL HOOK ─────────────────────────────────────────────────
// Returns the appropriate page title based on user role.

interface RoleLabelConfig {
  superAdmin: string
  organizer: string
}

export function useRoleLabel(config: RoleLabelConfig): string {
  const { isSuperAdmin } = useScopedData()
  return isSuperAdmin ? config.superAdmin : config.organizer
}
