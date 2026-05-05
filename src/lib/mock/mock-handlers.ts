// ─── SELEEVENT MOCK REQUEST HANDLERS ──────────────────────────────────────────
// Intercepts all API endpoints and returns mock data from the mock store.
// This is the routing layer: receives endpoint + method + body + params,
// dispatches to the correct handler, and returns the appropriate mock response.
//
// Response shapes match what apiFetch unwraps (just the data, not the envelope).

import type {
  IUser,
  IEvent,
  ITicketType,
  IOrder,
  ITicket,
  IRedemption,
  IGateLog,
  ICounter,
  IGate,
  ICounterStaff,
  IGateStaff,
  IWristbandInventory,
  INotification,
  IWithdrawalRequest,
  IOrganizerBankAccount,
  IOrganizerBalance,
  IOrganizerFeeConfig,
  IPaymentLog,
  ICoupon,
  ICheckTicketResponse,
  IRedeemTicketResponse,
  IGateScanResponse,
  ICreatePaymentResponse,
  IPaymentStatus,
  ILiveStats,
  IDashboardKPIs,
  IPagination,
  ICreateOrderRequest,
  UserRole,
  GateAction,
} from '@/lib/types'

import { useMockStore } from './mock-store'

// ─── REQUEST / RESPONSE TYPES ───────────────────────────────────────────────

export interface MockRequest {
  endpoint: string  // e.g., '/api/v1/admin/dashboard'
  method: string    // 'GET', 'POST', 'PATCH', 'DELETE'
  body?: unknown    // Request body (for POST/PATCH)
  params?: Record<string, string>  // Query parameters
}

export interface MockResponse<T = unknown> {
  data: T
  pagination?: IPagination
}

// ─── PAGINATION HELPER ──────────────────────────────────────────────────────

function paginate<T>(items: T[], page: number = 1, perPage: number = 20): { data: T[]; pagination: IPagination } {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage
  const end = start + perPage

  return {
    data: items.slice(start, end),
    pagination: { total, page: safePage, perPage, totalPages },
  }
}

function extractPagination(params?: Record<string, string>): { page: number; perPage: number } {
  return {
    page: params?.page ? parseInt(params.page, 10) : 1,
    perPage: params?.perPage ? parseInt(params.perPage, 10) : 20,
  }
}

// ─── URL MATCHING HELPERS ───────────────────────────────────────────────────

function matchRoute(pattern: string, actual: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const actualParts = actual.split('/')

  if (patternParts.length !== actualParts.length) return null

  const segments: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]
    const a = actualParts[i]
    if (p.startsWith(':')) {
      segments[p.slice(1)] = a
    } else if (p !== a) {
      return null
    }
  }
  return segments
}

// ─── HELPER: Get current mock role from localStorage ─────────────────────────

function getCurrentRole(): UserRole {
  if (typeof window === 'undefined') return 'PARTICIPANT'
  const role = localStorage.getItem('sele_mock_role') as UserRole | null
  return role || 'PARTICIPANT'
}

// ─── HELPER: Get current user from store based on role ───────────────────────

function getCurrentUser(): IUser | undefined {
  const store = useMockStore.getState()
  const role = getCurrentRole()
  return store.users.find(u => u.role === role)
}

// ─── HELPER: Simulate async delay for mutations ─────────────────────────────

function mockDelay(): Promise<void> {
  const ms = 100 + Math.random() * 200
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export async function handleMockRequest<T = unknown>(request: MockRequest): Promise<T> {
  const { endpoint, method, body, params } = request

  // ─── AUTH (4 endpoints) ─────────────────────────────────────────────────

  if (endpoint === '/api/v1/auth/me' && method === 'GET') {
    const user = getCurrentUser()
    if (!user) throw new Error('Unauthorized')
    return { user } as T
  }

  if (endpoint === '/api/v1/auth/google' && method === 'POST') {
    const user = getCurrentUser()
    const role = getCurrentRole()
    return {
      user,
      accessToken: `mock_access_${role.toLowerCase()}_${Date.now()}`,
      refreshToken: `mock_refresh_${role.toLowerCase()}_${Date.now()}`,
      expiresIn: 3600,
    } as T
  }

  if (endpoint === '/api/v1/auth/refresh' && method === 'POST') {
    const role = getCurrentRole()
    return {
      accessToken: `mock_access_${role.toLowerCase()}_${Date.now()}`,
      refreshToken: `mock_refresh_${role.toLowerCase()}_${Date.now()}`,
      expiresIn: 3600,
    } as T
  }

  if (endpoint === '/api/v1/auth/logout' && method === 'POST') {
    return undefined as T
  }

  // ─── PUBLIC (3 endpoints) ───────────────────────────────────────────────

  if (method === 'GET') {
    const eventMatch = matchRoute('/api/v1/events/:slug', endpoint)
    if (eventMatch && !endpoint.includes('/ticket-types')) {
      const store = useMockStore.getState()
      const event = store.events.find((e: IEvent) => e.slug === slug || e.id === slug) || store.events[0]
      if (!event || !event.id) throw new Error('Event not found')
      const ticketTypes = store.ticketTypes.filter((tt: ITicketType) => tt.eventId === event.id)
      return { event, ticketTypes } as T
    }

    const ttMatch = matchRoute('/api/v1/events/:eventId/ticket-types', endpoint)
    if (ttMatch) {
      const store = useMockStore.getState()
      const types = store.ticketTypes.filter((tt: ITicketType) => tt.eventId === ttMatch.eventId)
      return types as T
    }
  }

  // POST /api/v1/tickets/check
  if (endpoint === '/api/v1/tickets/check' && method === 'POST') {
    await mockDelay()
    const reqBody = body as { ticketCode?: string }
    if (!reqBody?.ticketCode) throw new Error('ticketCode is required')
    return useMockStore.getState().checkTicket(reqBody.ticketCode) as T
  }

  // ─── ORDERS (4 endpoints) ───────────────────────────────────────────────

  if (endpoint === '/api/v1/orders' && method === 'POST') {
    await mockDelay()
    return useMockStore.getState().createOrder(body as ICreateOrderRequest) as T
  }

  if (endpoint === '/api/v1/orders' && method === 'GET') {
    const store = useMockStore.getState()
    const user = getCurrentUser()
    const userOrders = user ? store.orders.filter((o: IOrder) => o.userId === user.id) : store.orders
    const { page, perPage } = extractPagination(params)
    return paginate(userOrders, page, perPage) as T
  }

  if (method === 'GET') {
    const orderMatch = matchRoute('/api/v1/orders/:orderId', endpoint)
    if (orderMatch && !endpoint.endsWith('/cancel')) {
      const store = useMockStore.getState()
      const order = store.orders.find((o: IOrder) => o.id === orderMatch.orderId)
      if (!order) throw new Error('Order not found')
      return {
        ...order,
        tickets: store.tickets.filter((t: ITicket) => t.orderId === order.id),
        event: store.events.find((e: IEvent) => e.id === order.eventId) || null,
        user: store.users.find((u: IUser) => u.id === order.userId),
      } as T
    }
  }

  if (method === 'POST') {
    const cancelMatch = matchRoute('/api/v1/orders/:orderId/cancel', endpoint)
    if (cancelMatch) {
      await mockDelay()
      useMockStore.getState().cancelOrder(cancelMatch.orderId)
      return undefined as T
    }
  }

  // ─── PAYMENT (3 endpoints) ──────────────────────────────────────────────

  if (endpoint === '/api/v1/payment/create' && method === 'POST') {
    await mockDelay()
    const b = body as Record<string, unknown>
    return useMockStore.getState().createPayment(String(b.orderId || ''), String(b.paymentType || 'virtual_account')) as T
  }

  if (endpoint === '/api/v1/payment/callback' && method === 'POST') {
    // DOKU notification webhook (mock — just log)
    return { success: true } as T
  }

  if (endpoint === '/api/v1/doku/notification' && method === 'POST') {
    // DOKU notification endpoint (mock)
    return { success: true } as T
  }

  if (method === 'GET') {
    const paymentMatch = matchRoute('/api/v1/payment/status/:orderId', endpoint)
    if (paymentMatch) {
      return useMockStore.getState().getPaymentStatus(paymentMatch.orderId) as T
    }
  }

  // ─── ORGANIZER (existing 10 + new 6 endpoints) ─────────────────────────

  if (endpoint === '/api/v1/organizer/dashboard/stats' && method === 'GET') {
    const store = useMockStore.getState()
    return { kpis: store.getDashboardKPIs(), liveStats: store.getLiveStats() } as T
  }

  if (endpoint === '/api/v1/organizer/live-monitor' && method === 'GET') {
    return useMockStore.getState().getLiveStats() as T
  }

  if (endpoint === '/api/v1/organizer/tickets' && method === 'GET') {
    const store = useMockStore.getState()
    let tickets = [...store.tickets]
    if (params?.eventId) tickets = tickets.filter((t: ITicket) => t.eventId === params.eventId)
    if (params?.status) tickets = tickets.filter((t: ITicket) => t.status === params.status)
    const { page, perPage } = extractPagination(params)
    return paginate(tickets, page, perPage) as T
  }

  if (endpoint === '/api/v1/organizer/redemptions' && method === 'GET') {
    const store = useMockStore.getState()
    let redemptions = [...store.redemptions]
    if (params?.eventId) {
      const eventTicketIds = new Set(store.tickets.filter((t: ITicket) => t.eventId === params.eventId).map((t: ITicket) => t.id))
      redemptions = redemptions.filter((r: IRedemption) => eventTicketIds.has(r.ticketId))
    }
    const { page, perPage } = extractPagination(params)
    return paginate(redemptions, page, perPage) as T
  }

  if (endpoint === '/api/v1/organizer/counters' && method === 'GET') {
    const store = useMockStore.getState()
    let counters = [...store.counters]
    if (params?.eventId) counters = counters.filter((c: ICounter) => c.eventId === params.eventId)
    return counters as T
  }

  if (endpoint === '/api/v1/organizer/gates' && method === 'GET') {
    const store = useMockStore.getState()
    let gates = [...store.gates]
    if (params?.eventId) gates = gates.filter((g: IGate) => g.eventId === params.eventId)
    return gates as T
  }

  if (endpoint === '/api/v1/organizer/staff' && method === 'GET') {
    const store = useMockStore.getState()
    let staffList = [...store.counterStaff, ...store.gateStaff]
    if (params?.eventId) {
      const counterIds = new Set(store.counters.filter((c: ICounter) => c.eventId === params.eventId).map((c: ICounter) => c.id))
      const gateIds = new Set(store.gates.filter((g: IGate) => g.eventId === params.eventId).map((g: IGate) => g.id))
      staffList = [
        ...store.counterStaff.filter((cs: ICounterStaff) => counterIds.has(cs.counterId)),
        ...store.gateStaff.filter((gs: IGateStaff) => gateIds.has(gs.gateId)),
      ]
    }
    return staffList as T
  }

  if (endpoint === '/api/v1/organizer/wristband-inventory' && method === 'GET') {
    const store = useMockStore.getState()
    let inventory = [...store.wristbands]
    if (params?.eventId) inventory = inventory.filter((w: IWristbandInventory) => w.eventId === params.eventId)
    return { inventory } as T
  }

  if (endpoint === '/api/v1/organizer/wristband-guide' && method === 'GET') {
    const store = useMockStore.getState()
    const guide = store.wristbands.map((w: IWristbandInventory) => ({
      color: w.color, colorHex: w.colorHex, type: w.type,
      description: `Wristband ${w.color} for ${w.type} access`,
    }))
    return { guide } as T
  }

  // ─── ORGANIZER: NEW ENDPOINTS (Balance, Bank Account, Withdrawals, Payment Logs) ──

  // GET /api/v1/organizer/balance
  if (endpoint === '/api/v1/organizer/balance' && method === 'GET') {
    const user = getCurrentUser()
    const store = useMockStore.getState()
    const eventId = params?.eventId || store.events[0].id
    const balance = store.getOrganizerBalance(user?.id || '', eventId)
    if (!balance) throw new Error('Balance not found')
    return balance as T
  }

  // GET /api/v1/organizer/bank-account
  if (endpoint === '/api/v1/organizer/bank-account' && method === 'GET') {
    const user = getCurrentUser()
    const bankAccount = useMockStore.getState().getBankAccount(user?.id || '')
    return bankAccount || null as T
  }

  // POST /api/v1/organizer/bank-account
  if (endpoint === '/api/v1/organizer/bank-account' && method === 'POST') {
    await mockDelay()
    const user = getCurrentUser()
    const b = body as Record<string, unknown>
    return useMockStore.getState().addBankAccount(
      user?.id || '',
      String(b.bankName || ''),
      String(b.accountNumber || ''),
      String(b.accountHolder || ''),
    ) as T
  }

  // POST /api/v1/organizer/withdrawals
  if (endpoint === '/api/v1/organizer/withdrawals' && method === 'POST') {
    await mockDelay()
    const user = getCurrentUser()
    const store = useMockStore.getState()
    const b = body as Record<string, unknown>
    return store.requestWithdrawal(
      user?.id || '',
      String(b.eventId || store.events[0].id),
      Number(b.amount || 0),
      String(b.bankAccountId || ''),
    ) as T
  }

  // GET /api/v1/organizer/withdrawals
  if (endpoint === '/api/v1/organizer/withdrawals' && method === 'GET') {
    const user = getCurrentUser()
    const withdrawals = useMockStore.getState().getWithdrawalsByOrganizer(user?.id || '')
    const { page, perPage } = extractPagination(params)
    return paginate(withdrawals, page, perPage) as T
  }

  // GET /api/v1/organizer/payment-logs
  if (endpoint === '/api/v1/organizer/payment-logs' && method === 'GET') {
    const store = useMockStore.getState()
    const eventId = params?.eventId || store.events[0].id
    const logs = store.getPaymentLogs(eventId)
    const { page, perPage } = extractPagination(params)
    return paginate(logs, page, perPage) as T
  }

  // GET /api/v1/organizer/refunds
  if (endpoint === '/api/v1/organizer/refunds' && method === 'GET') {
    // Mock: return empty refund list
    return { data: [], pagination: { total: 0, page: 1, perPage: 20, totalPages: 0 } } as T
  }

  // ─── COUNTER (5 endpoints) ──────────────────────────────────────────────

  if (endpoint === '/api/v1/counter/scan' && method === 'POST') {
    await mockDelay()
    const b = body as Record<string, unknown>
    return useMockStore.getState().redeemTicket(String(b.ticketCode || ''), '', String(b.wristbandCode || ''), String(b.wristbandColor || '')) as T
  }

  if (endpoint === '/api/v1/counter/redemptions' && method === 'GET') {
    const store = useMockStore.getState()
    const user = getCurrentUser()
    let redemptions = [...store.redemptions]
    if (user) redemptions = redemptions.filter((r: IRedemption) => r.staffId === user.id)
    const { page, perPage } = extractPagination(params)
    return paginate(redemptions, page, perPage) as T
  }

  if (endpoint === '/api/v1/counter/status' && method === 'GET') {
    const store = useMockStore.getState()
    const user = getCurrentUser()
    const counterAssignment = store.counterStaff.find((cs: ICounterStaff) => cs.userId === (user?.id || ''))
    const counter = counterAssignment ? store.counters.find((c: ICounter) => c.id === counterAssignment.counterId) : store.counters[0]
    const myRedemptions = user ? store.redemptions.filter((r: IRedemption) => r.staffId === user.id) : store.redemptions
    const stats = {
      totalRedeemed: myRedemptions.length,
      todayRedeemed: myRedemptions.filter((r: IRedemption) => r.redeemedAt.startsWith(new Date().toISOString().split('T')[0])).length,
    }
    return { counter: counter || null, stats } as T
  }

  if (endpoint === '/api/v1/counter/inventory' && method === 'GET') {
    return { inventory: useMockStore.getState().wristbands } as T
  }

  if (endpoint === '/api/v1/counter/guide' && method === 'GET') {
    const store = useMockStore.getState()
    const guide = store.wristbands.map((w: IWristbandInventory) => ({
      color: w.color, colorHex: w.colorHex, type: w.type,
      description: `Wristband ${w.color} for ${w.type} access`,
    }))
    return { guide } as T
  }

  // ─── GATE (4 endpoints) ─────────────────────────────────────────────────

  if (endpoint === '/api/v1/gate/scan' && method === 'POST') {
    await mockDelay()
    const b = body as Record<string, unknown>
    const currentUser = getCurrentUser()
    return useMockStore.getState().scanGate(
      String(b.ticketCode || ''),
      String(b.gateId || ''),
      currentUser?.id || '',
      (b.action as GateAction) || 'entry',
    ) as T
  }

  if (endpoint === '/api/v1/gate/logs' && method === 'GET') {
    const store = useMockStore.getState()
    const user = getCurrentUser()
    let logs = [...store.gateLogs]
    if (user) logs = logs.filter((gl: IGateLog) => gl.staffId === user.id)
    const { page, perPage } = extractPagination(params)
    return paginate(logs, page, perPage) as T
  }

  if (endpoint === '/api/v1/gate/status' && method === 'GET') {
    const store = useMockStore.getState()
    const user = getCurrentUser()
    const gateAssignment = store.gateStaff.find((gs: IGateStaff) => gs.userId === (user?.id || ''))
    const gate = gateAssignment ? store.gates.find((g: IGate) => g.id === gateAssignment.gateId) : store.gates[0]
    const myLogs = user ? store.gateLogs.filter((gl: IGateLog) => gl.staffId === user.id) : store.gateLogs
    const stats = {
      totalScans: myLogs.length,
      todayScans: myLogs.filter((gl: IGateLog) => gl.scannedAt.startsWith(new Date().toISOString().split('T')[0])).length,
      entries: myLogs.filter((gl: IGateLog) => gl.action === 'entry').length,
      exits: myLogs.filter((gl: IGateLog) => gl.action === 'exit').length,
      denials: myLogs.filter((gl: IGateLog) => gl.action === 'denied').length,
    }
    return { gate: gate || null, stats } as T
  }

  if (endpoint === '/api/v1/gate/profile' && method === 'GET') {
    const store = useMockStore.getState()
    const user = getCurrentUser()
    const staff = user || store.users[0]
    const gateAssignment = store.gateStaff.find((gs: IGateStaff) => gs.userId === (staff?.id || ''))
    const gate = gateAssignment ? store.gates.find((g: IGate) => g.id === gateAssignment.gateId) : store.gates[0]
    const todayScans = user ? store.gateLogs.filter((gl: IGateLog) => gl.staffId === user.id && gl.scannedAt.startsWith(new Date().toISOString().split('T')[0])).length : 0
    return { staff: staff || null, gate: gate || null, assignment: gateAssignment || null, todayScans } as T
  }

  // ─── ADMIN (existing + new endpoints) ───────────────────────────────────

  if (endpoint === '/api/v1/admin/dashboard' && method === 'GET') {
    const store = useMockStore.getState()
    const kpis = store.getDashboardKPIs()
    const liveStats = store.getLiveStats()
    return {
      ...kpis, ...liveStats,
      recentOrders: store.orders.slice(0, 10),
      recentRedemptions: store.redemptions.slice(0, 10),
      eventsSummary: store.events.length > 0 ? store.events.map((e: IEvent) => ({
        id: e.id, title: e.title, status: e.status,
        ticketCount: store.tickets.filter((t: ITicket) => t.eventId === e.id).length,
      })) : [],
      pendingWithdrawals: store.getPendingWithdrawals().length,
      platformRevenue: store.getPlatformRevenue(),
    } as T
  }

  if (endpoint === '/api/v1/admin/analytics' && method === 'GET') {
    const store = useMockStore.getState()
    const kpis = store.getDashboardKPIs()
    const event = store.events[0]
    const eventAnalytics = store.events.length > 0 ? store.events.map((e: IEvent) => ({
      eventId: e.id, eventTitle: e.title,
      totalTickets: store.tickets.length,
      soldTickets: store.tickets.filter((t: ITicket) => ['active', 'redeemed', 'inside', 'outside'].includes(t.status)).length,
      redeemedTickets: store.redemptions.length,
      revenue: store.orders.filter((o: IOrder) => o.status === 'paid').reduce((sum: number, o: IOrder) => sum + o.totalAmount, 0),
      gateEntries: store.gateLogs.filter((gl: IGateLog) => gl.action === 'entry').length,
      gateExits: store.gateLogs.filter((gl: IGateLog) => gl.action === 'exit' && gl.eventId === e.id).length,
    })) : []
    return {
      ...kpis, events: eventAnalytics,
      hourlyData: generateHourlyData(store),
      ticketTypeBreakdown: generateTicketTypeBreakdown(store),
    } as T
  }

  if (endpoint === '/api/v1/admin/orders' && method === 'GET') {
    const store = useMockStore.getState()
    let orders = [...store.orders]
    if (params?.status) orders = orders.filter((o: IOrder) => o.status === params.status)
    if (params?.eventId) orders = orders.filter((o: IOrder) => o.eventId === params.eventId)
    if (params?.search) {
      const search = params.search.toLowerCase()
      orders = orders.filter((o: IOrder) => o.orderCode.toLowerCase().includes(search) || o.userId.toLowerCase().includes(search))
    }
    const { page, perPage } = extractPagination(params)
    return paginate(orders, page, perPage) as T
  }

  if (endpoint === '/api/v1/admin/users' && method === 'GET') {
    const store = useMockStore.getState()
    let users = [...store.users]
    if (params?.role) users = users.filter((u: IUser) => u.role === params.role)
    if (params?.status) users = users.filter((u: IUser) => u.status === params.status)
    if (params?.search) {
      const search = params.search.toLowerCase()
      users = users.filter((u: IUser) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search))
    }
    const { page, perPage } = extractPagination(params)
    return paginate(users, page, perPage) as T
  }

  if (endpoint === '/api/v1/admin/events' && method === 'GET') {
    const store = useMockStore.getState()
    return store.events as T
  }

  if (endpoint === '/api/v1/admin/tickets' && method === 'GET') {
    const store = useMockStore.getState()
    let tickets = [...store.tickets]
    if (params?.eventId) tickets = tickets.filter((t: ITicket) => t.eventId === params.eventId)
    if (params?.status) tickets = tickets.filter((t: ITicket) => t.status === params.status)
    if (params?.search) {
      const search = params.search.toLowerCase()
      tickets = tickets.filter((t: ITicket) =>
        t.ticketCode.toLowerCase().includes(search) || t.attendeeName.toLowerCase().includes(search) || t.attendeeEmail.toLowerCase().includes(search)
      )
    }
    const { page, perPage } = extractPagination(params)
    return paginate(tickets, page, perPage) as T
  }

  if (endpoint === '/api/v1/admin/staff' && method === 'GET') {
    const store = useMockStore.getState()
    let allStaff = [
      ...store.counterStaff.map((cs: ICounterStaff) => ({ ...cs, staffType: 'counter' as const })),
      ...store.gateStaff.map((gs: IGateStaff) => ({ ...gs, staffType: 'gate' as const })),
    ]
    if (params?.eventId) {
      const counterIds = new Set(store.counters.filter((c: ICounter) => c.eventId === params.eventId).map((c: ICounter) => c.id))
      const gateIds = new Set(store.gates.filter((g: IGate) => g.eventId === params.eventId).map((g: IGate) => g.id))
      allStaff = allStaff.filter((s: Record<string, unknown>) => {
        if (s.staffType === 'counter') return counterIds.has(s.counterId as string)
        if (s.staffType === 'gate') return gateIds.has(s.gateId as string)
        return false
      })
    }
    const { page, perPage } = extractPagination(params)
    return paginate(allStaff, page, perPage) as T
  }

  if (endpoint === '/api/v1/admin/counters' && method === 'GET') {
    const store = useMockStore.getState()
    let counters = [...store.counters]
    if (params?.eventId) counters = counters.filter((c: ICounter) => c.eventId === params.eventId)
    if (params?.status) counters = counters.filter((c: ICounter) => c.status === params.status)
    const { page, perPage } = extractPagination(params)
    return paginate(counters, page, perPage) as T
  }

  if (endpoint === '/api/v1/admin/gates' && method === 'GET') {
    const store = useMockStore.getState()
    let gates = [...store.gates]
    if (params?.eventId) gates = gates.filter((g: IGate) => g.eventId === params.eventId)
    if (params?.status) gates = gates.filter((g: IGate) => g.status === params.status)
    const { page, perPage } = extractPagination(params)
    return paginate(gates, page, perPage) as T
  }

  if (endpoint === '/api/v1/admin/gate-monitoring' && method === 'GET') {
    const store = useMockStore.getState()
    const gates = params?.eventId ? store.gates.filter((g: IGate) => g.eventId === params.eventId) : store.gates
    const gateMonitoring = gates.map((gate: IGate) => {
      const gateGateLogs = store.gateLogs.filter((gl: IGateLog) => gl.gateId === gate.id)
      const assignedStaff = store.gateStaff.filter((gs: IGateStaff) => gs.gateId === gate.id).map((gs: IGateStaff) => {
        const user = store.users.find((u: IUser) => u.id === gs.userId)
        return { ...gs, user }
      })
      return {
        gate, stats: {
          totalScans: gateGateLogs.length,
          todayScans: gateGateLogs.filter((gl: IGateLog) => gl.scannedAt.startsWith(new Date().toISOString().split('T')[0])).length,
          entries: gateGateLogs.filter((gl: IGateLog) => gl.action === 'entry').length,
          exits: gateGateLogs.filter((gl: IGateLog) => gl.action === 'exit').length,
          denials: gateGateLogs.filter((gl: IGateLog) => gl.action === 'denied').length,
        },
        staff: assignedStaff,
        recentLogs: gateGateLogs.slice(-10).reverse(),
      }
    })
    return { gates: gateMonitoring, liveStats: store.getLiveStats() } as T
  }

  // ─── ADMIN: NEW WITHDRAWAL ENDPOINTS ───────────────────────────────────

  // GET /api/v1/admin/withdrawals
  if (endpoint === '/api/v1/admin/withdrawals' && method === 'GET') {
    const store = useMockStore.getState()
    let withdrawals = [...store.withdrawals]
    if (params?.status) withdrawals = withdrawals.filter((w: IWithdrawalRequest) => w.status === params.status)
    if (params?.organizerId) withdrawals = withdrawals.filter((w: IWithdrawalRequest) => w.organizerId === params.organizerId)
    const { page, perPage } = extractPagination(params)
    return paginate(withdrawals, page, perPage) as T
  }

  // GET /api/v1/admin/withdrawals/:id
  if (method === 'GET') {
    const wdDetailMatch = matchRoute('/api/v1/admin/withdrawals/:id', endpoint)
    if (wdDetailMatch) {
      const store = useMockStore.getState()
      const wd = store.withdrawals.find((w: IWithdrawalRequest) => w.id === wdDetailMatch.id)
      if (!wd) throw new Error('Withdrawal not found')
      return wd as T
    }
  }

  // PATCH /api/v1/admin/withdrawals/:id/approve
  if (method === 'PATCH') {
    const wdApproveMatch = matchRoute('/api/v1/admin/withdrawals/:id/approve', endpoint)
    if (wdApproveMatch) {
      await mockDelay()
      const user = getCurrentUser()
      useMockStore.getState().approveWithdrawal(wdApproveMatch.id, user?.id || '')
      return undefined as T
    }
  }

  // PATCH /api/v1/admin/withdrawals/:id/reject
  if (method === 'PATCH') {
    const wdRejectMatch = matchRoute('/api/v1/admin/withdrawals/:id/reject', endpoint)
    if (wdRejectMatch) {
      await mockDelay()
      const user = getCurrentUser()
      const b = body as Record<string, unknown>
      useMockStore.getState().rejectWithdrawal(wdRejectMatch.id, user?.id || '', String(b.reason || ''))
      return undefined as T
    }
  }

  // POST /api/v1/admin/withdrawals/:id/transfer-proof
  if (method === 'POST') {
    const wdProofMatch = matchRoute('/api/v1/admin/withdrawals/:id/transfer-proof', endpoint)
    if (wdProofMatch) {
      await mockDelay()
      const b = body as Record<string, unknown>
      useMockStore.getState().uploadTransferProof(wdProofMatch.id, String(b.proofUrl || ''), String(b.note || ''))
      return undefined as T
    }
  }

  // ─── ADMIN: ORGANIZER MANAGEMENT ───────────────────────────────────────

  // GET /api/v1/admin/organizers
  if (endpoint === '/api/v1/admin/organizers' && method === 'GET') {
    const store = useMockStore.getState()
    const organizers = store.users.filter(u => u.role === 'ORGANIZER')
    const enriched = organizers.map(org => ({
      ...org,
      feeConfig: store.organizerFeeConfigs.find(f => f.organizerId === org.id),
      balance: store.balances.find(b => b.organizerId === org.id),
      bankAccount: store.bankAccounts.find(ba => ba.organizerId === org.id),
      totalWithdrawals: store.withdrawals.filter(w => w.organizerId === org.id).length,
    }))
    return enriched as T
  }

  // PATCH /api/v1/admin/organizers/:id/fee
  if (method === 'PATCH') {
    const orgFeeMatch = matchRoute('/api/v1/admin/organizers/:id/fee', endpoint)
    if (orgFeeMatch) {
      await mockDelay()
      const b = body as Record<string, unknown>
      useMockStore.getState().setOrganizerFee(orgFeeMatch.id, Number(b.feePercent || 5))
      return undefined as T
    }
  }

  // PATCH /api/v1/admin/organizers/:id/approve
  if (method === 'PATCH') {
    const orgApproveMatch = matchRoute('/api/v1/admin/organizers/:id/approve', endpoint)
    if (orgApproveMatch) {
      await mockDelay()
      useMockStore.getState().approveOrganizer(orgApproveMatch.id)
      return undefined as T
    }
  }

  // GET /api/v1/admin/payment-logs
  if (endpoint === '/api/v1/admin/payment-logs' && method === 'GET') {
    const store = useMockStore.getState()
    let logs = [...store.paymentLogs]
    if (params?.eventId) logs = logs.filter((p: IPaymentLog) => p.eventId === params.eventId)
    if (params?.status) logs = logs.filter((p: IPaymentLog) => p.status === params.status)
    if (params?.paymentChannel) logs = logs.filter((p: IPaymentLog) => p.paymentChannel === params.paymentChannel)
    const { page, perPage } = extractPagination(params)
    return paginate(logs, page, perPage) as T
  }

  // ─── ADMIN: REMAINING ENDPOINTS ────────────────────────────────────────

  // No more verifications — removed

  if (endpoint === '/api/v1/admin/seats' && method === 'GET') {
    const store = useMockStore.getState()
    const eventId = params?.eventId || store.events[0]?.id
    if (!eventId) return { sections: [] } as T
    const ticketTypes = store.ticketTypes.filter((tt: ITicketType) => tt.eventId === eventId)
    const sections = ticketTypes.filter((tt: ITicketType) => tt.tier === 'tribun').map((tt: ITicketType) => ({
      section: tt.name, totalSeats: tt.quota, availableSeats: Math.max(0, tt.quota - tt.sold), rows: [],
    }))
    return {
      eventId, ticketTypes, sections,
      capacity: ticketTypes.reduce((s: number, tt: ITicketType) => s + tt.quota, 0),
      sold: ticketTypes.reduce((s: number, tt: ITicketType) => s + tt.sold, 0),
    } as T
  }

  if (endpoint === '/api/v1/admin/settings' && method === 'GET') {
    return {
      platformName: 'SeleEvent', platformUrl: 'https://seleevent.id',
      currency: 'IDR', locale: 'id-ID', timezone: 'Asia/Jakarta',
      maintenanceMode: false, maxEventsPerTenant: 10, maxTicketsPerEvent: 50000,
      defaultEventDuration: 8, autoExpirePendingMinutes: 30,
      enableSSE: true, enableQRCode: true, enableWristband: true,
    } as T
  }

  if (endpoint === '/api/v1/admin/crew-gates' && method === 'GET') {
    const store = useMockStore.getState()
    const crewMembers = [
      ...store.counterStaff.map((cs: ICounterStaff) => {
        const user = store.users.find((u: IUser) => u.id === cs.userId)
        return {
          id: cs.id, name: user?.name || 'Unknown', email: user?.email || '', phone: user?.phone || '',
          role: cs.status === 'active' ? 'SCANNER_CREW' : 'REDEEM_CREW',
          assignedGate: null, assignedStation: cs.counterId, status: cs.status === 'active' ? 'active' : 'inactive',
          lastActive: cs.assignedAt,
        }
      }),
      ...store.gateStaff.map((gs: IGateStaff) => {
        const user = store.users.find((u: IUser) => u.id === gs.userId)
        const gate = store.gates.find((g: IGate) => g.id === gs.gateId)
        return {
          id: gs.id, name: user?.name || 'Unknown', email: user?.email || '', phone: user?.phone || '',
          role: 'VERIFICATION_ADMIN' as const, assignedGate: gate?.name || gs.gateId,
          assignedStation: gs.gateId, status: gs.status === 'active' ? 'active' : 'inactive',
          lastActive: gs.assignedAt,
        }
      }),
    ]
    const gateConfigs = store.gates.map((gate: IGate) => {
      const assignedScanner = store.gateStaff.find((gs: IGateStaff) => gs.gateId === gate.id)
      const scannerUser = assignedScanner ? store.users.find((u: IUser) => u.id === assignedScanner.userId) : null
      return {
        id: gate.id, name: gate.name, type: gate.type, location: gate.location || '',
        minAccessLevel: gate.minAccessLevel || 'festival', capacityPerMinute: gate.capacityPerMin,
        currentScanner: scannerUser?.name || null, isActive: gate.status === 'active',
      }
    })
    return { crew: crewMembers, gates: gateConfigs } as T
  }

  if (endpoint === '/api/v1/admin/live-monitor' && method === 'GET') {
    const store = useMockStore.getState()
    const liveStats = store.getLiveStats()
    const gates = params?.eventId ? store.gates.filter((g: IGate) => g.eventId === params.eventId) : store.gates
    const gateBreakdown = gates.map((gate: IGate) => {
      const gateGateLogs = store.gateLogs.filter((gl: IGateLog) => gl.gateId === gate.id)
      return {
        gateId: gate.id, gateName: gate.name, gateType: gate.type, status: gate.status,
        entries: gateGateLogs.filter((gl: IGateLog) => gl.action === 'entry').length,
        exits: gateGateLogs.filter((gl: IGateLog) => gl.action === 'exit').length,
        denials: gateGateLogs.filter((gl: IGateLog) => gl.action === 'denied').length,
        totalScans: gateGateLogs.length,
        currentThroughput: Math.floor(Math.random() * 50),
      }
    })
    return { ...liveStats, gateBreakdown, timestamp: new Date().toISOString() } as T
  }

  // PATCH /api/v1/admin/tickets/:ticketId/cancel
  if (method === 'PATCH') {
    const cancelTicketMatch = matchRoute('/api/v1/admin/tickets/:ticketId/cancel', endpoint)
    if (cancelTicketMatch) {
      await mockDelay()
      useMockStore.getState().cancelTicket(cancelTicketMatch.ticketId)
      return undefined as T
    }
  }

  // POST /api/v1/admin/tickets/expire-pending
  if (endpoint === '/api/v1/admin/tickets/expire-pending' && method === 'POST') {
    await mockDelay()
    return useMockStore.getState().expirePendingTickets() as T
  }

  // ─── NOTIFICATIONS (3 endpoints) ────────────────────────────────────────

  if (endpoint === '/api/v1/notifications' && method === 'GET') {
    const store = useMockStore.getState()
    const user = getCurrentUser()
    let notifications = [...store.notifications]
    if (user) notifications = notifications.filter((n: INotification) => n.userId === user.id)
    if (params?.unread === 'true') notifications = notifications.filter((n: INotification) => !n.isRead)
    notifications.sort((a: INotification, b: INotification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const { page, perPage } = extractPagination(params)
    return paginate(notifications, page, perPage) as T
  }

  if (method === 'PATCH') {
    const notifMatch = matchRoute('/api/v1/notifications/:id/read', endpoint)
    if (notifMatch) {
      await mockDelay()
      useMockStore.getState().markNotificationRead(notifMatch.id)
      return undefined as T
    }
  }

  if (endpoint === '/api/v1/notifications/read-all' && method === 'POST') {
    await mockDelay()
    const user = getCurrentUser()
    useMockStore.getState().markAllNotificationsRead(user?.id || '')
    return undefined as T
  }

  // ─── COUPON ENDPOINTS (5 endpoints) ────────────────────────────────────

  // GET /api/v1/admin/coupons
  if (endpoint === '/api/v1/admin/coupons' && method === 'GET') {
    const store = useMockStore.getState()
    let coupons = [...store.coupons]
    if (params?.scope) coupons = coupons.filter((c: ICoupon) => c.scope === params.scope)
    if (params?.status) coupons = coupons.filter((c: ICoupon) => c.status === params.status)
    if (params?.eventId) coupons = coupons.filter((c: ICoupon) => c.scope === 'global' || c.eventId === params.eventId)
    const { page, perPage } = extractPagination(params)
    return paginate(coupons, page, perPage) as T
  }

  // POST /api/v1/admin/coupons
  if (endpoint === '/api/v1/admin/coupons' && method === 'POST') {
    await mockDelay()
    const b = body as Record<string, unknown>
    const now = new Date().toISOString()
    const coupon: ICoupon = {
      id: `coupon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      code: String(b.code || '').toUpperCase(),
      name: String(b.name || ''),
      description: b.description ? String(b.description) : undefined,
      discountType: (b.discountType as ICoupon['discountType']) || 'nominal',
      discountValue: Number(b.discountValue || 0),
      maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : undefined,
      scope: (b.scope as ICoupon['scope']) || 'global',
      eventId: b.eventId ? String(b.eventId) : undefined,
      categoryConfigs: (b.categoryConfigs as ICoupon['categoryConfigs']) || [],
      usageLimit: Number(b.usageLimit || 1000),
      usageLimitPerUser: Number(b.usageLimitPerUser || 1),
      usedCount: 0,
      status: (b.status as ICoupon['status']) || 'active',
      startsAt: String(b.startsAt || now),
      expiresAt: String(b.expiresAt || ''),
      organizerId: String(b.organizerId || ''),
      tenantId: String(b.tenantId || ''),
      createdAt: now,
      updatedAt: now,
    }
    useMockStore.getState().addCoupon(coupon)
    return coupon as T
  }

  // PUT /api/v1/admin/coupons/:id
  if (method === 'PUT') {
    const couponUpdateMatch = matchRoute('/api/v1/admin/coupons/:id', endpoint)
    if (couponUpdateMatch) {
      await mockDelay()
      const b = body as Record<string, unknown>
      useMockStore.getState().updateCoupon(couponUpdateMatch.id, b as Partial<ICoupon>)
      const updated = useMockStore.getState().coupons.find((c: ICoupon) => c.id === couponUpdateMatch.id)
      return updated as T
    }
  }

  // DELETE /api/v1/admin/coupons/:id
  if (method === 'DELETE') {
    const couponDeleteMatch = matchRoute('/api/v1/admin/coupons/:id', endpoint)
    if (couponDeleteMatch) {
      await mockDelay()
      useMockStore.getState().deleteCoupon(couponDeleteMatch.id)
      return { success: true } as T
    }
  }

  // POST /api/v1/coupons/validate
  if (endpoint === '/api/v1/coupons/validate' && method === 'POST') {
    await mockDelay()
    const b = body as Record<string, unknown>
    const user = getCurrentUser()
    const result = useMockStore.getState().applyCoupon(
      String(b.code || ''),
      user?.id || '',
      String(b.orderId || ''),
      Number(b.subtotal || 0),
      b.category ? String(b.category) : undefined,
    )
    return result as T
  }

  // ─── NO MATCH FOUND ─────────────────────────────────────────────────────

  console.warn(`[Mock] No handler for ${method} ${endpoint}`)
  throw new Error(`[Mock] Unhandled endpoint: ${method} ${endpoint}`)
}

// ─── ANALYTICS HELPER FUNCTIONS ─────────────────────────────────────────────

function generateHourlyData(store: ReturnType<typeof useMockStore.getState>): Array<{
  hour: string; orders: number; redemptions: number; gateEntries: number
}> {
  const hours: Array<{ hour: string; orders: number; redemptions: number; gateEntries: number }> = []
  for (let h = 8; h <= 23; h++) {
    const hourStr = `${h.toString().padStart(2, '0')}:00`
    const baseMultiplier = Math.sin((h - 8) / 15 * Math.PI)
    hours.push({
      hour: hourStr,
      orders: Math.floor(Math.random() * 50 * baseMultiplier + 5),
      redemptions: Math.floor(Math.random() * 30 * baseMultiplier + 2),
      gateEntries: Math.floor(Math.random() * 40 * baseMultiplier + 3),
    })
  }
  return hours
}

function generateTicketTypeBreakdown(store: ReturnType<typeof useMockStore.getState>): Array<{
  ticketTypeId: string; name: string; totalSold: number; totalRevenue: number; tier: string; zone?: string
}> {
  return store.ticketTypes.map((tt: ITicketType) => {
    const sold = store.tickets.filter(
      (t: ITicket) => t.ticketTypeId === tt.id && ['active', 'redeemed', 'inside', 'outside'].includes(t.status)
    ).length
    return {
      ticketTypeId: tt.id, name: tt.name, totalSold: sold, totalRevenue: sold * tt.price,
      tier: tt.tier, zone: tt.zone,
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
}
