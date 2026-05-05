import type { UserRole } from '@/lib/types'

// ─── NAVIGATION TYPES ──────────────────────────────────────────────────────

export interface NavItem {
  title: string
  href: string
  icon: string
  badge?: number | string
  roles: UserRole[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

// ─── COMPLETE NAVIGATION CONFIG ────────────────────────────────────────────
// Merged admin/organizer dashboard under /admin/ prefix

export const NAV_SECTIONS: NavSection[] = [
  // ── Utama (Main) ──────────────────────────────────────────────────────────
  {
    label: 'Utama',
    items: [
      {
        title: 'Dashboard',
        href: '/admin',
        icon: 'LayoutDashboard',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Events',
        href: '/admin/events',
        icon: 'CalendarDays',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Organizers',
        href: '/admin/organizers',
        icon: 'Building2',
        roles: ['SUPER_ADMIN'],
      },
    ],
  },

  // ── Ticketing ─────────────────────────────────────────────────────────────
  {
    label: 'Ticketing',
    items: [
      {
        title: 'Ticket Types',
        href: '/admin/ticket-types',
        icon: 'Ticket',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Orders',
        href: '/admin/orders',
        icon: 'ShoppingCart',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Tickets',
        href: '/admin/tickets',
        icon: 'ScanLine',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Seat Layout',
        href: '/admin/seat-layout',
        icon: 'Armchair',
        roles: ['ORGANIZER'],
      },
    ],
  },

  // ── Operasional ───────────────────────────────────────────────────────────
  {
    label: 'Operasional',
    items: [
      {
        title: 'Staff',
        href: '/admin/staff',
        icon: 'Users',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Counters',
        href: '/admin/counters',
        icon: 'Monitor',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Gates',
        href: '/admin/gate-management',
        icon: 'DoorOpen',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Crew & Gates',
        href: '/admin/crew-gates',
        icon: 'UserCog',
        roles: ['SUPER_ADMIN'],
      },
      {
        title: 'Redeem',
        href: '/admin/redeem',
        icon: 'Gift',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Redeem History',
        href: '/admin/redeem-history',
        icon: 'History',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Check Ticket',
        href: '/admin/check-ticket',
        icon: 'CircleCheckBig',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Wristband Guide',
        href: '/admin/wristband-guide',
        icon: 'Palette',
        roles: ['ORGANIZER'],
      },
    ],
  },

  // ── Keuangan ──────────────────────────────────────────────────────────────
  {
    label: 'Keuangan',
    items: [
      {
        title: 'Finance',
        href: '/admin/finance',
        icon: 'Wallet',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Bank Account',
        href: '/admin/bank-account',
        icon: 'Landmark',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Withdraw',
        href: '/admin/withdraw',
        icon: 'ArrowDownToLine',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Withdrawal History',
        href: '/admin/withdrawal-history',
        icon: 'Receipt',
        roles: ['ORGANIZER'],
      },
      {
        title: 'Withdrawals',
        href: '/admin/withdrawals',
        icon: 'FileCheck',
        roles: ['SUPER_ADMIN'],
      },
      {
        title: 'Payment Logs',
        href: '/admin/payment-logs',
        icon: 'FileText',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Refunds',
        href: '/admin/refunds',
        icon: 'RotateCcw',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
    ],
  },

  // ── D-Day ─────────────────────────────────────────────────────────────────
  {
    label: 'D-Day',
    items: [
      {
        title: 'Gate Monitoring',
        href: '/admin/gate-monitoring',
        icon: 'Activity',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
      {
        title: 'Live Monitor',
        href: '/admin/live-monitor',
        icon: 'Radio',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
    ],
  },

  // ── Laporan ───────────────────────────────────────────────────────────────
  {
    label: 'Laporan',
    items: [
      {
        title: 'Analytics',
        href: '/admin/analytics',
        icon: 'BarChart3',
        roles: ['SUPER_ADMIN', 'ORGANIZER'],
      },
    ],
  },

  // ── System ────────────────────────────────────────────────────────────────
  {
    label: 'System',
    items: [
      {
        title: 'Users',
        href: '/admin/users',
        icon: 'UserPlus',
        roles: ['SUPER_ADMIN'],
      },
      {
        title: 'Settings',
        href: '/admin/settings',
        icon: 'Settings',
        roles: ['SUPER_ADMIN'],
      },
    ],
  },
]

// ─── ROLE-BASED FILTER HELPER ──────────────────────────────────────────────

export function getNavSectionsForRole(role: UserRole): NavSection[] {
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0)
}
