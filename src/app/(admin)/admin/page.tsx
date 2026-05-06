'use client'

import { useAuthStore } from '@/lib/auth-store'
import { DashboardOverview } from '@/components/admin/DashboardOverview'
import OrganizerDashboardPage from './organizer-dashboard/page'

export default function AdminDashboardPage() {
  const { user } = useAuthStore()

  // Render different dashboards based on role
  if (user?.role === 'ORGANIZER') {
    return <OrganizerDashboardPage />
  }

  return <DashboardOverview />
}
