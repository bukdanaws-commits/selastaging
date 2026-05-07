# Task 7: Mock Multi-Event Updater

## Task Summary
Updated the mock store system to support multiple events instead of a single event.

## Files Modified
1. `/home/z/my-project/src/lib/mock/mock-data.ts` — Changed `event: IEvent` to `events: IEvent[]`, added 3 additional events (Bandung, Surabaya, Yogyakarta) with organizerId
2. `/home/z/my-project/src/lib/mock/mock-store.ts` — Changed `event` to `events` in IMockAllData and MockState interfaces, updated all `state.event`/`get().event` references to `state.events[0]`/`get().events[0]`
3. `/home/z/my-project/src/lib/mock/mock-handlers.ts` — Updated all `store.event` references to use `store.events[0]` or `store.events.find()`, enhanced admin/events and analytics endpoints to work with multiple events

## Key Decisions
- Existing Jakarta event kept as `events[0]` so all existing ticket/order/counter/gate data references remain correct
- Bandung and Surabaya events are `published`, Yogyakarta is `draft`
- Each new event has different dates, venues, cities, and capacities
- All 4 events share the same organizerId (`user-organizer-001`) and tenantId

## Lint Status
- `bun run lint` passes clean (0 errors, 0 warnings)

## Work Log
- Full work log appended to `/home/z/my-project/worklog.md`
