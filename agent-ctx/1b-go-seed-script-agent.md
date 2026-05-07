# Task 1b — Go Seed Script Agent

## Task
Build a comprehensive Go seed script that generates 15,000 tickets with random buyers for testing the SeleEvent database.

## Status: COMPLETED ✅

## Summary
Rewrote `/home/z/my-project/backend/cmd/seed/main.go` to:

1. **Expanded base seed data** from 1 event to 5 events (Bandung, Makassar, Medan, Jakarta, Balikpapan)
2. **45 ticket types** (9 per event with city-specific pricing)
3. **15 counters, 20 gates, 45 wristband inventories, 5+5 staff assignments**
4. **12,000 PARTICIPANT users** with random Indonesian names
5. **~11,500 orders** with status distribution (90% paid, 5% pending, 3% cancelled, 2% expired)
6. **~15,000 tickets** with status based on order status, unique ticket codes and wristband codes
7. **~10,000 redemptions** for redeemed tickets with proper color mapping
8. **~8,000 gate logs** with IN/OUT/denied actions
9. **~10,000 payment logs** matching paid orders
10. **3 sample coupons** (SAHABATDUTA, EARLYBIRD50, TRENDSHEILA)

## Key Implementation Details
- Deterministic RNG: `rand.New(rand.NewSource(42))`
- Batch processing: 500 per batch with `CreateInBatches`
- Fee calculation: adminFee(2%) + taxAmount(11%) on subTotal
- Idempotent: all functions check if data exists before creating
- Build + vet pass cleanly
