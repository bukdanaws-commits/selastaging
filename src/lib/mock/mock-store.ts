'use client'

import { create } from 'zustand'

import type {
  IUser,
  IEvent,
  ITicketType,
  IOrder,
  IOrderItem,
  ITicket,
  ICounter,
  IGate,
  IRedemption,
  IGateLog,
  IWristbandInventory,
  INotification,
  ICounterStaff,
  IGateStaff,
  IOrganizerBankAccount,
  IWithdrawalRequest,
  IOrganizerBalance,
  IOrganizerFeeConfig,
  IPaymentLog,
  ICoupon,
  ICouponUsage,
  TicketStatus,
  OrderStatus,
  GateAction,
  IRedeemTicketResponse,
  IGateScanResponse,
  ICheckTicketResponse,
  ICreateOrderRequest,
  ICreatePaymentResponse,
  IPaymentStatus,
  IDashboardKPIs,
  ILiveStats,
  ShiftType,
  WithdrawalStatus,
  DokuPaymentType,
} from '@/lib/types'

import { generateAllMockData } from './mock-data'

// ─── EVENT BUS FOR STATE CHANGE NOTIFICATIONS (SSE) ─────────────────────────

const stateChangeListeners = new Set<() => void>()

export function onMockStateChange(listener: () => void): () => void {
  stateChangeListeners.add(listener)
  return () => {
    stateChangeListeners.delete(listener)
  }
}

function notifyStateChange(): void {
  stateChangeListeners.forEach((fn) => fn())
}

// ─── ID GENERATION ──────────────────────────────────────────────────────────

function generateId(entity: string): string {
  return `mock-${entity}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── MOCK ALL DATA SHAPE (returned by generateAllMockData) ──────────────────

export interface IMockAllData {
  users: IUser[]
  events: IEvent[]
  ticketTypes: ITicketType[]
  orders: IOrder[]
  orderItems: IOrderItem[]
  tickets: ITicket[]
  counters: ICounter[]
  gates: IGate[]
  redemptions: IRedemption[]
  gateLogs: IGateLog[]
  wristbands: IWristbandInventory[]
  notifications: INotification[]
  counterStaff: ICounterStaff[]
  gateStaff: IGateStaff[]
  bankAccounts: IOrganizerBankAccount[]
  withdrawals: IWithdrawalRequest[]
  balances: IOrganizerBalance[]
  organizerFeeConfigs: IOrganizerFeeConfig[]
  paymentLogs: IPaymentLog[]
  coupons: ICoupon[]
  couponUsages: ICouponUsage[]
}

// ─── EXTENDED DASHBOARD TYPES ───────────────────────────────────────────────

interface SalesByTier {
  name: string
  terjual: number
  quota: number
  revenue: number
  percentage: number
}

interface RevenueChartPoint {
  date: string
  revenue: number
  orders: number
}

interface PaymentMethodBreakdown {
  method: string
  count: number
  percentage: number
}

interface IDashboardKPIsFull extends IDashboardKPIs {
  salesByTier: SalesByTier[]
  revenueChartData: RevenueChartPoint[]
  paymentMethodBreakdown: PaymentMethodBreakdown[]
}

// ─── STATE INTERFACE ────────────────────────────────────────────────────────

export interface MockState {
  // All entity arrays
  users: IUser[]
  events: IEvent[]
  ticketTypes: ITicketType[]
  orders: IOrder[]
  tickets: ITicket[]
  counters: ICounter[]
  gates: IGate[]
  redemptions: IRedemption[]
  gateLogs: IGateLog[]
  wristbands: IWristbandInventory[]
  notifications: INotification[]
  counterStaff: ICounterStaff[]
  gateStaff: IGateStaff[]
  // Withdrawal & Balance
  bankAccounts: IOrganizerBankAccount[]
  withdrawals: IWithdrawalRequest[]
  balances: IOrganizerBalance[]
  organizerFeeConfigs: IOrganizerFeeConfig[]
  paymentLogs: IPaymentLog[]

  // Coupons
  coupons: ICoupon[]
  couponUsages: ICouponUsage[]

  // Initialization
  isInitialized: boolean
  initialize: () => void

  // Core mutation actions
  redeemTicket: (
    ticketCode: string,
    counterId: string,
    staffId: string,
    wristbandCode: string
  ) => IRedeemTicketResponse
  scanGate: (
    ticketCode: string,
    gateId: string,
    staffId: string,
    action: GateAction
  ) => IGateScanResponse
  checkTicket: (ticketCode: string) => ICheckTicketResponse
  cancelTicket: (ticketId: string) => void
  cancelOrder: (orderId: string) => void
  expirePendingTickets: () => { count: number }
  createOrder: (data: ICreateOrderRequest) => IOrder
  createPayment: (orderId: string, paymentType: string) => ICreatePaymentResponse
  getPaymentStatus: (orderId: string) => IPaymentStatus
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void

  // Withdrawal mutations
  requestWithdrawal: (organizerId: string, eventId: string, amount: number, bankAccountId: string) => IWithdrawalRequest
  approveWithdrawal: (wdId: string, approvedBy: string, method: 'AUTO_DOKU' | 'MANUAL') => void
  rejectWithdrawal: (wdId: string, rejectedBy: string, reason: string) => void
  uploadTransferProof: (wdId: string, proofUrl: string, note: string) => void
  checkDokuStatus: (wdId: string) => void
  confirmWithdrawal: (wdId: string) => void
  disputeWithdrawal: (wdId: string, reason: string) => void
  cancelWithdrawal: (wdId: string) => void

  // Bank account mutations
  addBankAccount: (organizerId: string, bankName: string, accountNumber: string, accountHolder: string) => IOrganizerBankAccount
  verifyBankAccount: (accountId: string) => void

  // Fee & organizer mutations
  setOrganizerFee: (organizerId: string, feePercent: number, isApproved?: boolean) => void
  approveOrganizerFee: (organizerId: string, isApproved: boolean) => void
  approveOrganizer: (organizerId: string) => void

  // Balance update
  updateBalance: (eventId: string) => void

  // Coupon mutations
  addCoupon: (coupon: ICoupon) => void
  updateCoupon: (id: string, data: Partial<ICoupon>) => void
  deleteCoupon: (id: string) => void
  applyCoupon: (code: string, userId: string, orderId: string, subtotal: number, category?: string) => { valid: boolean; discountAmount: number; message?: string; coupon?: ICoupon }

  // Query helpers (read-only)
  getTicketsByStatus: (status: TicketStatus) => ITicket[]
  getOrdersByStatus: (status: OrderStatus) => IOrder[]
  getRedemptionsByCounter: (counterId: string) => IRedemption[]
  getGateLogsByGate: (gateId: string) => IGateLog[]
  getUserOrders: (userId: string) => IOrder[]
  getUserTickets: (userId: string) => ITicket[]
  getDashboardKPIs: () => IDashboardKPIsFull
  getLiveStats: () => ILiveStats
  getWithdrawalsByOrganizer: (organizerId: string) => IWithdrawalRequest[]
  getPendingWithdrawals: () => IWithdrawalRequest[]
  getBankAccount: (organizerId: string) => IOrganizerBankAccount | undefined
  getPaymentLogs: (eventId: string) => IPaymentLog[]
  getOrganizerBalance: (organizerId: string, eventId: string) => IOrganizerBalance | undefined
  getPlatformRevenue: () => number
}

// ─── STORE ──────────────────────────────────────────────────────────────────

export const useMockStore = create<MockState>((set, get) => ({
  // ─── INITIAL STATE ──────────────────────────────────────────────────────
  users: [],
  events: [] as IEvent[],
  ticketTypes: [],
  orders: [],
  tickets: [],
  counters: [],
  gates: [],
  redemptions: [],
  gateLogs: [],
  wristbands: [],
  notifications: [],
  counterStaff: [],
  gateStaff: [],
  bankAccounts: [],
  withdrawals: [],
  balances: [],
  organizerFeeConfigs: [],
  paymentLogs: [],
  coupons: [],
  couponUsages: [],
  isInitialized: false,

  // ─── INITIALIZE ─────────────────────────────────────────────────────────
  initialize: () => {
    if (get().isInitialized) return

    const data = generateAllMockData()

    // Generate counter staff assignments from COUNTER_STAFF users
    const counterStaffUsers = data.users.filter(u => u.role === 'COUNTER_STAFF')
    const counterStaff: ICounterStaff[] = counterStaffUsers.map((user, i) => ({
      id: `cs-${user.id}`,
      tenantId: data.events[0].tenantId,
      userId: user.id,
      counterId: data.counters[i % data.counters.length]?.id || data.counters[0]?.id || '',
      shift: (i % 3 === 0 ? 'pagi' : i % 3 === 1 ? 'siang' : 'malam') as ShiftType,
      status: 'active',
      assignedAt: data.events[0].createdAt,
      user,
      counter: data.counters[i % data.counters.length],
    }))

    // Generate gate staff assignments from GATE_STAFF users
    const gateStaffUsers = data.users.filter(u => u.role === 'GATE_STAFF')
    const gateStaff: IGateStaff[] = gateStaffUsers.map((user, i) => ({
      id: `gs-${user.id}`,
      tenantId: data.events[0].tenantId,
      userId: user.id,
      gateId: data.gates[i % data.gates.length]?.id || data.gates[0]?.id || '',
      shift: (i % 3 === 0 ? 'pagi' : i % 3 === 1 ? 'siang' : 'malam') as ShiftType,
      status: 'active',
      assignedAt: data.events[0].createdAt,
      user,
      gate: data.gates[i % data.gates.length],
    }))

    set({
      users: data.users,
      events: data.events,
      ticketTypes: data.ticketTypes,
      orders: data.orders,
      tickets: data.tickets,
      counters: data.counters,
      gates: data.gates,
      redemptions: data.redemptions,
      gateLogs: data.gateLogs,
      wristbands: data.wristbandInventory,
      notifications: data.notifications,
      counterStaff,
      gateStaff,
      bankAccounts: data.bankAccounts,
      withdrawals: data.withdrawals,
      balances: data.balances,
      organizerFeeConfigs: data.organizerFeeConfigs,
      paymentLogs: data.paymentLogs,
      coupons: data.coupons,
      couponUsages: data.couponUsages,
      isInitialized: true,
    })

    notifyStateChange()
  },

  // ─── MUTATION: REDEEM TICKET ────────────────────────────────────────────
  redeemTicket: (ticketCode, counterId, staffId, wristbandCode) => {
    const state = get()
    const ticket = state.tickets.find((t) => t.ticketCode === ticketCode)

    if (!ticket) {
      return { success: false, wristbandColor: '', wristbandType: '', ticketTypeName: '', attendeeName: '', error: 'Tiket tidak ditemukan' }
    }

    if (ticket.status === 'redeemed' || ticket.status === 'inside' || ticket.status === 'outside') {
      const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
      return { success: false, wristbandColor: '', wristbandType: '', ticketTypeName: tt?.name || '', attendeeName: ticket.attendeeName, error: 'Tiket sudah ditukar' }
    }

    if (ticket.status === 'cancelled' || ticket.status === 'expired') {
      const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
      return { success: false, wristbandColor: '', wristbandType: '', ticketTypeName: tt?.name || '', attendeeName: ticket.attendeeName, error: `Tiket sudah ${ticket.status === 'cancelled' ? 'dibatalkan' : 'kadaluarsa'}` }
    }

    if (ticket.status !== 'active') {
      const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
      return { success: false, wristbandColor: '', wristbandType: '', ticketTypeName: tt?.name || '', attendeeName: ticket.attendeeName, error: 'Tiket belum aktif (belum dibayar)' }
    }

    const wb = state.wristbands[0] || { color: 'Merah', colorHex: '#EF4444', type: 'VIP' }
    const now = new Date().toISOString()

    const redemption: IRedemption = {
      id: generateId('redemption'),
      tenantId: state.events[0].tenantId,
      ticketId: ticket.id,
      counterId,
      staffId,
      wristbandCode,
      wristbandColor: wb.color,
      wristbandType: wb.type,
      redeemedAt: now,
    }

    const updatedTickets = state.tickets.map((t) =>
      t.id === ticket.id ? { ...t, status: 'redeemed' as TicketStatus, redeemedAt: now, redeemedBy: staffId, wristbandCode, updatedAt: now } : t
    )

    const updatedWristbands = state.wristbands.map((w) =>
      w.id === wb.id ? { ...w, usedStock: w.usedStock + 1, remainingStock: w.remainingStock - 1, updatedAt: now } : w
    )

    const order = state.orders.find((o) => o.id === ticket.orderId)
    let updatedOrders = state.orders
    if (order) {
      const allTicketsRedeemed = state.tickets
        .filter((t) => t.orderId === order.id && t.id !== ticket.id)
        .every((t) => t.status === 'redeemed' || t.status === 'inside' || t.status === 'outside')
      if (allTicketsRedeemed) {
        updatedOrders = state.orders.map((o) => o.id === order.id ? { ...o, updatedAt: now } : o)
      }
    }

    set({ tickets: updatedTickets, redemptions: [...state.redemptions, redemption], wristbands: updatedWristbands, orders: updatedOrders })
    notifyStateChange()

    const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
    return { success: true, redemption, wristbandColor: wb.color, wristbandType: wb.type, ticketTypeName: tt?.name || '', attendeeName: ticket.attendeeName }
  },

  // ─── MUTATION: SCAN GATE ────────────────────────────────────────────────
  scanGate: (ticketCode, gateId, staffId, action) => {
    const state = get()
    const ticket = state.tickets.find((t) => t.ticketCode === ticketCode)

    if (!ticket) {
      return { success: false, action: 'error' as GateAction, ticketCode, attendeeName: '', ticketTypeName: '', reentryCount: 0, error: 'Tiket tidak ditemukan' }
    }

    if (ticket.status === 'pending' || ticket.status === 'active') {
      const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
      return { success: false, action: 'denied' as GateAction, ticketCode, attendeeName: ticket.attendeeName, ticketTypeName: tt?.name || '', reentryCount: 0, previousAction: undefined, error: 'Tiket belum ditukar gelang' }
    }

    if (ticket.status === 'cancelled' || ticket.status === 'expired') {
      const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
      return { success: false, action: 'denied' as GateAction, ticketCode, attendeeName: ticket.attendeeName, ticketTypeName: tt?.name || '', reentryCount: 0, error: `Tiket sudah ${ticket.status === 'cancelled' ? 'dibatalkan' : 'kadaluarsa'}` }
    }

    const now = new Date().toISOString()
    let newStatus: TicketStatus = ticket.status
    let actualAction: GateAction = action
    let reentryCount = 0
    let previousAction: GateAction | undefined = undefined

    const prevLog = [...state.gateLogs].reverse().find((gl) => gl.ticketId === ticket.id)
    if (prevLog) {
      previousAction = prevLog.action
    }

    if (action === 'entry') {
      if (ticket.status === 'inside') {
        const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
        return { success: false, action: 'denied' as GateAction, ticketCode, attendeeName: ticket.attendeeName, ticketTypeName: tt?.name || '', reentryCount: 0, previousAction, error: 'Sudah di dalam venue' }
      }
      if (ticket.status === 'outside') reentryCount = 1
      newStatus = 'inside'
      actualAction = 'entry'
    } else if (action === 'exit') {
      if (ticket.status !== 'inside') {
        const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
        return { success: false, action: 'denied' as GateAction, ticketCode, attendeeName: ticket.attendeeName, ticketTypeName: tt?.name || '', reentryCount: 0, previousAction, error: 'Tidak sedang di dalam venue' }
      }
      newStatus = 'outside'
      actualAction = 'exit'
    } else {
      actualAction = 'error'
    }

    const gateLog: IGateLog = {
      id: generateId('gatelog'),
      tenantId: state.events[0].tenantId,
      eventId: state.events[0].id,
      ticketId: ticket.id,
      gateId,
      staffId,
      action: actualAction,
      scannedAt: now,
    }

    const updatedTickets = state.tickets.map((t) =>
      t.id === ticket.id ? { ...t, status: newStatus, updatedAt: now } : t
    )

    set({ tickets: updatedTickets, gateLogs: [...state.gateLogs, gateLog] })
    notifyStateChange()

    const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)
    return { success: true, action: actualAction, ticketCode, attendeeName: ticket.attendeeName, ticketTypeName: tt?.name || '', reentryCount, previousAction }
  },

  // ─── MUTATION: CHECK TICKET ─────────────────────────────────────────────
  checkTicket: (ticketCode) => {
    const state = get()
    const ticket = state.tickets.find((t) => t.ticketCode === ticketCode)

    if (!ticket) {
      return { found: false, error: 'Tiket tidak ditemukan' } as ICheckTicketResponse
    }

    const tt = state.ticketTypes.find((t) => t.id === ticket.ticketTypeId)

    let wristbandColor: string | undefined
    if (ticket.wristbandCode) {
      const redemption = state.redemptions.find((r) => r.ticketId === ticket.id)
      wristbandColor = redemption?.wristbandColor
    }

    return {
      found: true,
      ticket: {
        ticketCode: ticket.ticketCode,
        ticketTypeName: ticket.ticketTypeName || tt?.name || '',
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        seatLabel: ticket.seatLabel,
        status: ticket.status,
        redeemedAt: ticket.redeemedAt,
        wristbandCode: ticket.wristbandCode,
        wristbandColor,
        price: tt?.price || 0,
        eventName: state.events[0].title || '',
        eventDate: state.events[0].date || '',
      },
    }
  },

  // ─── MUTATION: CANCEL TICKET ────────────────────────────────────────────
  cancelTicket: (ticketId) => {
    const state = get()
    const now = new Date().toISOString()
    const ticket = state.tickets.find((t) => t.id === ticketId)
    if (!ticket) return
    if (ticket.status !== 'active' && ticket.status !== 'pending') return

    const updatedTickets = state.tickets.map((t) =>
      t.id === ticketId ? { ...t, status: 'cancelled' as TicketStatus, updatedAt: now } : t
    )
    const updatedTicketTypes = state.ticketTypes.map((tt) =>
      tt.id === ticket.ticketTypeId ? { ...tt, sold: Math.max(0, tt.sold - 1), updatedAt: now } : tt
    )

    set({ tickets: updatedTickets, ticketTypes: updatedTicketTypes })
    notifyStateChange()
  },

  // ─── MUTATION: CANCEL ORDER ─────────────────────────────────────────────
  cancelOrder: (orderId) => {
    const state = get()
    const now = new Date().toISOString()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order) return
    if (order.status !== 'pending' && order.status !== 'paid') return

    const orderTickets = state.tickets.filter((t) => t.orderId === orderId)
    const cancellableStatuses: TicketStatus[] = ['pending', 'active']

    const updatedOrders = state.orders.map((o) =>
      o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus, updatedAt: now } : o
    )
    const updatedTickets = state.tickets.map((t) =>
      t.orderId === orderId && cancellableStatuses.includes(t.status) ? { ...t, status: 'cancelled' as TicketStatus, updatedAt: now } : t
    )

    const updatedTicketTypes = [...state.ticketTypes]
    for (const t of orderTickets) {
      if (cancellableStatuses.includes(t.status)) {
        const idx = updatedTicketTypes.findIndex((tt) => tt.id === t.ticketTypeId)
        if (idx >= 0) {
          updatedTicketTypes[idx] = { ...updatedTicketTypes[idx], sold: Math.max(0, updatedTicketTypes[idx].sold - 1), updatedAt: now }
        }
      }
    }

    set({ orders: updatedOrders, tickets: updatedTickets, ticketTypes: updatedTicketTypes })
    notifyStateChange()
  },

  // ─── MUTATION: EXPIRE PENDING TICKETS ───────────────────────────────────
  expirePendingTickets: () => {
    const state = get()
    const now = new Date()

    const ticketsToExpire = state.tickets.filter((t) => {
      if (t.status !== 'pending') return false
      const order = state.orders.find((o) => o.id === t.orderId)
      if (!order || !order.expiresAt) return false
      return new Date(order.expiresAt) < now
    })

    if (ticketsToExpire.length === 0) return { count: 0 }

    const expireIds = new Set(ticketsToExpire.map((t) => t.id))
    const updatedNow = now.toISOString()
    const affectedOrderIds = new Set(ticketsToExpire.map((t) => t.orderId))

    const updatedTickets = state.tickets.map((t) =>
      expireIds.has(t.id) ? { ...t, status: 'expired' as TicketStatus, updatedAt: updatedNow } : t
    )

    const updatedOrders = state.orders.map((o) => {
      if (!affectedOrderIds.has(o.id)) return o
      if (o.status !== 'pending') return o
      const allExpired = state.tickets.filter((t) => t.orderId === o.id).every((t) => t.status === 'expired' || expireIds.has(t.id))
      if (allExpired) return { ...o, status: 'expired' as OrderStatus, updatedAt: updatedNow }
      return o
    })

    set({ tickets: updatedTickets, orders: updatedOrders })
    notifyStateChange()
    return { count: ticketsToExpire.length }
  },

  // ─── MUTATION: CREATE ORDER ─────────────────────────────────────────────
  createOrder: (data) => {
    const state = get()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const orderCode = `SHL-JKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`

    let subTotal = 0
    const items: IOrderItem[] = []
    const tickets: ITicket[] = []

    for (const item of data.items) {
      const tt = state.ticketTypes.find((t) => t.id === item.ticketTypeId)
      if (!tt) continue
      if (tt.sold + item.quantity > tt.quota) continue

      const subtotal = tt.price * item.quantity
      subTotal += subtotal

      const orderItemId = generateId('orderitem')

      items.push({
        id: orderItemId,
        tenantId: state.events[0].tenantId || 'tenant-1',
        orderId: '',
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        pricePerTicket: tt.price,
        subtotal,
        ticketType: tt,
      })

      for (let i = 0; i < item.quantity; i++) {
        const ticketCode = `SHL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
        tickets.push({
          id: generateId('ticket'),
          tenantId: state.events[0].tenantId || 'tenant-1',
          eventId: data.eventId,
          ticketCode,
          orderId: '',
          ticketTypeId: item.ticketTypeId,
          attendeeName: item.attendeeName,
          attendeeEmail: item.attendeeEmail,
          qrData: ticketCode,
          status: 'pending',
          eventTitle: state.events[0].title || '',
          ticketTypeName: tt.name,
          createdAt: now,
          updatedAt: now,
        })
      }

      const ttIdx = state.ticketTypes.findIndex((t) => t.id === item.ticketTypeId)
      if (ttIdx >= 0) {
        state.ticketTypes[ttIdx] = { ...state.ticketTypes[ttIdx], sold: state.ticketTypes[ttIdx].sold + item.quantity, updatedAt: now }
      }
    }

    // Calculate fees and tax
    const adminFee = Math.round(subTotal * 0.02) // 2% platform fee
    const taxAmount = Math.round(subTotal * 0.11) // 11% PPN

    // Calculate coupon discount if provided
    let discountAmount = 0
    let couponId: string | undefined
    if (data.couponCode) {
      const coupon = state.coupons.find(c => c.code.toUpperCase() === data.couponCode!.toUpperCase())
      if (coupon && coupon.status === 'active') {
        couponId = coupon.id
        if (coupon.discountType === 'percentage') {
          discountAmount = Math.round(subTotal * coupon.discountValue / 100)
          if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount
          }
        } else {
          discountAmount = Math.round(coupon.discountValue)
        }
        // Don't exceed subtotal
        discountAmount = Math.min(discountAmount, subTotal)
      }
    }

    // Use provided values if available, otherwise use calculated
    const finalSubTotal = data.subTotal ?? subTotal
    const finalAdminFee = data.adminFee ?? adminFee
    const finalTaxAmount = data.taxAmount ?? taxAmount
    const finalDiscountAmount = data.discountAmount ?? discountAmount

    const totalAmount = Math.max(0, finalSubTotal + finalAdminFee + finalTaxAmount - finalDiscountAmount)

    const orderId = generateId('order')
    const finalItems = items.map((item) => ({ ...item, orderId }))
    const finalTickets = tickets.map((t) => ({ ...t, orderId }))

    const order: IOrder = {
      id: orderId,
      tenantId: state.events[0].tenantId || 'tenant-1',
      orderCode,
      userId: 'user-participant',
      eventId: data.eventId,
      totalAmount,
      subTotal: finalSubTotal,
      adminFee: finalAdminFee,
      taxAmount: finalTaxAmount,
      discountAmount: finalDiscountAmount,
      couponId,
      status: 'pending',
      expiresAt,
      items: finalItems,
      tickets: finalTickets,
      createdAt: now,
      updatedAt: now,
    }

    // If coupon was applied, record usage
    if (data.couponCode && couponId && discountAmount > 0) {
      const couponUsage: ICouponUsage = {
        id: generateId('couponusage'),
        couponId,
        userId: 'user-participant',
        orderId,
        discountAmount: finalDiscountAmount,
        createdAt: now,
      }
      // Increment coupon usedCount
      const updatedCoupons = state.coupons.map(c =>
        c.id === couponId ? { ...c, usedCount: c.usedCount + 1 } : c
      )
      set({
        orders: [...state.orders, order],
        tickets: [...state.tickets, ...finalTickets],
        ticketTypes: [...state.ticketTypes],
        coupons: updatedCoupons,
        couponUsages: [...state.couponUsages, couponUsage],
      })
    } else {
      set({ orders: [...state.orders, order], tickets: [...state.tickets, ...finalTickets], ticketTypes: [...state.ticketTypes] })
    }
    notifyStateChange()
    return order
  },

  // ─── MUTATION: CREATE PAYMENT (DOKU-style) ─────────────────────────────
  createPayment: (orderId, paymentType) => {
    const state = get()
    const order = state.orders.find((o) => o.id === orderId)

    if (!order) {
      return { paymentUrl: '', paymentType: '', error: 'Order tidak ditemukan' } as unknown as ICreatePaymentResponse
    }

    const dokuTxnId = `DKU-TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()

    // Determine payment channel based on type
    let paymentChannel = 'VIRTUAL_ACCOUNT_BCA'
    let paymentMethod = 'VA-BCA'
    let vaNumber: string | undefined
    let qrUrl: string | undefined
    let qrContent: string | undefined

    if (paymentType === 'virtual_account') {
      paymentChannel = 'VIRTUAL_ACCOUNT_BCA'
      paymentMethod = 'VA-BCA'
      vaNumber = `8800${Math.random().toString().slice(2, 14)}`
    } else if (paymentType === 'qris') {
      paymentChannel = 'QRIS'
      paymentMethod = 'QRIS'
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SELEEVENT-DOKU-${dokuTxnId.slice(-8)}`
      qrContent = `SELEEVENT-DOKU-${dokuTxnId.slice(-8)}`
    } else if (paymentType === 'ewallet') {
      paymentChannel = 'EMONEY_DANA'
      paymentMethod = 'EWALLET-DANA'
    } else if (paymentType === 'credit_card') {
      paymentChannel = 'CREDIT_CARD'
      paymentMethod = 'CC-Visa'
    } else if (paymentType === 'convenience_store') {
      paymentChannel = 'ONLINE_TO_OFFLINE_ALFA'
      paymentMethod = 'ALFAMART'
    }

    const dokuCheckoutUrl = `https://checkout-sandbox.doku.com/${dokuTxnId}`

    const updatedOrders = state.orders.map((o) =>
      o.id === orderId ? { ...o, paymentType, paymentMethod, paymentChannel, dokuTransactionId: dokuTxnId, updatedAt: now } : o
    )

    set({ orders: updatedOrders })

    // Simulate payment success after 2 seconds
    setTimeout(() => {
      const currentState = get()
      const paidAt = new Date().toISOString()

      const ordersNow = currentState.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'paid' as OrderStatus, paidAt, updatedAt: paidAt } : o
      )

      const ticketsNow = currentState.tickets.map((t) =>
        t.orderId === orderId && t.status === 'pending' ? { ...t, status: 'active' as TicketStatus, updatedAt: paidAt } : t
      )

      // Add payment log
      const paymentLog: IPaymentLog = {
        id: `mock-plog-${orderId}`,
        eventId: currentState.events[0].id,
        orderId,
        orderCode: order.orderCode,
        transactionId: dokuTxnId,
        paymentMethod,
        paymentChannel,
        amount: order.totalAmount,
        currency: 'IDR',
        status: 'success',
        paidAt,
        dokuResponseCode: '2002700',
        notificationReceivedAt: paidAt,
        createdAt: now,
      }

      set({
        orders: ordersNow,
        tickets: ticketsNow,
        paymentLogs: [...currentState.paymentLogs, paymentLog],
      })
      notifyStateChange()
    }, 2000)

    notifyStateChange()

    const response: ICreatePaymentResponse = {
      paymentUrl: dokuCheckoutUrl,
      paymentType,
      paymentChannel,
      vaNumber,
      qrUrl,
      qrContent,
      dokuCheckoutUrl,
      isSandbox: true,
    }

    return response
  },

  // ─── MUTATION: GET PAYMENT STATUS ───────────────────────────────────────
  getPaymentStatus: (orderId) => {
    const state = get()
    const order = state.orders.find((o) => o.id === orderId)

    if (!order) {
      return { orderId, orderStatus: 'not_found' } as IPaymentStatus
    }

    return {
      orderId,
      orderStatus: order.status,
      paymentType: order.paymentType,
      paymentChannel: order.paymentChannel,
      paidAt: order.paidAt,
      dokuTransactionId: order.dokuTransactionId,
    } as IPaymentStatus
  },

  // ─── MUTATION: MARK NOTIFICATION READ ───────────────────────────────────
  markNotificationRead: (id) => {
    const state = get()
    const now = new Date().toISOString()
    set({ notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n) })
    notifyStateChange()
  },

  // ─── MUTATION: MARK ALL NOTIFICATIONS READ ──────────────────────────────
  markAllNotificationsRead: (userId) => {
    const state = get()
    set({ notifications: state.notifications.map((n) => n.userId === userId ? { ...n, isRead: true } : n) })
    notifyStateChange()
  },

  // ─── WITHDRAWAL MUTATIONS ──────────────────────────────────────────────

  requestWithdrawal: (organizerId, eventId, amount, bankAccountId) => {
    const state = get()
    const now = new Date().toISOString()
    const balance = state.balances.find(b => b.organizerId === organizerId && b.eventId === eventId)
    const feeConfig = state.organizerFeeConfigs.find(f => f.organizerId === organizerId)
    const bankAccount = state.bankAccounts.find(b => b.id === bankAccountId)
    if (!balance || !bankAccount || amount > balance.availableBalance) {
      throw new Error('Saldo tidak mencukupi atau data tidak valid')
    }

    const fee = Math.round(amount * (feeConfig?.feePercent || 5) / 100)
    const netAmount = amount - fee
    const event = state.events[0]

    const withdrawal: IWithdrawalRequest = {
      id: generateId('withdrawal'),
      organizerId,
      organizerName: state.users.find(u => u.id === organizerId)?.name || '',
      eventId,
      eventCode: 'SHL-JKT',
      eventName: event.title || '',
      amount,
      fee,
      netAmount,
      bankAccountId,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountHolder: bankAccount.accountHolder,
      status: 'pending',
      method: 'MANUAL', // Default to MANUAL, SUPER_ADMIN sets actual method on approval
      requestedAt: now,
    }

    set({ withdrawals: [...state.withdrawals, withdrawal] })
    notifyStateChange()
    return withdrawal
  },

  approveWithdrawal: (wdId, approvedBy, method) => {
    const state = get()
    const now = new Date().toISOString()
    const wd = state.withdrawals.find(w => w.id === wdId)
    
    if (method === 'AUTO_DOKU') {
      // Auto DOKU: pending → approved → processing (DOKU API called)
      set({
        withdrawals: state.withdrawals.map(w =>
          w.id === wdId ? {
            ...w,
            status: 'processing' as WithdrawalStatus,
            method: 'AUTO_DOKU' as const,
            approvedAt: now,
            approvedBy,
            dokuDisbursementId: `DOKU-DISB-${Date.now()}`,
            dokuReferenceNo: `DOKU-REF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            dokuStatus: 'PROCESSING',
          } : w
        ),
      })
    } else {
      // Manual: pending → approved (waiting for admin to transfer manually)
      set({
        withdrawals: state.withdrawals.map(w =>
          w.id === wdId ? { ...w, status: 'approved' as WithdrawalStatus, method: 'MANUAL' as const, approvedAt: now, approvedBy } : w
        ),
      })
    }
    notifyStateChange()
  },

  rejectWithdrawal: (wdId, rejectedBy, reason) => {
    const state = get()
    const now = new Date().toISOString()
    set({
      withdrawals: state.withdrawals.map(w =>
        w.id === wdId ? { ...w, status: 'rejected' as WithdrawalStatus, rejectedAt: now, rejectedBy, rejectedReason: reason } : w
      ),
    })
    notifyStateChange()
  },

  uploadTransferProof: (wdId, proofUrl, note) => {
    const state = get()
    const now = new Date().toISOString()
    set({
      withdrawals: state.withdrawals.map(w =>
        w.id === wdId ? { ...w, status: 'transferred' as WithdrawalStatus, transferredAt: now, transferProof: proofUrl, transferNote: note } : w
      ),
    })
    notifyStateChange()
  },

  confirmWithdrawal: (wdId) => {
    const state = get()
    const now = new Date().toISOString()
    set({
      withdrawals: state.withdrawals.map(w =>
        w.id === wdId ? { ...w, status: 'completed' as WithdrawalStatus, completedAt: now } : w
      ),
    })
    // Update balance totalWithdrawn
    const wd = state.withdrawals.find(w => w.id === wdId)
    if (wd) {
      set({
        balances: state.balances.map(b =>
          b.organizerId === wd.organizerId && b.eventId === wd.eventId
            ? { ...b, totalWithdrawn: b.totalWithdrawn + wd.netAmount, availableBalance: b.availableBalance - wd.netAmount }
            : b
        ),
      })
    }
    notifyStateChange()
  },

  disputeWithdrawal: (wdId, reason) => {
    const state = get()
    set({
      withdrawals: state.withdrawals.map(w =>
        w.id === wdId ? { ...w, status: 'dispute' as WithdrawalStatus, disputeReason: reason } : w
      ),
    })
    notifyStateChange()
  },

  checkDokuStatus: (wdId) => {
    const state = get()
    const wd = state.withdrawals.find(w => w.id === wdId)
    if (wd && wd.status === 'processing' && wd.method === 'AUTO_DOKU') {
      // Simulate DOKU callback: processing → transferred
      const now = new Date().toISOString()
      set({
        withdrawals: state.withdrawals.map(w =>
          w.id === wdId ? {
            ...w,
            status: 'transferred' as WithdrawalStatus,
            transferredAt: now,
            dokuStatus: 'SUCCESS',
            transferProof: `DOKU Auto-Disbursement: ${w.dokuDisbursementId}`,
            transferNote: `Auto transfer via DOKU Disbursement (Ref: ${w.dokuReferenceNo})`,
          } : w
        ),
      })
      notifyStateChange()
    }
  },

  cancelWithdrawal: (wdId) => {
    const state = get()
    set({
      withdrawals: state.withdrawals.map(w =>
        w.id === wdId && w.status === 'pending' ? { ...w, status: 'cancelled' as WithdrawalStatus } : w
      ),
    })
    notifyStateChange()
  },

  // ─── BANK ACCOUNT MUTATIONS ────────────────────────────────────────────

  addBankAccount: (organizerId, bankName, accountNumber, accountHolder) => {
    const now = new Date().toISOString()
    const account: IOrganizerBankAccount = {
      id: generateId('bankacct'),
      organizerId,
      bankName,
      accountNumber,
      accountHolder,
      isVerified: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    const state = get()
    set({ bankAccounts: [...state.bankAccounts, account] })
    notifyStateChange()
    return account
  },

  verifyBankAccount: (accountId) => {
    const state = get()
    const now = new Date().toISOString()
    set({
      bankAccounts: state.bankAccounts.map(b =>
        b.id === accountId ? { ...b, isVerified: true, updatedAt: now } : b
      ),
    })
    notifyStateChange()
  },

  // ─── FEE & ORGANIZER MUTATIONS ─────────────────────────────────────────

  setOrganizerFee: (organizerId, feePercent, isApproved) => {
    const state = get()
    const now = new Date().toISOString()
    const existing = state.organizerFeeConfigs.find(f => f.organizerId === organizerId)
    if (existing) {
      set({
        organizerFeeConfigs: state.organizerFeeConfigs.map(f =>
          f.organizerId === organizerId ? { ...f, feePercent, isApproved: isApproved ?? false } : f
        ),
      })
    } else {
      const organizer = state.users.find(u => u.id === organizerId)
      set({
        organizerFeeConfigs: [...state.organizerFeeConfigs, {
          organizerId,
          organizerName: organizer?.name || '',
          feePercent,
          isApproved: isApproved ?? false,
          createdAt: now,
        }],
      })
    }
    notifyStateChange()
  },

  approveOrganizerFee: (organizerId, isApproved) => {
    const state = get()
    set({
      organizerFeeConfigs: state.organizerFeeConfigs.map(f =>
        f.organizerId === organizerId ? { ...f, isApproved } : f
      ),
    })
    notifyStateChange()
  },

  approveOrganizer: (organizerId) => {
    const state = get()
    set({
      organizerFeeConfigs: state.organizerFeeConfigs.map(f =>
        f.organizerId === organizerId ? { ...f, isApproved: true } : f
      ),
    })
    notifyStateChange()
  },

  // ─── BALANCE UPDATE ────────────────────────────────────────────────────

  updateBalance: (eventId) => {
    const state = get()
    const now = new Date().toISOString()
    const paidOrders = state.orders.filter(o => o.eventId === eventId && o.status === 'paid')
    const grossRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)

    set({
      balances: state.balances.map(b => {
        if (b.eventId !== eventId) return b
        const feeConfig = state.organizerFeeConfigs.find(f => f.organizerId === b.organizerId)
        const feePercent = feeConfig?.feePercent || 5
        const platformFeeAmount = Math.round(grossRevenue * feePercent / 100)
        const netRevenue = grossRevenue - platformFeeAmount
        return {
          ...b,
          grossRevenue,
          platformFeePercent: feePercent,
          platformFeeAmount,
          netRevenue,
          availableBalance: netRevenue - b.totalWithdrawn,
          updatedAt: now,
        }
      }),
    })
    notifyStateChange()
  },

  // ─── COUPON MUTATIONS ──────────────────────────────────────────────────

  addCoupon: (coupon) => {
    const state = get()
    set({ coupons: [...state.coupons, coupon] })
    notifyStateChange()
  },

  updateCoupon: (id, data) => {
    const state = get()
    const now = new Date().toISOString()
    set({
      coupons: state.coupons.map(c =>
        c.id === id ? { ...c, ...data, updatedAt: now } : c
      ),
    })
    notifyStateChange()
  },

  deleteCoupon: (id) => {
    const state = get()
    set({ coupons: state.coupons.filter(c => c.id !== id) })
    notifyStateChange()
  },

  applyCoupon: (code, userId, orderId, subtotal, category) => {
    const state = get()
    const coupon = state.coupons.find(c => c.code.toUpperCase() === code.toUpperCase())

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: 'Kupon tidak ditemukan' }
    }

    // Check status
    if (coupon.status !== 'active') {
      return { valid: false, discountAmount: 0, message: 'Kupon sudah tidak aktif' }
    }

    // Check date range
    const now = new Date()
    const startsAt = new Date(coupon.startsAt)
    const expiresAt = new Date(coupon.expiresAt)
    if (now < startsAt) {
      return { valid: false, discountAmount: 0, message: 'Kupon belum berlaku' }
    }
    if (now > expiresAt) {
      // Auto-expire the coupon
      const updatedCoupons = state.coupons.map(c =>
        c.id === coupon.id ? { ...c, status: 'expired' as const } : c
      )
      set({ coupons: updatedCoupons })
      return { valid: false, discountAmount: 0, message: 'Kupon sudah kadaluarsa' }
    }

    // Check total usage limit
    if (coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, message: 'Kupon sudah mencapai batas penggunaan' }
    }

    // Check per-user usage limit
    const userUsageCount = state.couponUsages.filter(
      u => u.couponId === coupon.id && u.userId === userId
    ).length
    if (userUsageCount >= coupon.usageLimitPerUser) {
      return { valid: false, discountAmount: 0, message: 'Anda sudah menggunakan kupon ini' }
    }

    // Calculate discount
    let discountValue = coupon.discountValue
    let minOrder = 0

    // Check category-specific config
    if (category && coupon.categoryConfigs.length > 0) {
      const catConfig = coupon.categoryConfigs.find(cc => cc.category === category)
      if (catConfig) {
        discountValue = catConfig.discountValue
        minOrder = catConfig.minOrder
      }
    }

    // Check minimum order
    if (minOrder > 0 && subtotal < minOrder) {
      return { valid: false, discountAmount: 0, message: `Minimal order Rp ${minOrder.toLocaleString('id-ID')} untuk kategori ini` }
    }

    // Calculate actual discount amount
    let discountAmount: number
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round(subtotal * discountValue / 100)
      // Apply max discount cap for percentage type
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
      }
    } else {
      // Nominal discount
      discountAmount = discountValue
    }

    // Ensure discount doesn't exceed subtotal (no negative)
    discountAmount = Math.min(discountAmount, subtotal)

    // Record usage
    const usage: ICouponUsage = {
      id: generateId('couponusage'),
      couponId: coupon.id,
      userId,
      orderId,
      discountAmount,
      createdAt: new Date().toISOString(),
    }

    const updatedCoupons = state.coupons.map(c =>
      c.id === coupon.id ? { ...c, usedCount: c.usedCount + 1 } : c
    )

    set({
      couponUsages: [...state.couponUsages, usage],
      coupons: updatedCoupons,
    })
    notifyStateChange()

    return { valid: true, discountAmount, coupon }
  },

  // ─── QUERY HELPERS ─────────────────────────────────────────────────────

  getTicketsByStatus: (status) => get().tickets.filter((t) => t.status === status),
  getOrdersByStatus: (status) => get().orders.filter((o) => o.status === status),
  getRedemptionsByCounter: (counterId) => get().redemptions.filter((r) => r.counterId === counterId),
  getGateLogsByGate: (gateId) => get().gateLogs.filter((gl) => gl.gateId === gateId),

  getUserOrders: (userId) => get().orders.filter((o) => o.userId === userId),

  getUserTickets: (userId) => {
    const state = get()
    const userOrderIds = new Set(state.orders.filter((o) => o.userId === userId).map((o) => o.id))
    return state.tickets.filter((t) => userOrderIds.has(t.orderId))
  },

  getWithdrawalsByOrganizer: (organizerId) => get().withdrawals.filter(w => w.organizerId === organizerId),
  getPendingWithdrawals: () => get().withdrawals.filter(w => w.status === 'pending'),
  getBankAccount: (organizerId) => get().bankAccounts.find(b => b.organizerId === organizerId),
  getPaymentLogs: (eventId) => get().paymentLogs.filter(p => p.eventId === eventId),

  getOrganizerBalance: (organizerId, eventId) => get().balances.find(b => b.organizerId === organizerId && b.eventId === eventId),

  getPlatformRevenue: () => {
    const state = get()
    return state.balances.reduce((sum, b) => sum + b.platformFeeAmount, 0)
  },

  // ─── QUERY: GET DASHBOARD KPIs ──────────────────────────────────────────
  getDashboardKPIs: () => {
    const state = get()
    const { tickets, orders, users, ticketTypes, events, redemptions } = state
    const event = events[0]

    const totalRevenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.totalAmount, 0)

    const excludeStatuses: TicketStatus[] = ['cancelled', 'expired']
    const totalTicketsSold = tickets.filter((t) => !excludeStatuses.includes(t.status)).length

    const totalOrders = orders.length
    const paidOrders = orders.filter((o) => o.status === 'paid').length
    const pendingOrders = orders.filter((o) => o.status === 'pending').length

    const totalUsers = users.filter((u) => u.role === 'PARTICIPANT').length
    const totalQuota = ticketTypes.reduce((sum, tt) => sum + tt.quota, 0)

    const ticketsRedeemed = tickets.filter((t) => t.status === 'redeemed').length
    const ticketsInside = tickets.filter((t) => t.status === 'inside').length

    const occupancyRate = event.capacity > 0 ? Math.round((ticketsInside / event.capacity) * 10000) / 100 : 0

    // Platform revenue from fee configs
    const platformRevenue = state.balances.reduce((sum, b) => sum + b.platformFeeAmount, 0)

    const salesByTier: SalesByTier[] = ticketTypes.map((tt) => {
      const soldForTier = tickets.filter((t) => t.ticketTypeId === tt.id && !excludeStatuses.includes(t.status)).length
      const revenue = soldForTier * tt.price
      const percentage = totalQuota > 0 ? Math.round((soldForTier / tt.quota) * 10000) / 100 : 0
      return { name: tt.name, terjual: soldForTier, quota: tt.quota, revenue, percentage }
    })

    const revenueChartData: RevenueChartPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOrders = orders.filter((o) => o.status === 'paid' && o.paidAt?.startsWith(dateStr))
      revenueChartData.push({
        date: dateStr,
        revenue: dayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
        orders: dayOrders.length,
      })
    }

    const methodCounts: Record<string, number> = {}
    orders.filter((o) => o.status === 'paid' && o.paymentMethod).forEach((o) => {
      const method = o.paymentMethod!
      methodCounts[method] = (methodCounts[method] || 0) + 1
    })

    const totalPaidCount = paidOrders || 1
    const paymentMethodBreakdown: PaymentMethodBreakdown[] = Object.entries(methodCounts).map(
      ([method, count]) => ({ method, count, percentage: Math.round((count / totalPaidCount) * 10000) / 100 })
    )

    return {
      totalRevenue,
      totalTicketsSold,
      totalOrders,
      paidOrders,
      pendingOrders,
      totalUsers,
      totalQuota,
      ticketsRedeemed,
      ticketsInside,
      occupancyRate,
      platformRevenue,
      salesByTier,
      revenueChartData,
      paymentMethodBreakdown,
    }
  },

  // ─── QUERY: GET LIVE STATS ──────────────────────────────────────────────
  getLiveStats: () => {
    const state = get()
    const { tickets, gateLogs, counters, gates, counterStaff, gateStaff, orders } = state

    const totalTicketsPaid = tickets.filter((t) => t.status === 'active').length
    const totalRedeemed = tickets.filter((t) => t.status === 'redeemed').length
    const totalInside = tickets.filter((t) => t.status === 'inside').length
    const totalOutside = tickets.filter((t) => t.status === 'outside').length
    const totalExited = totalOutside
    const totalNotRedeemed = tickets.filter((t) => t.status === 'active' || t.status === 'pending').length
    const totalGateScans = gateLogs.length

    const ticketGateLogs: Record<string, string[]> = {}
    gateLogs.forEach((gl) => {
      if (!ticketGateLogs[gl.ticketId]) ticketGateLogs[gl.ticketId] = []
      ticketGateLogs[gl.ticketId].push(gl.action)
    })
    let totalReentries = 0
    Object.values(ticketGateLogs).forEach((actions) => {
      for (let i = 1; i < actions.length; i++) {
        if (actions[i - 1] === 'exit' && actions[i] === 'entry') totalReentries++
      }
    })

    const activeCounters = counters.filter((c) => c.status === 'active').length
    const activeGates = gates.filter((g) => g.status === 'active').length

    const occupancyRate = state.events[0].capacity > 0 ? Math.round((totalInside / state.events[0].capacity) * 10000) / 100 : 0

    const totalRevenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.totalAmount, 0)

    return {
      totalTicketsPaid,
      totalRedeemed,
      totalInside,
      totalOutside,
      totalExited,
      totalNotRedeemed,
      totalGateScans,
      totalReentries,
      activeCounters,
      activeGates,
      totalCounterStaff: counterStaff.length,
      totalGateStaff: gateStaff.length,
      occupancyRate,
      totalRevenue,
    }
  },
}))
