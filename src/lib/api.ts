// ─── SELEEVENT API CLIENT ──────────────────────────────────────────────────
// Centralized API endpoint constants + fetch client
// Backend: Golang Fiber v2 (Port 8080)
// All requests go through Caddy gateway via XTransformPort
// Dev mode: Direct to Golang backend via XTransformPort

import type {
  ICheckTicketRequest,
  ICheckTicketResponse,
  IRedeemTicketRequest,
  IRedeemTicketResponse,
  IGateScanRequest,
  IGateScanResponse,
  ILiveStats,
  IDashboardKPIs,
  ICreateOrderRequest,
  ICreatePaymentRequest,
  ICreatePaymentResponse,
  IPaymentStatus,
  IPagination,
} from './types'

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

// Golang backend port (for XTransformPort gateway)
const GO_BACKEND_PORT = process.env.NEXT_PUBLIC_GO_PORT || '8080'

// Whether to use direct Golang backend or Next.js API proxy
const USE_DIRECT_BACKEND = process.env.NEXT_PUBLIC_USE_DIRECT_BACKEND === 'true'

function getBaseUrl(): string {
  if (USE_DIRECT_BACKEND) {
    return `/?XTransformPort=${GO_BACKEND_PORT}`
  }
  return API_BASE
}

// ─── API ENDPOINTS (matching Golang Fiber routes.go) ──────────────────────

export const API = {
  // Auth
  AUTH: {
    GOOGLE_LOGIN:   '/api/v1/auth/google',
    REFRESH_TOKEN:  '/api/v1/auth/refresh',
    LOGOUT:         '/api/v1/auth/logout',
    ME:             '/api/v1/auth/me',
  },

  // Public
  PUBLIC: {
    CHECK_TICKET:   '/api/v1/tickets/check',
    EVENT_DETAIL:   (slug: string) => `/api/v1/events/${slug}`,
    TICKET_TYPES:   (eventId: string) => `/api/v1/events/${eventId}/ticket-types`,
  },

  // Orders
  ORDERS: {
    CREATE:         '/api/v1/orders',
    LIST:           '/api/v1/orders',
    DETAIL:         (orderId: string) => `/api/v1/orders/${orderId}`,
    CANCEL:         (orderId: string) => `/api/v1/orders/${orderId}/cancel`,
  },

  // Payment (DOKU)
  PAYMENT: {
    CREATE:         '/api/doku/create-payment',
    CALLBACK:       '/api/doku/notification',
    STATUS:         (orderId: string) => `/api/doku/check-status?orderId=${orderId}`,
  },

  // Organizer (SUPER_ADMIN | ADMIN | ORGANIZER)
  ORGANIZER: {
    DASHBOARD_STATS:   '/api/v1/organizer/dashboard/stats',
    TICKETS:           '/api/v1/organizer/tickets',
    REDEMPTIONS:       '/api/v1/organizer/redemptions',
    LIVE_MONITOR:      '/api/v1/organizer/live-monitor',
    COUNTERS:          '/api/v1/organizer/counters',
    GATES:             '/api/v1/organizer/gates',
    STAFF:             '/api/v1/organizer/staff',
    WRISTBAND_INVENTORY: '/api/v1/organizer/wristband-inventory',
    WRISTBAND_GUIDE:   '/api/v1/organizer/wristband-guide',
  },

  // Counter (COUNTER_STAFF)
  COUNTER: {
    SCAN_REDEEM:     '/api/v1/counter/scan',
    MY_REDEMPTIONS:  '/api/v1/counter/redemptions',
    STATUS:          '/api/v1/counter/status',
    INVENTORY:       '/api/v1/counter/inventory',
    GUIDE:           '/api/v1/counter/guide',
  },

  // Gate (GATE_STAFF)
  GATE: {
    SCAN:         '/api/v1/gate/scan',
    LOGS:         '/api/v1/gate/logs',
    STATUS:       '/api/v1/gate/status',
    PROFILE:      '/api/v1/gate/profile',
  },

  // Admin (SUPER_ADMIN | ADMIN)
  ADMIN: {
    DASHBOARD:      '/api/v1/admin/dashboard',
    ANALYTICS:      '/api/v1/admin/analytics',
    ORDERS:         '/api/v1/admin/orders',
    USERS:          '/api/v1/admin/users',
    EVENTS:         '/api/v1/admin/events',
    TICKETS:        '/api/v1/admin/tickets',
    STAFF:          '/api/v1/admin/staff',
    COUNTERS:       '/api/v1/admin/counters',
    GATE_MANAGE:    '/api/v1/admin/gates',
    GATE_MONITOR:   '/api/v1/admin/gate-monitoring',
    ORGANIZERS:     '/api/v1/admin/organizers',
    ORGANIZER_FEE:  (id: string) => `/api/v1/admin/organizers/${id}/fee`,
    ORGANIZER_APPROVE: (id: string) => `/api/v1/admin/organizers/${id}/approve`,
    WITHDRAWALS:    '/api/v1/admin/withdrawals',
    WITHDRAWAL_APPROVE: (id: string) => `/api/v1/admin/withdrawals/${id}/approve`,
    WITHDRAWAL_REJECT: (id: string) => `/api/v1/admin/withdrawals/${id}/reject`,
    WITHDRAWAL_PROOF: (id: string) => `/api/v1/admin/withdrawals/${id}/transfer-proof`,
    WITHDRAWAL_CHECK_DOKU: (id: string) => `/api/v1/admin/withdrawals/${id}/check-doku`,
    PAYMENT_LOGS:   '/api/v1/admin/payment-logs',
    REFUNDS:        '/api/v1/admin/refunds',
    SEATS:          '/api/v1/admin/seats',
    SETTINGS:       '/api/v1/admin/settings',
    CREW_GATES:     '/api/v1/admin/crew-gates',
    LIVE_MONITOR:   '/api/v1/admin/live-monitor',
    CANCEL_TICKET:  (ticketId: string) => `/api/v1/admin/tickets/${ticketId}/cancel`,
    EXPIRE_PENDING: '/api/v1/admin/tickets/expire-pending',
    VERIFICATIONS:  '/api/v1/admin/verifications',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST:           '/api/v1/notifications',
    MARK_READ:      (id: string) => `/api/v1/notifications/${id}/read`,
    MARK_ALL_READ:  '/api/v1/notifications/read-all',
  },

  // SSE
  SSE: {
    STREAM:        '/api/v1/events/stream',
  },

  // Coupons
  COUPONS: {
    LIST:           '/api/v1/admin/coupons',
    CREATE:         '/api/v1/admin/coupons',
    UPDATE:         (id: string) => `/api/v1/admin/coupons/${id}`,
    DELETE:         (id: string) => `/api/v1/admin/coupons/${id}`,
    VALIDATE:       '/api/v1/coupons/validate',
  },
} as const

// ─── MOCK MODE HELPERS ─────────────────────────────────────────────────────

/**
 * Toggle mock mode at runtime.
 * Mock is ON by default. Only OFF when explicitly set to 'false'.
 */
export function setMockMode(enabled: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem('sele_use_mock', enabled ? 'true' : 'false')
  // Force page reload to apply
  window.location.reload()
}

/**
 * Check if mock mode is currently enabled.
 * Returns true (mock ON) by default unless explicitly disabled.
 */
export function isMockMode(): boolean {
  if (typeof window === 'undefined') return true
  const mockEnvDisabled = process.env.NEXT_PUBLIC_USE_MOCK === 'false'
  const mockLocalStorageDisabled = localStorage.getItem('sele_use_mock') === 'false'
  return !mockEnvDisabled && !mockLocalStorageDisabled
}

// ─── AUTH TOKEN HELPERS ────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sele_access_token')
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sele_refresh_token')
}

export function setTokens(access: string, refresh: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('sele_access_token', access)
  localStorage.setItem('sele_refresh_token', refresh)
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('sele_access_token')
  localStorage.removeItem('sele_refresh_token')
}

// ─── GENERIC FETCH WRAPPER WITH ENVELOPE UNWRAPPING ──────────────────────────

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
  timeout?: number
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// Paginated data type for hooks
export interface PaginatedData<T> {
  data: T[]
  pagination: IPagination
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, timeout = 15000, headers: customHeaders, method = 'GET', body, ...fetchOptions } = options

  // ─── MOCK MODE INTERCEPT ────────────────────────────────────────────
  // Mock is ON by default. Only OFF when explicitly set to 'false'.
  // This ensures the app works without backend/database on Vercel.
  if (typeof window !== 'undefined') {
    const mockEnvDisabled = process.env.NEXT_PUBLIC_USE_MOCK === 'false'
    const mockLocalStorageDisabled = localStorage.getItem('sele_use_mock') === 'false'
    const useMock = !mockEnvDisabled && !mockLocalStorageDisabled
    if (useMock) {
      try {
        // Single lazy import of the entire mock module (avoids Turbopack chunk split issues)
        const mockModule = await import('./mock/index')
        if (!mockModule.useMockStore.getState().isInitialized) {
          mockModule.useMockStore.getState().initialize()
        }
        return await mockModule.handleMockRequest<T>({
          endpoint,
          method,
          body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined,
          params,
        })
      } catch (mockError) {
        console.error('[Mock] Error:', mockError)
        throw new Error(`[Mock] ${mockError instanceof Error ? mockError.message : 'Unknown mock error'}`)
      }
    }
  }

  // ─── REAL API CALL (below only runs when mock is disabled) ───────────
  const { timeout: realTimeout, headers: realHeaders, method: realMethod, body: realBody, ...restOptions } = options

  // Build URL with query params
  let url = `${getBaseUrl()}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(realHeaders as Record<string, string>),
  }

  // Add auth token if available
  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Timeout controller
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), realTimeout || 15000)

  try {
    const response = await fetch(url, {
      ...restOptions,
      method: realMethod || 'GET',
      body: realBody,
      headers,
      signal: controller.signal,
    })

    const json = await response.json()

    // ─── UNWRAP BACKEND RESPONSE ENVELOPE ─────────────────────────────────
    // Backend returns: { success: true, data: {...}, meta/pagination: {...} }
    //                  { success: false, error: "..." }
    if (typeof json.success === 'boolean') {
      if (!json.success) {
        throw new ApiError(
          response.status,
          json.error || json.message || `Request failed`,
          json
        )
      }
      // Success response — unwrap data
      if (json.pagination || json.meta) {
        // Paginated response — return { data, pagination }
        return {
          data: json.data,
          pagination: json.pagination || json.meta,
        } as T
      }
      // Non-paginated — just return the data
      return json.data as T
    }

    // Fallback: no envelope, return raw JSON
    if (!response.ok) {
      throw new ApiError(
        response.status,
        json.message || json.error || `HTTP ${response.status}`,
        json
      )
    }

    return json as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout')
    }
    throw new ApiError(500, 'Network error. Please try again.')
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── TYPED API METHODS ─────────────────────────────────────────────────────

// Auth
export const authApi = {
  googleLogin: (token: string) =>
    apiFetch<{ user: unknown; accessToken: string; refreshToken: string; expiresIn: number }>(
      API.AUTH.GOOGLE_LOGIN,
      { method: 'POST', body: JSON.stringify({ token }) }
    ),

  refreshToken: (refreshToken: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      API.AUTH.REFRESH_TOKEN,
      { method: 'POST', body: JSON.stringify({ refreshToken }) }
    ),

  getMe: () =>
    apiFetch<{ user: unknown }>(API.AUTH.ME),

  logout: () =>
    apiFetch<void>(API.AUTH.LOGOUT, { method: 'POST' }),
}

// Public
export const publicApi = {
  getEventBySlug: (slug: string) =>
    apiFetch<{ event: unknown }>(API.PUBLIC.EVENT_DETAIL(slug)),

  getTicketTypes: (eventId: string) =>
    apiFetch<unknown[]>(API.PUBLIC.TICKET_TYPES(eventId)),

  checkTicket: (ticketCode: string) =>
    apiFetch<ICheckTicketResponse>(
      API.PUBLIC.CHECK_TICKET,
      { method: 'POST', body: JSON.stringify({ ticketCode } as ICheckTicketRequest) }
    ),
}

// Orders
export const orderApi = {
  createOrder: (data: ICreateOrderRequest) =>
    apiFetch<unknown>(API.ORDERS.CREATE, { method: 'POST', body: JSON.stringify(data) }),

  getUserOrders: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ORDERS.LIST, { params }),

  getOrderDetail: (orderId: string) =>
    apiFetch<unknown>(API.ORDERS.DETAIL(orderId)),

  cancelOrder: (orderId: string) =>
    apiFetch<void>(API.ORDERS.CANCEL(orderId), { method: 'POST' }),
}

// Payment (DOKU)
export const paymentApi = {
  createDokuPayment: (data: ICreatePaymentRequest) =>
    apiFetch<ICreatePaymentResponse>(API.PAYMENT.CREATE, { method: 'POST', body: JSON.stringify(data) }),

  getDokuPaymentStatus: (orderId: string) =>
    apiFetch<IPaymentStatus>(API.PAYMENT.STATUS(orderId)),

  // Legacy aliases for backward compatibility
  createPayment: (data: ICreatePaymentRequest) =>
    apiFetch<ICreatePaymentResponse>(API.PAYMENT.CREATE, { method: 'POST', body: JSON.stringify(data) }),

  getPaymentStatus: (orderId: string) =>
    apiFetch<IPaymentStatus>(API.PAYMENT.STATUS(orderId)),
}

// Organizer
export const organizerApi = {
  getDashboardStats: (eventId: string) =>
    apiFetch<{ kpis: IDashboardKPIs; liveStats: ILiveStats }>(
      API.ORGANIZER.DASHBOARD_STATS,
      { params: { eventId } }
    ),

  // ─── Event CRUD ──────────────────────────────────────────────────────
  getEvent: () =>
    apiFetch<unknown>('/api/v1/organizer/event'),

  createEvent: (data: Record<string, unknown>) =>
    apiFetch<unknown>('/api/v1/organizer/event', { method: 'POST', body: JSON.stringify(data) }),

  updateEvent: (eventId: string, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/api/v1/organizer/event/${eventId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Ticket Types ────────────────────────────────────────────────────
  getTicketTypes: (eventId?: string) =>
    apiFetch<unknown[]>('/api/v1/organizer/ticket-types', { params: eventId ? { eventId } : undefined }),

  createTicketType: (data: Record<string, unknown>) =>
    apiFetch<unknown>('/api/v1/organizer/ticket-types', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Orders & Tickets ────────────────────────────────────────────────
  getOrders: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>('/api/v1/organizer/orders', { params }),

  getLiveMonitor: (eventId: string) =>
    apiFetch<ILiveStats>(API.ORGANIZER.LIVE_MONITOR, { params: { eventId } }),

  getRedemptions: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ORGANIZER.REDEMPTIONS, { params }),

  getCounters: (params?: Record<string, string>) =>
    apiFetch<unknown[]>(API.ORGANIZER.COUNTERS, { params }),

  getGates: (params?: Record<string, string>) =>
    apiFetch<unknown[]>(API.ORGANIZER.GATES, { params }),

  getTickets: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ORGANIZER.TICKETS, { params }),

  getStaff: (params?: Record<string, string>) =>
    apiFetch<unknown[]>(API.ORGANIZER.STAFF, { params }),

  getWristbandInventory: (params?: Record<string, string>) =>
    apiFetch<{ inventory: unknown[] }>(API.ORGANIZER.WRISTBAND_INVENTORY, { params }),

  getWristbandGuide: () =>
    apiFetch<{ guide: unknown[] }>(API.ORGANIZER.WRISTBAND_GUIDE),

  // ─── Finance ─────────────────────────────────────────────────────────
  getFinance: (eventId?: string) =>
    apiFetch<unknown>('/api/v1/organizer/finance', { params: eventId ? { eventId } : undefined }),

  getBankAccount: () =>
    apiFetch<unknown>('/api/v1/organizer/bank-account'),

  saveBankAccount: (data: Record<string, unknown>) =>
    apiFetch<unknown>('/api/v1/organizer/bank-account', { method: 'POST', body: JSON.stringify(data) }),

  requestWithdrawal: (data: { amount: number }) =>
    apiFetch<unknown>('/api/v1/organizer/withdraw', { method: 'POST', body: JSON.stringify(data) }),

  getWithdrawals: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>('/api/v1/organizer/withdrawals', { params }),

  // ─── Payment Logs ────────────────────────────────────────────────────
  getPaymentLogs: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>('/api/v1/organizer/payment-logs', { params }),

  // ─── Refunds ─────────────────────────────────────────────────────────
  refundTicket: (data: { orderId: string; amount: number; reason: string }) =>
    apiFetch<unknown>('/api/v1/organizer/refunds', { method: 'POST', body: JSON.stringify(data) }),

  getRefunds: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>('/api/v1/organizer/refunds', { params }),
}

// Counter
export const counterApi = {
  scanAndRedeem: (data: IRedeemTicketRequest) =>
    apiFetch<IRedeemTicketResponse>(
      API.COUNTER.SCAN_REDEEM,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getRedemptions: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.COUNTER.MY_REDEMPTIONS, { params }),

  getStatus: () =>
    apiFetch<{ counter: unknown; stats: unknown }>(API.COUNTER.STATUS),

  getInventory: () =>
    apiFetch<{ inventory: unknown[] }>(API.COUNTER.INVENTORY),

  getGuide: () =>
    apiFetch<{ guide: unknown[] }>(API.COUNTER.GUIDE),
}

// Gate
export const gateApi = {
  scanTicket: (data: IGateScanRequest) =>
    apiFetch<IGateScanResponse>(
      API.GATE.SCAN,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getLogs: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.GATE.LOGS, { params }),

  getStatus: () =>
    apiFetch<{ gate: unknown; stats: unknown }>(API.GATE.STATUS),

  getProfile: () =>
    apiFetch<{ staff: unknown; gate: unknown; assignment: unknown; todayScans: number }>(API.GATE.PROFILE),
}

// Admin
export const adminApi = {
  getDashboard: () =>
    apiFetch<unknown>(API.ADMIN.DASHBOARD),

  getOrders: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.ORDERS, { params }),

  getUsers: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.USERS, { params }),

  getEvents: (params?: Record<string, string>) =>
    apiFetch<unknown[]>(API.ADMIN.EVENTS, { params }),

  getAnalytics: (eventId?: string) =>
    apiFetch<unknown>(API.ADMIN.ANALYTICS, { params: eventId ? { eventId } : undefined }),

  getTickets: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.TICKETS, { params }),

  getStaff: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.STAFF, { params }),

  getCounters: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.COUNTERS, { params }),

  getGates: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.GATE_MANAGE, { params }),

  getGateMonitoring: (eventId?: string) =>
    apiFetch<unknown>(API.ADMIN.GATE_MONITOR, { params: eventId ? { eventId } : undefined }),

  getOrganizers: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.ORGANIZERS, { params }),

  setOrganizerFee: (organizerId: string, fee: number) =>
    apiFetch<void>(API.ADMIN.ORGANIZER_FEE(organizerId), { method: 'PATCH', body: JSON.stringify({ fee }) }),

  approveOrganizer: (organizerId: string) =>
    apiFetch<void>(API.ADMIN.ORGANIZER_APPROVE(organizerId), { method: 'PATCH' }),

  getWithdrawals: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.WITHDRAWALS, { params }),

  approveWithdrawal: (withdrawalId: string, method: 'AUTO_DOKU' | 'MANUAL' = 'MANUAL') =>
    apiFetch<void>(API.ADMIN.WITHDRAWAL_APPROVE(withdrawalId), { method: 'PATCH', body: JSON.stringify({ method }) }),

  rejectWithdrawal: (withdrawalId: string, reason: string) =>
    apiFetch<void>(API.ADMIN.WITHDRAWAL_REJECT(withdrawalId), { method: 'PATCH', body: JSON.stringify({ reason }) }),

  uploadTransferProof: (withdrawalId: string, file: File, note?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (note) formData.append('note', note)
    return apiFetch<void>(API.ADMIN.WITHDRAWAL_PROOF(withdrawalId), {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: formData as unknown as string,
    })
  },

  checkDokuStatus: (withdrawalId: string) =>
    apiFetch<{ success: boolean; data?: { status: string; dokuStatus: string } }>(API.ADMIN.WITHDRAWAL_CHECK_DOKU(withdrawalId), { method: 'POST' }),

  getPaymentLogs: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.PAYMENT_LOGS, { params }),

  getRefunds: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.REFUNDS, { params }),

  getSeats: (eventId?: string) =>
    apiFetch<unknown>(API.ADMIN.SEATS, { params: eventId ? { eventId } : undefined }),

  getSettings: () =>
    apiFetch<unknown>(API.ADMIN.SETTINGS),

  getCrewGates: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.CREW_GATES, { params }),

  getLiveMonitor: (eventId?: string) =>
    apiFetch<unknown>(API.ADMIN.LIVE_MONITOR, { params: eventId ? { eventId } : undefined }),

  getVerifications: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.ADMIN.VERIFICATIONS, { params }),

  cancelTicket: (ticketId: string) =>
    apiFetch<void>(API.ADMIN.CANCEL_TICKET(ticketId), { method: 'PATCH' }),

  expirePendingTickets: () =>
    apiFetch<{ count: number }>(API.ADMIN.EXPIRE_PENDING, { method: 'POST' }),
}

// Notifications
export const notificationApi = {
  getNotifications: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.NOTIFICATIONS.LIST, { params }),

  markAsRead: (id: string) =>
    apiFetch<void>(API.NOTIFICATIONS.MARK_READ(id), { method: 'PATCH' }),

  markAllAsRead: () =>
    apiFetch<void>(API.NOTIFICATIONS.MARK_ALL_READ, { method: 'POST' }),
}

// Coupons
export const couponApi = {
  getCoupons: (params?: Record<string, string>) =>
    apiFetch<PaginatedData<unknown>>(API.COUPONS.LIST, { params }),

  createCoupon: (data: Record<string, unknown>) =>
    apiFetch<unknown>(API.COUPONS.CREATE, { method: 'POST', body: JSON.stringify(data) }),

  updateCoupon: (id: string, data: Record<string, unknown>) =>
    apiFetch<unknown>(API.COUPONS.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),

  deleteCoupon: (id: string) =>
    apiFetch<{ success: boolean }>(API.COUPONS.DELETE(id), { method: 'DELETE' }),

  validateCoupon: (data: { code: string; orderId: string; subtotal: number; category?: string }) =>
    apiFetch<{ valid: boolean; discountAmount: number; message?: string; coupon?: unknown }>(
      API.COUPONS.VALIDATE,
      { method: 'POST', body: JSON.stringify(data) }
    ),
}

// ─── DEFAULT EXPORT ────────────────────────────────────────────────────────

export default apiFetch
