// ─── SELEEVENT TYPE SYSTEM ──────────────────────────────────────────────────
// TypeScript types matching Golang GORM models
// Backend: Golang Fiber + GORM (PostgreSQL)
// Frontend: Next.js 16 + React 19

// ─── ENUMS ─────────────────────────────────────────────────────────────────

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ORGANIZER' 
  | 'COUNTER_STAFF' 
  | 'GATE_STAFF' 
  | 'PARTICIPANT'

export type UserStatus = 'active' | 'suspended' | 'banned'

export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'

export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled' | 'expired'

export type TicketStatus = 'pending' | 'active' | 'redeemed' | 'inside' | 'outside' | 'cancelled' | 'expired'

export type TicketTier = 'floor' | 'tribun'

export type CounterStatus = 'inactive' | 'active' | 'closed'

export type GateType = 'entry' | 'exit' | 'both'

export type GateAction = 'entry' | 'exit' | 'denied' | 'error'

export type AttendeeStatus = 'not_redeemed' | 'redeemed' | 'inside' | 'outside' | 'exited'

export type ShiftType = 'pagi' | 'siang' | 'malam' | 'full'

export type RedemptionConfigStatus = 'upcoming' | 'active' | 'ended'

export type NotificationType = 'info' | 'warning' | 'success' | 'error'

export type NotificationCategory = 'order' | 'redemption' | 'gate' | 'system' | 'payment'

export type TenantPlan = 'free' | 'pro' | 'enterprise'

export type DokuPaymentType = 'virtual_account' | 'qris' | 'ewallet' | 'credit_card' | 'convenience_store' | 'paylater'

export type WithdrawalStatus = 'pending' | 'approved' | 'transferred' | 'completed' | 'rejected' | 'cancelled' | 'dispute'

// ─── CORE MODELS (matching Golang GORM) ────────────────────────────────────

export interface IUser {
  id: string
  googleId: string
  email: string
  name: string
  avatar?: string
  phone?: string
  role: UserRole
  status: UserStatus
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface IEvent {
  id: string
  tenantId: string
  slug: string
  title: string
  subtitle?: string
  date: string
  doorsOpen?: string
  venue: string
  city: string
  address?: string
  capacity: number
  status: EventStatus
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ITicketType {
  id: string
  tenantId: string
  eventId: string
  name: string
  description?: string
  price: number
  quota: number
  sold: number
  tier: TicketTier
  zone?: string
  emoji?: string
  benefits?: string[]
  platformFee?: number
  seatConfig?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
  // Populated by backend with preloaded relations
  seats?: ISeat[]
}

export interface IOrder {
  id: string
  tenantId: string
  orderCode: string
  userId: string
  eventId: string
  totalAmount: number
  status: OrderStatus
  paymentMethod?: string
  paymentType?: string
  paymentChannel?: string
  dokuTransactionId?: string
  expiresAt?: string
  paidAt?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
  // Populated by backend with preloaded relations
  items?: IOrderItem[]
  tickets?: ITicket[]
  event?: IEvent
  user?: IUser
}

export interface IOrderItem {
  id: string
  tenantId: string
  orderId: string
  ticketTypeId: string
  quantity: number
  pricePerTicket: number
  subtotal: number
  // Populated by backend
  ticketType?: ITicketType
}

export interface ITicket {
  id: string
  tenantId: string
  eventId: string
  ticketCode: string
  orderId: string
  ticketTypeId: string
  attendeeName: string
  attendeeEmail: string
  seatLabel?: string
  seatId?: string
  qrData: string
  status: TicketStatus
  redeemedAt?: string
  redeemedBy?: string
  wristbandCode?: string
  eventTitle: string
  ticketTypeName: string
  createdAt: string
  updatedAt: string
  // Populated by backend
  seat?: ISeat
  ticketType?: ITicketType
  order?: IOrder
  event?: IEvent
}

export interface ISeat {
  id: string
  tenantId: string
  eventId: string
  ticketTypeId: string
  section: string
  row: string
  number: string
  label: string
  status: 'available' | 'held' | 'sold' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface ICounter {
  id: string
  tenantId: string
  eventId: string
  name: string
  location?: string
  capacity: number
  status: CounterStatus
  openAt?: string
  closeAt?: string
  createdAt: string
  updatedAt: string
}

export interface ICounterStaff {
  id: string
  tenantId: string
  userId: string
  counterId: string
  shift?: ShiftType
  status: string
  assignedAt: string
  // Populated by backend
  user?: IUser
  counter?: ICounter
}

export interface IGate {
  id: string
  tenantId: string
  eventId: string
  name: string
  type: GateType
  location?: string
  minAccessLevel?: string
  capacityPerMin: number
  status: CounterStatus
  createdAt: string
  updatedAt: string
}

export interface IGateStaff {
  id: string
  tenantId: string
  userId: string
  gateId: string
  shift?: ShiftType
  status: string
  assignedAt: string
  // Populated by backend
  user?: IUser
  gate?: IGate
}

export interface IRedemption {
  id: string
  tenantId: string
  ticketId: string
  counterId: string
  staffId: string
  wristbandCode: string
  wristbandColor: string
  wristbandType: string
  notes?: string
  redeemedAt: string
}

export interface IGateLog {
  id: string
  tenantId: string
  eventId: string
  ticketId: string
  gateId: string
  staffId: string
  action: GateAction
  notes?: string
  scannedAt: string
}

export interface IAuditLog {
  id: string
  tenantId: string
  userId: string
  action: string
  module: string
  details?: string
  ip?: string
  createdAt: string
}

// ─── NEW MODELS (Phase 2 additions) ────────────────────────────────────────

export interface IWristbandInventory {
  id: string
  tenantId: string
  eventId: string
  color: string
  colorHex: string
  type: string
  totalStock: number
  usedStock: number
  remainingStock: number
  createdAt: string
  updatedAt: string
}

export interface INotification {
  id: string
  tenantId: string
  userId: string
  eventId?: string
  title: string
  message: string
  type: NotificationType
  category?: NotificationCategory
  isRead: boolean
  data?: string
  createdAt: string
}

export interface ITenant {
  id: string
  name: string
  slug: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  isActive: boolean
  maxEvents: number
  maxTickets: number
  trialEndsAt?: string
  shardKey?: string
  createdAt: string
  updatedAt: string
}

export interface ISubscription {
  id: string
  tenantId: string
  plan: string
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface IInvoice {
  id: string
  tenantId: string
  subscriptionId?: string
  amountCents: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'void' | 'uncollectible'
  dueDate?: string
  paidAt?: string
  pdfUrl?: string
  createdAt: string
  updatedAt: string
}

export interface ITenantUser {
  id: string
  userId: string
  tenantId: string
  role: UserRole
  isActive: boolean
  joinedAt: string
}

// ─── WITHDRAWAL & BALANCE (DOKU Settlement) ────────────────────────────────

export interface IOrganizerBankAccount {
  id: string
  organizerId: string
  bankName: string
  accountNumber: string
  accountHolder: string
  isVerified: boolean
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface IWithdrawalRequest {
  id: string
  organizerId: string
  organizerName: string
  eventId: string
  eventCode: string
  eventName: string
  amount: number
  fee: number
  netAmount: number
  bankAccountId: string
  bankName: string
  accountNumber: string
  accountHolder: string
  status: WithdrawalStatus
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectedReason?: string
  transferredAt?: string
  transferProof?: string
  transferNote?: string
  completedAt?: string
  disputeReason?: string
}

export interface IOrganizerBalance {
  organizerId: string
  eventId: string
  grossRevenue: number
  platformFeePercent: number
  platformFeeAmount: number
  netRevenue: number
  totalWithdrawn: number
  availableBalance: number
  settledAt?: string
  isSettled: boolean
}

export interface IOrganizerFeeConfig {
  organizerId: string
  organizerName: string
  feePercent: number
  isApproved: boolean
  createdAt: string
}

// ─── DOKU PAYMENT LOG ──────────────────────────────────────────────────────

export interface IPaymentLog {
  id: string
  eventId: string
  orderId: string
  orderCode: string
  transactionId: string
  paymentMethod: string
  paymentChannel: string
  amount: number
  currency: string
  status: 'success' | 'pending' | 'failed' | 'refunded' | 'expired'
  paidAt?: string
  expiredAt?: string
  dokuResponseCode?: string
  notificationReceivedAt?: string
  rawData?: string
  createdAt: string
}

// ─── ORDER CREATION ────────────────────────────────────────────────────────

export interface ICreateOrderRequest {
  eventId: string
  items: ICreateOrderItem[]
}

export interface ICreateOrderItem {
  ticketTypeId: string
  quantity: number
  attendeeName: string
  attendeeEmail: string
}

// ─── PAYMENT ───────────────────────────────────────────────────────────────

export interface ICreatePaymentRequest {
  orderId: string
  paymentType: DokuPaymentType
}

export interface ICreatePaymentResponse {
  paymentUrl?: string
  vaNumber?: string
  qrContent?: string
  transactionId: string
  expiresAt: string
  paymentMethod: string
  // Legacy Midtrans fields (kept for backward compatibility)
  token?: string
  redirectUrl?: string
  qrUrl?: string
  paymentType?: string
  paymentChannel?: string
}

export interface IPaymentStatus {
  orderId: string
  orderStatus: string
  paymentType?: string
  paymentChannel?: string
  paidAt?: string
  dokuTransactionId?: string
}

// ─── PAGINATION ────────────────────────────────────────────────────────────

export interface IPagination {
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface IPaginatedResponse<T> {
  data: T[]
  pagination: IPagination
}

// ─── SSE EVENTS ────────────────────────────────────────────────────────────

export interface ISSEEvent {
  type: 'redemption' | 'gate_scan' | 'ticket_cancelled' | 'stats_update' | 'connected'
  data: unknown
  id: string
  timestamp: string
}

// ─── SYSTEM HEALTH ─────────────────────────────────────────────────────────

export interface ISystemHealth {
  dbStatus: string
  activeConnections: number
  sseConnections: number
  tableCounts: Record<string, number>
  uptime: number
}

// ─── API REQUEST / RESPONSE DTOs ──────────────────────────────────────────

// Auth
export interface IAuthGoogleRequest {
  token: string
}

export interface IAuthResponse {
  user: IUser
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface IRefreshTokenRequest {
  refreshToken: string
}

// Ticket
export interface ICheckTicketRequest {
  ticketCode: string
}

export interface ICheckTicketResponse {
  found: boolean
  ticket?: {
    ticketCode: string
    ticketTypeName: string
    attendeeName: string
    attendeeEmail: string
    seatLabel?: string
    status: TicketStatus
    redeemedAt?: string
    wristbandCode?: string
    wristbandColor?: string
    price: number
    eventName: string
    eventDate: string
  }
  error?: string
}

// Redemption
export interface IRedeemTicketRequest {
  ticketCode: string
  counterId: string
  wristbandCode: string
  notes?: string
}

export interface IRedeemTicketResponse {
  success: boolean
  redemption?: IRedemption
  wristbandColor: string
  wristbandType: string
  ticketTypeName: string
  attendeeName: string
  error?: string
}

// Gate Scan
export interface IGateScanRequest {
  ticketCode: string
  gateId: string
  action: GateAction
  notes?: string
}

export interface IGateScanResponse {
  success: boolean
  action: GateAction
  ticketCode: string
  attendeeName: string
  ticketTypeName: string
  wristbandColor?: string
  reentryCount: number
  previousAction?: GateAction
  error?: string
}

// Live Stats
export interface ILiveStats {
  totalTicketsPaid: number
  totalRedeemed: number
  totalInside: number
  totalOutside: number
  totalExited: number
  totalNotRedeemed: number
  totalGateScans: number
  totalReentries: number
  activeCounters: number
  activeGates: number
  totalCounterStaff: number
  totalGateStaff: number
  occupancyRate: number
  totalRevenue: number
}

// Dashboard Stats (from Golang backend)
export interface IDashboardKPIs {
  totalRevenue: number
  totalTicketsSold: number
  totalOrders: number
  paidOrders: number
  pendingOrders: number
  totalUsers: number
  totalQuota: number
  ticketsRedeemed: number
  ticketsInside: number
  occupancyRate: number
  platformRevenue: number
}

// ─── ROLE ACCESS MATRIX ────────────────────────────────────────────────────

export const ROLE_ACCESS: Record<UserRole, {
  dashboard: string
  routes: string[]
  canViewAll: boolean
}> = {
  SUPER_ADMIN: {
    dashboard: '/admin',
    routes: ['/admin/*'],
    canViewAll: true,
  },
  ORGANIZER: {
    dashboard: '/organizer',
    routes: ['/organizer/*'],
    canViewAll: false,
  },
  COUNTER_STAFF: {
    dashboard: '/counter',
    routes: ['/counter/*'],
    canViewAll: false,
  },
  GATE_STAFF: {
    dashboard: '/gate',
    routes: ['/gate/*'],
    canViewAll: false,
  },
  PARTICIPANT: {
    dashboard: '/',
    routes: ['/'],
    canViewAll: false,
  },
}
