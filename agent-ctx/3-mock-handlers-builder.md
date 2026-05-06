# Task 3: Mock Handlers Builder — Work Record

## Summary
Created `/home/z/my-project/src/lib/mock/mock-handlers.ts` — the API request router that intercepts all 50+ endpoints and returns mock data from the mock store.

## File Created
- `src/lib/mock/mock-handlers.ts` (~580 lines)

## Key Design Decisions

### URL Matching
- `matchRoute(pattern, actual)` — exact segment-level matching with `:param` dynamic segments
- Simple `startsWith()` for base path checks where dynamic segments aren't needed
- No regex dependency — pure string splitting/comparison

### Response Shapes
Every endpoint's return type was verified against `src/lib/api.ts` typed methods:
- `PaginatedData<T>` → `{ data: T[], pagination: IPagination }` — returned for all list endpoints with `paginate()` helper
- Non-paginated arrays returned directly (e.g., `organizerApi.getCounters` returns `unknown[]`)
- Single objects returned directly (e.g., `{ user }`, `{ event, ticketTypes }`)
- `void` endpoints return `undefined`

### Filter/Search Support
List endpoints support query param filtering:
- `eventId` — filter by event
- `status` — filter by entity status
- `search` — text search on name/email/code fields
- `unread` — for notifications

### Mock Store Interface Expected
The mock-handlers imports `useMockStore` from `./mock-store` and expects:
```typescript
{
  // Data arrays
  users: IUser[]
  events: IEvent[]
  ticketTypes: ITicketType[]
  orders: IOrder[]
  tickets: ITicket[]
  redemptions: IRedemption[]
  counters: ICounter[]
  gates: IGate[]
  counterStaff: ICounterStaff[]
  gateStaff: IGateStaff[]
  wristbands: IWristbandInventory[]
  notifications: INotification[]
  gateLogs: IGateLog[]
  seats?: ISeat[]
  orderItems?: IOrderItem[]

  // Query actions
  checkTicket(code: string): ICheckTicketResponse
  createOrder(body: unknown): IOrder
  getUserOrders(userId: string): IOrder[]
  cancelOrder(orderId: string): void
  createPayment(body: unknown): ICreatePaymentResponse
  getPaymentStatus(orderId: string): IPaymentStatus
  getDashboardKPIs(): IDashboardKPIs
  getLiveStats(): ILiveStats
  redeemTicket(body: unknown): IRedeemTicketResponse
  scanGate(body: unknown): IGateScanResponse

  // Mutation actions
  updateTicketStatus(ticketId: string, status: TicketStatus): void
  markNotificationRead(id: string): void
  markAllNotificationsRead(): void
}
```

## Endpoint Coverage (52 total)
| Group | Count | Endpoints |
|-------|-------|-----------|
| Auth | 4 | me, google, refresh, logout |
| Public | 3 | event detail, ticket types, check ticket |
| Orders | 4 | create, list, detail, cancel |
| Payment | 3 | create, callback, status |
| Organizer | 10 | dashboard, live-monitor, tickets, redemptions, counters, gates, staff, wristband-inventory, wristband-guide |
| Counter | 5 | scan, redemptions, status, inventory, guide |
| Gate | 4 | scan, logs, status, profile |
| Admin | 16 | dashboard, analytics, orders, users, events, tickets, staff, counters, gates, gate-monitoring, verifications, seats, settings, crew-gates, live-monitor, cancel-ticket, expire-pending |
| Notifications | 3 | list, mark-read, mark-all-read |
