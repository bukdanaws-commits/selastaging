-- ============================================================================
-- SeleEvent — Hybrid PostgreSQL DDL Schema
-- Event Ticketing & Access Management System
-- Sheila On 7 Concert @ GBK Madya Stadium
-- ============================================================================
-- Combines the best of the NEW schema (SaaS billing, assigned seating,
-- partitioning, CHECK constraints, soft delete, denormalized fields, UUID PKs)
-- with the EXISTING schema (counters, gates, redemptions, Google OAuth,
-- Midtrans payment, wristband tracking, RBAC, full ticket lifecycle).
-- ============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ─── Enumerated Types ────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'COUNTER_STAFF', 'GATE_STAFF', 'PARTICIPANT'
);

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');

CREATE TYPE event_status AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled');

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled', 'expired', 'refunded');

CREATE TYPE ticket_status AS ENUM (
    'pending', 'active', 'redeemed', 'inside', 'outside', 'cancelled', 'expired'
);

CREATE TYPE gate_type AS ENUM ('entry', 'exit', 'both');

CREATE TYPE gate_log_action AS ENUM ('entry', 'exit', 'denied', 'error');

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');

CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'void', 'uncollectible');

-- ============================================================================
-- 1. TENANTS
-- ============================================================================
-- SaaS multi-tenant organisations that host events.
-- Includes branding fields (logo, primary_color, secondary_color) from EXISTING
-- and plan limits (max_events, max_tickets) from EXISTING.

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    slug            TEXT        NOT NULL,
    logo            TEXT,
    primary_color   TEXT        NOT NULL DEFAULT '#00A39D',
    secondary_color TEXT        NOT NULL DEFAULT '#F8AD3C',
    plan            TEXT        NOT NULL DEFAULT 'free',     -- free / pro / enterprise
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    max_events      INTEGER     NOT NULL DEFAULT 1,
    max_tickets     INTEGER     NOT NULL DEFAULT 1000,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_tenants_slug UNIQUE (slug)
);

COMMENT ON TABLE tenants IS 'SaaS multi-tenant organisations that host events.';

-- ============================================================================
-- 2. SUBSCRIPTIONS
-- ============================================================================
-- SaaS billing per tenant (from NEW schema).

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan            TEXT            NOT NULL,           -- free / pro / enterprise
    status          subscription_status NOT NULL DEFAULT 'trial',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_subscriptions_tenant_active UNIQUE (tenant_id)
        WHERE cancelled_at IS NULL
);

COMMENT ON TABLE subscriptions IS 'SaaS billing subscriptions — one active subscription per tenant.';

-- ============================================================================
-- 3. INVOICES
-- ============================================================================
-- Tenant invoicing (from NEW schema).

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID            REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount_cents    INTEGER         NOT NULL,
    currency        TEXT            NOT NULL DEFAULT 'IDR',
    status          invoice_status  NOT NULL DEFAULT 'draft',
    due_date        DATE,
    paid_at         TIMESTAMPTZ,
    pdf_url         TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT chk_invoices_amount CHECK (amount_cents >= 0)
);

COMMENT ON TABLE invoices IS 'Tenant invoicing records for SaaS billing.';

-- ============================================================================
-- 4. USERS
-- ============================================================================
-- System users with Google OAuth login, RBAC roles, and status lifecycle
-- (from EXISTING schema).

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id       TEXT            NOT NULL,
    email           TEXT            NOT NULL,
    name            TEXT            NOT NULL,
    avatar          TEXT,
    phone           TEXT,
    role            user_role       NOT NULL DEFAULT 'PARTICIPANT',
    status          user_status     NOT NULL DEFAULT 'active',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_google_id UNIQUE (google_id),
    CONSTRAINT uq_users_email     UNIQUE (email)
);

COMMENT ON TABLE users IS 'System users — Google OAuth login, RBAC roles, status lifecycle.';

-- ============================================================================
-- 5. TENANT_USERS
-- ============================================================================
-- User ↔ Tenant membership with per-tenant role override.

CREATE TABLE tenant_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role        user_role   NOT NULL DEFAULT 'PARTICIPANT',
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_tenant_users_user_tenant UNIQUE (user_id, tenant_id)
);

COMMENT ON TABLE tenant_users IS 'User–Tenant membership with per-tenant role override.';

-- ============================================================================
-- 6. EVENTS
-- ============================================================================
-- Event listings with slug, subtitle, doors_open, city, address, capacity
-- (from EXISTING) plus tenant_id, soft delete (from NEW).

CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug            TEXT            NOT NULL,
    title           TEXT            NOT NULL,
    subtitle        TEXT,
    date            TIMESTAMPTZ     NOT NULL,
    doors_open      TIMESTAMPTZ,
    venue           TEXT            NOT NULL,
    city            TEXT            NOT NULL,
    address         TEXT,
    capacity        INTEGER         NOT NULL,
    status          event_status    NOT NULL DEFAULT 'draft',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_events_slug        UNIQUE (slug),
    CONSTRAINT chk_events_capacity   CHECK (capacity > 0)
);

CREATE INDEX idx_events_tenant_id    ON events (tenant_id);
CREATE INDEX idx_events_status       ON events (status);
CREATE INDEX idx_events_date         ON events (date);
CREATE INDEX idx_events_deleted_at   ON events (deleted_at);

COMMENT ON TABLE events IS 'Event listings — multi-tenant, soft-deletable, with full venue info.';

-- ============================================================================
-- 7. TICKET_TYPES
-- ============================================================================
-- Ticket categories with description, tier, zone, emoji, benefits, seat_config
-- (from EXISTING) plus tenant_id, soft delete, CHECK constraint (from NEW).

CREATE TABLE ticket_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    description     TEXT,
    price           INTEGER     NOT NULL,            -- price in IDR cents or whole IDR
    quota           INTEGER     NOT NULL,
    sold            INTEGER     NOT NULL DEFAULT 0,
    tier            TEXT        NOT NULL DEFAULT 'floor',  -- floor / seated / premium
    zone            TEXT,
    emoji           TEXT,
    benefits        TEXT,                               -- JSON array of benefit strings
    platform_fee    NUMERIC(5,2) NOT NULL DEFAULT 0,    -- platform fee percentage (e.g. 5 = 5%)
    seat_config     TEXT,                               -- JSON seat map configuration
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_ticket_types_sold   CHECK (sold >= 0),
    CONSTRAINT chk_ticket_types_quota  CHECK (quota > 0),
    CONSTRAINT chk_ticket_types_sold_le_quota CHECK (sold <= quota),
    CONSTRAINT chk_ticket_types_price  CHECK (price >= 0)
);

CREATE INDEX idx_ticket_types_event_id   ON ticket_types (event_id);
CREATE INDEX idx_ticket_types_tenant_id  ON ticket_types (tenant_id);
CREATE INDEX idx_ticket_types_deleted_at ON ticket_types (deleted_at);

COMMENT ON TABLE ticket_types IS 'Ticket categories per event — tiered pricing, quotas, seat config, soft-deletable.';

-- ============================================================================
-- 8. SEATS
-- ============================================================================
-- Assigned seating master table (from NEW schema).
-- Only for VVIP, VIP, CAT1–CAT6 ticket types.
-- Festival / free-standing tickets do NOT reference this table.

CREATE TABLE seats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id  UUID        NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    section         TEXT        NOT NULL,          -- e.g. "A", "B", "West"
    row             TEXT        NOT NULL,          -- e.g. "1", "2", "AA"
    number          TEXT        NOT NULL,          -- e.g. "1", "12", "23A"
    label           TEXT        NOT NULL,          -- display label e.g. "A-1-12"
    status          TEXT        NOT NULL DEFAULT 'available',  -- available / held / sold / disabled
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_seats_event_section_row_number UNIQUE (event_id, section, row, number)
);

CREATE INDEX idx_seats_event_id        ON seats (event_id);
CREATE INDEX idx_seats_ticket_type_id  ON seats (ticket_type_id);
CREATE INDEX idx_seats_tenant_id       ON seats (tenant_id);
CREATE INDEX idx_seats_status          ON seats (status);

COMMENT ON TABLE seats IS 'Assigned seating master — only for VVIP, VIP, CAT1–CAT6. Festival/standing tickets have no seat assignment.';

-- ============================================================================
-- 9. ORDERS
-- ============================================================================
-- Purchase orders with order_code, payment_type, payment_method,
-- midtrans_transaction_id, expires_at (from EXISTING) plus tenant_id,
-- soft delete, CHECK constraint (from NEW).

CREATE TABLE orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_code              TEXT            NOT NULL,
    user_id                 UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id                UUID            NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    total_amount            INTEGER         NOT NULL,
    status                  order_status    NOT NULL DEFAULT 'pending',
    payment_type            TEXT,                              -- e.g. "qris", "bank_transfer"
    payment_method          TEXT,                              -- e.g. "gopay", "bca_va"
    midtrans_transaction_id TEXT,                              -- Midtrans reference
    expires_at              TIMESTAMPTZ,                       -- order timeout
    paid_at                 TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_orders_order_code              UNIQUE (order_code),
    CONSTRAINT uq_orders_midtrans_transaction_id  UNIQUE (midtrans_transaction_id),
    CONSTRAINT chk_orders_total_amount            CHECK (total_amount >= 0)
);

CREATE INDEX idx_orders_user_id     ON orders (user_id);
CREATE INDEX idx_orders_event_id    ON orders (event_id);
CREATE INDEX idx_orders_tenant_id   ON orders (tenant_id);
CREATE INDEX idx_orders_status      ON orders (status);
CREATE INDEX idx_orders_deleted_at  ON orders (deleted_at);

COMMENT ON TABLE orders IS 'Purchase orders — Midtrans payment integration, booking reference codes, order timeout, soft-deletable.';

-- ============================================================================
-- 10. ORDER_ITEMS
-- ============================================================================
-- Order line items — each row is one ticket-type × quantity.

CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id  UUID        NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    quantity        INTEGER     NOT NULL,
    price_per_ticket INTEGER    NOT NULL,
    subtotal        INTEGER     NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_items_price    CHECK (price_per_ticket >= 0),
    CONSTRAINT chk_order_items_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_order_items_math     CHECK (subtotal = quantity * price_per_ticket)
);

CREATE INDEX idx_order_items_order_id       ON order_items (order_id);
CREATE INDEX idx_order_items_ticket_type_id ON order_items (ticket_type_id);
CREATE INDEX idx_order_items_tenant_id      ON order_items (tenant_id);

COMMENT ON TABLE order_items IS 'Order line items — one row per ticket-type × quantity.';

-- ============================================================================
-- 11. TICKETS
-- ============================================================================
-- Individual tickets with full lifecycle:
--   pending → active → redeemed → inside ↔ outside → cancelled / expired
-- Includes ticket_code, qr_data, wristband_code, redeemed_at, redeemed_by
-- (from EXISTING) plus tenant_id, seat_id FK (NEW), denormalized fields
-- (event_title, ticket_type_name), unique_event_seat constraint.

CREATE TABLE tickets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id          UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id    UUID            NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    event_id          UUID            NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seat_id           UUID            REFERENCES seats(id) ON DELETE SET NULL,
    ticket_code       TEXT            NOT NULL,
    attendee_name     TEXT            NOT NULL,
    attendee_email    TEXT            NOT NULL,
    seat_label        TEXT,                                  -- e.g. "VVIP-A-1-12" or "Festival"
    qr_data           TEXT            NOT NULL,
    wristband_code    TEXT,
    event_title       TEXT            NOT NULL,              -- denormalized from events
    ticket_type_name  TEXT            NOT NULL,              -- denormalized from ticket_types
    status            ticket_status   NOT NULL DEFAULT 'pending',
    redeemed_at       TIMESTAMPTZ,
    redeemed_by       UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_tickets_ticket_code     UNIQUE (ticket_code),
    CONSTRAINT uq_tickets_seat_id         UNIQUE (seat_id),          -- prevent double booking
    CONSTRAINT uq_tickets_wristband_code  UNIQUE (wristband_code),
    CONSTRAINT uq_event_seat              UNIQUE (event_id, seat_label)  -- one ticket per seat per event
);

CREATE INDEX idx_tickets_order_id        ON tickets (order_id);
CREATE INDEX idx_tickets_ticket_type_id  ON tickets (ticket_type_id);
CREATE INDEX idx_tickets_event_id        ON tickets (event_id);
CREATE INDEX idx_tickets_seat_id         ON tickets (seat_id);
CREATE INDEX idx_tickets_tenant_id       ON tickets (tenant_id);
CREATE INDEX idx_tickets_status          ON tickets (status);
CREATE INDEX idx_tickets_attendee_email  ON tickets (attendee_email);
CREATE INDEX idx_tickets_wristband_code  ON tickets (wristband_code) WHERE wristband_code IS NOT NULL;

COMMENT ON TABLE tickets IS 'Individual tickets — full lifecycle (pending→active→redeemed→inside↔outside→cancelled/expired), seat assignment via FK, QR/wristband tracking, denormalized event/title.';

-- ============================================================================
-- 12. COUNTERS
-- ============================================================================
-- Wristband redemption booths (from EXISTING schema).

CREATE TABLE counters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    location    TEXT,
    capacity    INTEGER     NOT NULL DEFAULT 500,
    status      TEXT        NOT NULL DEFAULT 'inactive',    -- active / inactive / closed
    open_at     TIMESTAMPTZ,
    close_at    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_counters_capacity CHECK (capacity > 0)
);

CREATE INDEX idx_counters_event_id   ON counters (event_id);
CREATE INDEX idx_counters_tenant_id  ON counters (tenant_id);

COMMENT ON TABLE counters IS 'Wristband redemption booths — where participants exchange tickets for wristbands.';

-- ============================================================================
-- 13. COUNTER_STAFF
-- ============================================================================
-- Staff assignments to counters (from EXISTING schema).

CREATE TABLE counter_staff (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counter_id  UUID        NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    shift       TEXT,
    status      TEXT        NOT NULL DEFAULT 'active',       -- active / inactive
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_counter_staff_user_counter UNIQUE (user_id, counter_id)
);

CREATE INDEX idx_counter_staff_counter_id ON counter_staff (counter_id);
CREATE INDEX idx_counter_staff_tenant_id  ON counter_staff (tenant_id);

COMMENT ON TABLE counter_staff IS 'Staff assignments to wristband redemption counters.';

-- ============================================================================
-- 14. GATES
-- ============================================================================
-- Entry/exit points (from EXISTING schema).

CREATE TABLE gates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id          UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name              TEXT    NOT NULL,
    type              gate_type NOT NULL DEFAULT 'entry',
    location          TEXT,
    min_access_level  TEXT,                           -- e.g. "VVIP", "VIP", "CAT1"
    capacity_per_min  INTEGER NOT NULL DEFAULT 30,
    status            TEXT    NOT NULL DEFAULT 'inactive',  -- active / inactive / closed
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_gates_capacity_per_min CHECK (capacity_per_min > 0)
);

CREATE INDEX idx_gates_event_id   ON gates (event_id);
CREATE INDEX idx_gates_tenant_id  ON gates (tenant_id);

COMMENT ON TABLE gates IS 'Entry/exit points at the venue — typed as entry, exit, or both.';

-- ============================================================================
-- 15. GATE_STAFF
-- ============================================================================
-- Staff assignments to gates (from EXISTING schema).

CREATE TABLE gate_staff (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gate_id     UUID        NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    shift       TEXT,
    status      TEXT        NOT NULL DEFAULT 'active',       -- active / inactive
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_gate_staff_user_gate UNIQUE (user_id, gate_id)
);

CREATE INDEX idx_gate_staff_gate_id    ON gate_staff (gate_id);
CREATE INDEX idx_gate_staff_tenant_id  ON gate_staff (tenant_id);

COMMENT ON TABLE gate_staff IS 'Staff assignments to entry/exit gates.';

-- ============================================================================
-- 16. REDEMPTIONS
-- ============================================================================
-- Ticket → wristband exchange records (from EXISTING schema).

CREATE TABLE redemptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id       UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    counter_id      UUID        NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    staff_id        UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    wristband_code  TEXT        NOT NULL,
    wristband_color TEXT        NOT NULL,
    wristband_type  TEXT        NOT NULL,
    notes           TEXT,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_redemptions_ticket_id      UNIQUE (ticket_id),
    CONSTRAINT uq_redemptions_wristband_code UNIQUE (wristband_code)
);

CREATE INDEX idx_redemptions_counter_id    ON redemptions (counter_id);
CREATE INDEX idx_redemptions_staff_id      ON redemptions (staff_id);
CREATE INDEX idx_redemptions_tenant_id     ON redemptions (tenant_id);

COMMENT ON TABLE redemptions IS 'Ticket-to-wristband exchange records — one redemption per ticket.';

-- ============================================================================
-- 17. GATE_LOGS (PARTITIONED)
-- ============================================================================
-- Entry/exit tracking, PARTITION BY RANGE on scanned_at (from NEW schema).
-- Default partition for out-of-range data + partition for 2026-04.

CREATE TABLE gate_logs (
    id          UUID            NOT NULL,
    tenant_id   UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id   UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    gate_id     UUID            NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    staff_id    UUID            REFERENCES users(id) ON DELETE SET NULL,
    action      gate_log_action NOT NULL,
    notes       TEXT,
    scanned_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (id, scanned_at)
) PARTITION BY RANGE (scanned_at);

-- Partition for April 2026 (concert month)
CREATE TABLE gate_logs_2026_04 PARTITION OF gate_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Default partition for any out-of-range data
CREATE TABLE gate_logs_default PARTITION OF gate_logs DEFAULT;

CREATE INDEX idx_gate_logs_ticket_id  ON gate_logs (ticket_id);
CREATE INDEX idx_gate_logs_gate_id    ON gate_logs (gate_id);
CREATE INDEX idx_gate_logs_staff_id   ON gate_logs (staff_id);
CREATE INDEX idx_gate_logs_tenant_id  ON gate_logs (tenant_id);
CREATE INDEX idx_gate_logs_action     ON gate_logs (action);
CREATE INDEX idx_gate_logs_scanned_at ON gate_logs (scanned_at);

COMMENT ON TABLE gate_logs IS 'Entry/exit tracking — partitioned by scanned_at for high-throughput gate scanning.';

-- ============================================================================
-- 18. WRISTBAND_INVENTORIES
-- ============================================================================
-- Wristband stock with color_hex, remaining_stock (from EXISTING).

CREATE TABLE wristband_inventories (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id         UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    color            TEXT    NOT NULL,
    color_hex        TEXT    NOT NULL,                        -- e.g. "#FFD700"
    type             TEXT    NOT NULL,                        -- e.g. "VIP", "Festival"
    total_stock      INTEGER NOT NULL DEFAULT 0,
    used_stock       INTEGER NOT NULL DEFAULT 0,
    remaining_stock  INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_wristband_inv_event_color UNIQUE (event_id, color),
    CONSTRAINT chk_wristband_inv_total      CHECK (total_stock >= 0),
    CONSTRAINT chk_wristband_inv_used       CHECK (used_stock >= 0),
    CONSTRAINT chk_wristband_inv_remaining  CHECK (remaining_stock >= 0),
    CONSTRAINT chk_wristband_inv_used_le_total CHECK (used_stock <= total_stock)
);

CREATE INDEX idx_wristband_inv_event_id  ON wristband_inventories (event_id);
CREATE INDEX idx_wristband_inv_tenant_id ON wristband_inventories (tenant_id);

COMMENT ON TABLE wristband_inventories IS 'Wristband stock per event/color — tracks total, used, and remaining quantities.';

-- ============================================================================
-- 19. NOTIFICATIONS
-- ============================================================================
-- User notifications with event_id, category, data (from EXISTING).

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id    UUID        REFERENCES events(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    type        TEXT        NOT NULL DEFAULT 'info',      -- info / warning / success / error
    category    TEXT,                                     -- order / redemption / gate / system / payment
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    data        TEXT,                                     -- JSON payload
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id   ON notifications (user_id);
CREATE INDEX idx_notifications_tenant_id ON notifications (tenant_id);
CREATE INDEX idx_notifications_is_read   ON notifications (is_read);
CREATE INDEX idx_notifications_event_id  ON notifications (event_id);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);

COMMENT ON TABLE notifications IS 'User notifications — per-tenant, categorised, with optional JSON data payload.';

-- ============================================================================
-- 20. AUDIT_LOGS
-- ============================================================================
-- System audit trail — append-only (no updated_at).

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT    NOT NULL,
    module      TEXT    NOT NULL,
    details     TEXT,                               -- JSON payload
    ip          TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_tenant_id  ON audit_logs (tenant_id);
CREATE INDEX idx_audit_logs_module     ON audit_logs (module);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

COMMENT ON TABLE audit_logs IS 'Append-only system audit trail — tracks all sensitive operations.';

-- ============================================================================
-- Helper: updated_at trigger function
-- ============================================================================
-- Automatically sets updated_at = now() on every row update.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with an updated_at column
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
          AND table_name NOT IN ('gate_logs')  -- gate_logs has no updated_at
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- Helper: enforce sold ≤ quota on ticket_types
-- ============================================================================
-- Additional row-level safety net beyond the CHECK constraint
-- to prevent sold from exceeding quota via concurrent writes.

CREATE OR REPLACE FUNCTION enforce_ticket_type_quota()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sold > NEW.quota THEN
        RAISE EXCEPTION 'sold (%) exceeds quota (%) for ticket_type %',
            NEW.sold, NEW.quota, NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_types_quota
    BEFORE INSERT OR UPDATE ON ticket_types
    FOR EACH ROW
    EXECUTE FUNCTION enforce_ticket_type_quota();

-- ============================================================================
-- Helper: enforce used_stock ≤ total_stock on wristband_inventories
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_wristband_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.used_stock > NEW.total_stock THEN
        RAISE EXCEPTION 'used_stock (%) exceeds total_stock (%) for wristband_inventory %',
            NEW.used_stock, NEW.total_stock, NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wristband_inventories_stock
    BEFORE INSERT OR UPDATE ON wristband_inventories
    FOR EACH ROW
    EXECUTE FUNCTION enforce_wristband_stock();

-- ============================================================================
-- Helper: ensure seat_id on tickets for seated ticket types
-- ============================================================================
-- For VVIP, VIP, CAT1–CAT6 ticket types, seat_id should be NOT NULL.
-- Festival / free-standing types may have NULL seat_id.
-- This is enforced at application level; a partial index can help identify
-- violations at query time.

-- Partial index to quickly find seated tickets missing a seat assignment
CREATE INDEX idx_tickets_seated_missing_seat
    ON tickets (id)
    WHERE seat_id IS NULL
      AND ticket_type_name NOT IN ('Festival');

-- ============================================================================
-- Schema version tracking
-- ============================================================================

CREATE TABLE schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('001_hybrid_initial');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
