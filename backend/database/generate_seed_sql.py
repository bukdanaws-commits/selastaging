#!/usr/bin/env python3
"""
Generate seed SQL for SeleEvent — Sheila On 7 "Melompat Lebih Tinggi" Tour 2025
GCP Cloud SQL (PostgreSQL)

5 Cities × 12,000 tickets = 60,000 total
5% platform fee per ticket

Schedule (every Sunday in June 2025):
  1 June   - Bandung     - Baros Field / GBBL
  8 June   - Makassar    - Pantai Losari Arena
  15 June  - Medan       - Lapangan Merdeka
  22 June  - Jakarta     - GBK Madya Stadium
  29 June  - Balikpapan  - Lapangan Merdeka BPN

Categories match the landing page exactly:
  VVIP PIT, VIP ZONE, FESTIVAL, CAT 1-6
"""

import json
import random
import uuid
from datetime import datetime, timezone

# ─── Fixed UUIDs (deterministic for repeatability) ───────────────────────
TENANT_ID = "10000000-0000-0000-0000-000000000001"

USER_IDS = {
    "bukdan": "40000000-0000-0000-0000-000000000001",
    "rizky":  "40000000-0000-0000-0000-000000000002",
    "andi":   "40000000-0000-0000-0000-000000000003",
    "rina":   "40000000-0000-0000-0000-000000000004",
    "bayu":   "40000000-0000-0000-0000-000000000005",
    "budi":   "40000000-0000-0000-0000-000000000006",
}

PLATFORM_FEE_PCT = 5  # 5%

# ─── EVENT DEFINITIONS ───────────────────────────────────────────────────
# 5 cities, each with 12,000 tickets, varying prices by city
EVENTS = [
    {
        "id":       "30000000-0000-0000-0000-000000000001",
        "slug":     "sheila-on7-bandung",
        "title":    "Sheila On 7 — BANDUNG",
        "subtitle": "Melompat Lebih Tinggi Tour 2025",
        "date":     datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc),   # 19:00 WIB
        "doors":    datetime(2025, 6, 1, 9, 0, 0, tzinfo=timezone.utc),    # 16:00 WIB
        "venue":    "Baros Field",
        "city":     "Bandung",
        "address":  "Jl. Baros No.1, Cimahi, Jawa Barat 40511",
        "prices": {
            "VVIP PIT":  3_250_000,
            "VIP ZONE":  2_600_000,
            "FESTIVAL":  2_000_000,
            "CAT 1":     1_600_000,
            "CAT 2":     1_300_000,
            "CAT 3":     1_000_000,
            "CAT 4":     750_000,
            "CAT 5":     500_000,
            "CAT 6":     300_000,
        },
    },
    {
        "id":       "30000000-0000-0000-0000-000000000002",
        "slug":     "sheila-on7-makassar",
        "title":    "Sheila On 7 — MAKASSAR",
        "subtitle": "Melompat Lebih Tinggi Tour 2025",
        "date":     datetime(2025, 6, 8, 12, 0, 0, tzinfo=timezone.utc),
        "doors":    datetime(2025, 6, 8, 9, 0, 0, tzinfo=timezone.utc),
        "venue":    "Pantai Losari Arena",
        "city":     "Makassar",
        "address":  "Jl. Penghibur, Pantai Losari, Makassar, Sulawesi Selatan 90173",
        "prices": {
            "VVIP PIT":  3_000_000,
            "VIP ZONE":  2_400_000,
            "FESTIVAL":  1_850_000,
            "CAT 1":     1_450_000,
            "CAT 2":     1_150_000,
            "CAT 3":     900_000,
            "CAT 4":     700_000,
            "CAT 5":     450_000,
            "CAT 6":     275_000,
        },
    },
    {
        "id":       "30000000-0000-0000-0000-000000000003",
        "slug":     "sheila-on7-medan",
        "title":    "Sheila On 7 — MEDAN",
        "subtitle": "Melompat Lebih Tinggi Tour 2025",
        "date":     datetime(2025, 6, 15, 12, 0, 0, tzinfo=timezone.utc),
        "doors":    datetime(2025, 6, 15, 9, 0, 0, tzinfo=timezone.utc),
        "venue":    "Lapangan Merdeka Medan",
        "city":     "Medan",
        "address":  "Jl. Balai Kota, Medan Bar., Kota Medan, Sumatera Utara 20112",
        "prices": {
            "VVIP PIT":  3_000_000,
            "VIP ZONE":  2_400_000,
            "FESTIVAL":  1_850_000,
            "CAT 1":     1_450_000,
            "CAT 2":     1_150_000,
            "CAT 3":     900_000,
            "CAT 4":     700_000,
            "CAT 5":     450_000,
            "CAT 6":     275_000,
        },
    },
    {
        "id":       "30000000-0000-0000-0000-000000000004",
        "slug":     "sheila-on7-jakarta",
        "title":    "Sheila On 7 — JAKARTA",
        "subtitle": "Melompat Lebih Tinggi Tour 2025",
        "date":     datetime(2025, 6, 22, 12, 0, 0, tzinfo=timezone.utc),
        "doors":    datetime(2025, 6, 22, 9, 0, 0, tzinfo=timezone.utc),
        "venue":    "GBK Madya Stadium",
        "city":     "Jakarta",
        "address":  "Jl. Gatot Subroto, Senayan, Kebayoran Baru, Jakarta Pusat 10270",
        "prices": {
            "VVIP PIT":  3_500_000,
            "VIP ZONE":  2_800_000,
            "FESTIVAL":  2_200_000,
            "CAT 1":     1_750_000,
            "CAT 2":     1_400_000,
            "CAT 3":     1_100_000,
            "CAT 4":     850_000,
            "CAT 5":     550_000,
            "CAT 6":     350_000,
        },
    },
    {
        "id":       "30000000-0000-0000-0000-000000000005",
        "slug":     "sheila-on7-balikpapan",
        "title":    "Sheila On 7 — BALIKPAPAN",
        "subtitle": "Melompat Lebih Tinggi Tour 2025",
        "date":     datetime(2025, 6, 29, 12, 0, 0, tzinfo=timezone.utc),
        "doors":    datetime(2025, 6, 29, 9, 0, 0, tzinfo=timezone.utc),
        "venue":    "Lapangan Merdeka BPN",
        "city":     "Balikpapan",
        "address":  "Jl. Jend. Sudirman, Balikpapan Kota, Kalimantan Timur 76113",
        "prices": {
            "VVIP PIT":  2_750_000,
            "VIP ZONE":  2_200_000,
            "FESTIVAL":  1_700_000,
            "CAT 1":     1_350_000,
            "CAT 2":     1_050_000,
            "CAT 3":     850_000,
            "CAT 4":     650_000,
            "CAT 5":     400_000,
            "CAT 6":     250_000,
        },
    },
]

# ─── Ticket type definitions matching landing page ───────────────────────
# Total quota per event = 12,000
TICKET_TYPE_DEFS = [
    {
        "name":        "VVIP PIT",
        "description": "Standing paling depan — barisan depan panggung",
        "quota":       170,
        "tier":        "floor",
        "zone":        "PIT",
        "emoji":       "👑",
        "benefits": [
            "Standing paling depan (barrier VVIP)",
            "Welcome drink + F&B gratis sepuasnya",
            "Exclusive merchandise pack (T-shirt + Poster)",
            "Early entry 30 menit sebelum gate buka",
            "Wristband premium (gold embossed)",
            "Meet & Greet session sebelum konser",
            "Photobooth area eksklusif",
            "Lounge area dengan sofa dan AC",
        ],
    },
    {
        "name":        "VIP ZONE",
        "description": "Standing VIP — di belakang VVIP Pit",
        "quota":       280,
        "tier":        "floor",
        "zone":        "VIP",
        "emoji":       "⭐",
        "benefits": [
            "Standing zone VIP (di belakang VVIP)",
            "Dedicated bar & food stall",
            "Merchandise discount 20%",
            "Early entry 15 menit",
            "Wristband VIP (teal embossed)",
        ],
    },
    {
        "name":        "FESTIVAL",
        "description": "General admission standing — bebas pilih posisi",
        "quota":       1_700,
        "tier":        "floor",
        "zone":        "Festival",
        "emoji":       "🎵",
        "benefits": [
            "General admission standing area",
            "Bebas pilih posisi dalam area festival",
            "Akses food court & merchandise area",
        ],
    },
    {
        "name":        "CAT 1",
        "description": "Tribun Bawah Kiri — kursi bernomor",
        "quota":       1_100,
        "tier":        "tribun",
        "zone":        "West",
        "emoji":       "🎟️",
        "benefits": [
            "Kursi bernomor (assigned seating)",
            "Tribun bawah kiri — view premium",
            "Pemandangan stage jelas",
            "Akses food court & merchandise",
        ],
    },
    {
        "name":        "CAT 2",
        "description": "Tribun Tengah Kiri — kursi bernomor",
        "quota":       1_700,
        "tier":        "tribun",
        "zone":        "East",
        "emoji":       "🎫",
        "benefits": [
            "Kursi bernomor (assigned seating)",
            "Tribun tengah kiri — view baik",
            "Akses food court & merchandise",
        ],
    },
    {
        "name":        "CAT 3",
        "description": "Tribun Tengah Kanan — kursi bernomor",
        "quota":       1_700,
        "tier":        "tribun",
        "zone":        "North",
        "emoji":       "🎫",
        "benefits": [
            "Kursi bernomor (assigned seating)",
            "Tribun tengah kanan — view baik",
            "Akses food court & merchandise",
        ],
    },
    {
        "name":        "CAT 4",
        "description": "Tribun Atas Kanan — kursi bernomor",
        "quota":       2_200,
        "tier":        "tribun",
        "zone":        "South",
        "emoji":       "🎟️",
        "benefits": [
            "Kursi bernomor (assigned seating)",
            "Tribun atas kanan",
            "Akses food court & merchandise",
        ],
    },
    {
        "name":        "CAT 5",
        "description": "Tribun Ujung Belakang — kursi bernomor",
        "quota":       1_700,
        "tier":        "tribun",
        "zone":        "Corner-NW",
        "emoji":       "🎟️",
        "benefits": [
            "Kursi bernomor (assigned seating)",
            "Tribun ujung belakang",
            "Akses food court & merchandise",
        ],
    },
    {
        "name":        "CAT 6",
        "description": "Tribun Belakang — kursi bernomor",
        "quota":       1_450,
        "tier":        "tribun",
        "zone":        "Corner-SE",
        "emoji":       "🎫",
        "benefits": [
            "Kursi bernomor (assigned seating)",
            "Tribun belakang",
            "Akses food court & merchandise",
        ],
    },
]
# Total: 170+280+1700+1100+1700+1700+2200+1700+1450 = 12,000

WRISTBAND_INVENTORY = [
    {"color": "Gold",   "color_hex": "#FFD700", "type": "VVIP PIT"},
    {"color": "Teal",   "color_hex": "#00A39D", "type": "VIP ZONE"},
    {"color": "Orange", "color_hex": "#F8AD3C", "type": "FESTIVAL"},
    {"color": "Merah",  "color_hex": "#EF4444", "type": "CAT 1"},
    {"color": "Biru",   "color_hex": "#3B82F6", "type": "CAT 2"},
    {"color": "Hijau",  "color_hex": "#22C55E", "type": "CAT 3"},
    {"color": "Ungu",   "color_hex": "#A855F7", "type": "CAT 4"},
    {"color": "Putih",  "color_hex": "#F8FAFC", "type": "CAT 5"},
    {"color": "Kuning", "color_hex": "#EAB308", "type": "CAT 6"},
]

COUNTERS_TEMPLATE = [
    {"name": "Counter A", "location": "Gate 1"},
    {"name": "Counter B", "location": "Gate 3"},
    {"name": "Counter C", "location": "Gate 5"},
]

GATES_TEMPLATE = [
    {"name": "Gate 1", "type": "entry", "location": "North Entrance"},
    {"name": "Gate 2", "type": "entry", "location": "South Entrance"},
    {"name": "Gate 3", "type": "exit",  "location": "North Exit"},
    {"name": "Gate 4", "type": "both",  "location": "VIP Entrance/Exit"},
]

# ─── SQL Escaping ─────────────────────────────────────────────────────────
def sql_str(s: str) -> str:
    """Escape a string for SQL single-quoted literal."""
    return s.replace("'", "''")

def sql_json(arr: list) -> str:
    """Convert a Python list to a SQL-escaped JSON string."""
    return sql_str(json.dumps(arr, ensure_ascii=False))

def sql_ts(dt: datetime) -> str:
    """Format datetime for PostgreSQL TIMESTAMPTZ literal."""
    return dt.strftime("%Y-%m-%d %H:%M:%S+00")

# ─── Generate deterministic UUID for ticket types ────────────────────────
def make_tt_id(event_idx: int, tt_idx: int) -> str:
    """Generate a deterministic UUID for a ticket type based on event and type index."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"tt-e{event_idx}-t{tt_idx}"))

# ─── Generate the SQL ─────────────────────────────────────────────────────
def generate_sql() -> str:
    lines: list[str] = []
    now = datetime(2025, 3, 1, 12, 0, 0, tzinfo=timezone.utc)

    lines.append("-- ============================================================================")
    lines.append("-- SeleEvent — Seed Data for GCP Cloud SQL (PostgreSQL)")
    lines.append("-- Sheila On 7 'Melompat Lebih Tinggi' Tour 2025")
    lines.append("-- 5 Cities × 12,000 tickets = 60,000 total, 5% platform fee")
    lines.append("-- ============================================================================")
    lines.append("")

    # ─── Add platform_fee column if not exists ────────────────────────────
    lines.append("-- ─── Add platform_fee column to ticket_types ────────────────────────────")
    lines.append("ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(5,2) NOT NULL DEFAULT 0;")
    lines.append("")

    # ─── Clean existing data (reverse dependency order) ───────────────────
    lines.append("-- ─── Clean existing data ────────────────────────────────────────────────")
    lines.append("DELETE FROM gate_logs_default;")
    lines.append("DELETE FROM gate_logs_2026_04;")
    lines.append("DELETE FROM redemptions;")
    lines.append("DELETE FROM gate_staff;")
    lines.append("DELETE FROM counter_staff;")
    lines.append("DELETE FROM notifications;")
    lines.append("DELETE FROM audit_logs;")
    lines.append("DELETE FROM tickets;")
    lines.append("DELETE FROM order_items;")
    lines.append("DELETE FROM orders;")
    lines.append("DELETE FROM seats;")
    lines.append("DELETE FROM ticket_types;")
    lines.append("DELETE FROM wristband_inventories;")
    lines.append("DELETE FROM counters;")
    lines.append("DELETE FROM gates;")
    lines.append("DELETE FROM subscriptions;")
    lines.append("DELETE FROM tenant_users;")
    lines.append("DELETE FROM invoice;")
    lines.append("DELETE FROM invoices;")
    lines.append("DELETE FROM events;")
    lines.append("DELETE FROM users;")
    lines.append("DELETE FROM tenants;")
    lines.append("")

    # ─── TENANT ──────────────────────────────────────────────────────────
    lines.append("-- ─── TENANT ────────────────────────────────────────────────────────────")
    lines.append(f"""INSERT INTO tenants (id, name, slug, primary_color, secondary_color, plan, is_active, max_events, max_tickets, created_at, updated_at)
VALUES (
    '{TENANT_ID}',
    'SeleEvent',
    'seleevent',
    '#00A39D',
    '#F8AD3C',
    'enterprise',
    true,
    10,
    100000,
    '{sql_ts(now)}',
    '{sql_ts(now)}'
);""")
    lines.append("")

    # ─── USERS ──────────────────────────────────────────────────────────
    lines.append("-- ─── USERS ─────────────────────────────────────────────────────────────")
    users = [
        (USER_IDS["bukdan"], "google-superadmin", "bukdan@seleevent.id", "Bukdan Admin",      "SUPER_ADMIN",   "active"),
        (USER_IDS["rizky"],  "google-admin",       "rizky@seleevent.id",  "Rizky Pratama",     "ADMIN",         "active"),
        (USER_IDS["andi"],   "google-organizer",   "andi.wijaya@gmail.com", "Andi Wijaya",     "ORGANIZER",     "active"),
        (USER_IDS["rina"],   "google-counter",     "rina.w@gmail.com",    "Rina Wulandari",    "COUNTER_STAFF", "active"),
        (USER_IDS["bayu"],   "google-gate",        "bayu.a@gmail.com",    "Bayu Aditya",       "GATE_STAFF",    "active"),
        (USER_IDS["budi"],   "google-participant", "budi.santoso@gmail.com", "Budi Santoso",  "PARTICIPANT",   "active"),
    ]
    lines.append("INSERT INTO users (id, google_id, email, name, role, status, created_at, updated_at) VALUES")
    user_vals = []
    for uid, gid, email, name, role, status in users:
        user_vals.append(
            f"    ('{uid}', '{gid}', '{sql_str(email)}', '{sql_str(name)}', '{role}', '{status}', '{sql_ts(now)}', '{sql_ts(now)}')"
        )
    lines.append(",\n".join(user_vals))
    lines.append(";")
    lines.append("")

    # ─── TENANT_USERS ──────────────────────────────────────────────────
    lines.append("-- ─── TENANT_USERS ──────────────────────────────────────────────────────")
    tu_roles = {
        "bukdan": "SUPER_ADMIN", "rizky": "ADMIN", "andi": "ORGANIZER",
        "rina": "COUNTER_STAFF", "bayu": "GATE_STAFF", "budi": "PARTICIPANT",
    }
    lines.append("INSERT INTO tenant_users (id, user_id, tenant_id, role, is_active, joined_at, created_at, updated_at) VALUES")
    tu_vals = []
    for i, (key, uid) in enumerate(USER_IDS.items()):
        tu_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"tu-{uid}"))
        tu_vals.append(
            f"    ('{tu_id}', '{uid}', '{TENANT_ID}', '{tu_roles[key]}', true, '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')"
        )
    lines.append(",\n".join(tu_vals))
    lines.append(";")
    lines.append("")

    # ─── SUBSCRIPTION ──────────────────────────────────────────────────
    lines.append("-- ─── SUBSCRIPTION ──────────────────────────────────────────────────────")
    sub_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "sub-seleevent"))
    period_end = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
    lines.append(f"""INSERT INTO subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
VALUES (
    '{sub_id}',
    '{TENANT_ID}',
    'enterprise',
    'active',
    '{sql_ts(now)}',
    '{sql_ts(period_end)}',
    '{sql_ts(now)}',
    '{sql_ts(now)}'
);""")
    lines.append("")

    # ─── EVENTS ──────────────────────────────────────────────────────────
    lines.append("-- ─── EVENTS ───────────────────────────────────────────────────────────")
    lines.append("INSERT INTO events (id, tenant_id, slug, title, subtitle, date, doors_open, venue, city, address, capacity, status, created_at, updated_at) VALUES")
    event_vals = []
    for evt in EVENTS:
        total_quota = sum(tt["quota"] for tt in TICKET_TYPE_DEFS)
        event_vals.append(
            f"    ('{evt['id']}', '{TENANT_ID}', '{sql_str(evt['slug'])}', "
            f"'{sql_str(evt['title'])}', '{sql_str(evt['subtitle'])}', "
            f"'{sql_ts(evt['date'])}', '{sql_ts(evt['doors'])}', "
            f"'{sql_str(evt['venue'])}', '{sql_str(evt['city'])}', '{sql_str(evt['address'])}', "
            f"{total_quota}, 'published', '{sql_ts(now)}', '{sql_ts(now)}')"
        )
    lines.append(",\n".join(event_vals))
    lines.append(";")
    lines.append("")

    # ─── TICKET_TYPES (all 5 events × 9 types = 45 rows) ────────────────
    lines.append("-- ─── TICKET_TYPES ──────────────────────────────────────────────────────")
    lines.append("INSERT INTO ticket_types (id, tenant_id, event_id, name, description, price, quota, sold, tier, zone, emoji, benefits, platform_fee, created_at, updated_at) VALUES")

    random.seed(42)  # Deterministic sold counts
    tt_all_vals = []
    # Track sold per event for wristband inventory
    event_sold_data: dict[int, dict[str, int]] = {}

    for eidx, evt in enumerate(EVENTS):
        event_sold_data[eidx] = {}
        for tidx, tt in enumerate(TICKET_TYPE_DEFS):
            tt_id = make_tt_id(eidx, tidx)
            price = evt["prices"][tt["name"]]
            quota = tt["quota"]

            # Random sold count: 40-85% of quota, deterministic per seed
            sold_pct = random.uniform(0.40, 0.85)
            sold = int(quota * sold_pct)
            # Ensure at least some available
            sold = min(sold, quota - 5)
            sold = max(sold, 0)

            event_sold_data[eidx][tt["name"]] = sold

            benefits_json = sql_json(tt["benefits"])
            tt_all_vals.append(
                f"    ('{tt_id}', '{TENANT_ID}', '{evt['id']}', '{sql_str(tt['name'])}', "
                f"'{sql_str(tt['description'])}', {price}, {quota}, {sold}, "
                f"'{tt['tier']}', '{tt['zone']}', '{tt['emoji']}', "
                f"'{benefits_json}', {PLATFORM_FEE_PCT}, "
                f"'{sql_ts(now)}', '{sql_ts(now)}')"
            )

    lines.append(",\n".join(tt_all_vals))
    lines.append(";")
    lines.append("")

    # ─── COUNTERS (3 per event = 15 rows) ───────────────────────────────
    lines.append("-- ─── COUNTERS ──────────────────────────────────────────────────────────")
    lines.append("INSERT INTO counters (id, tenant_id, event_id, name, location, capacity, status, created_at, updated_at) VALUES")
    c_vals = []
    counter_ids_by_event: dict[int, list[str]] = {}
    for eidx, evt in enumerate(EVENTS):
        counter_ids_by_event[eidx] = []
        for cidx, c in enumerate(COUNTERS_TEMPLATE):
            cid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"counter-{eidx}-{cidx}"))
            counter_ids_by_event[eidx].append(cid)
            c_vals.append(
                f"    ('{cid}', '{TENANT_ID}', '{evt['id']}', '{sql_str(c['name'])}', "
                f"'{sql_str(c['location'])}', 500, 'active', '{sql_ts(now)}', '{sql_ts(now)}')"
            )
    lines.append(",\n".join(c_vals))
    lines.append(";")
    lines.append("")

    # ─── GATES (4 per event = 20 rows) ──────────────────────────────────
    lines.append("-- ─── GATES ─────────────────────────────────────────────────────────────")
    lines.append("INSERT INTO gates (id, tenant_id, event_id, name, type, location, capacity_per_min, status, created_at, updated_at) VALUES")
    g_vals = []
    gate_ids_by_event: dict[int, list[str]] = {}
    for eidx, evt in enumerate(EVENTS):
        gate_ids_by_event[eidx] = []
        for gidx, g in enumerate(GATES_TEMPLATE):
            gid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"gate-{eidx}-{gidx}"))
            gate_ids_by_event[eidx].append(gid)
            g_vals.append(
                f"    ('{gid}', '{TENANT_ID}', '{evt['id']}', '{sql_str(g['name'])}', "
                f"'{g['type']}', '{sql_str(g['location'])}', 30, 'active', "
                f"'{sql_ts(now)}', '{sql_ts(now)}')"
            )
    lines.append(",\n".join(g_vals))
    lines.append(";")
    lines.append("")

    # ─── COUNTER_STAFF (Rina → Counter A for each event) ────────────────
    lines.append("-- ─── COUNTER_STAFF ─────────────────────────────────────────────────────")
    cs_vals = []
    for eidx in range(len(EVENTS)):
        cs_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"counter-staff-rina-{eidx}"))
        cs_vals.append(
            f"    ('{cs_id}', '{TENANT_ID}', '{USER_IDS['rina']}', '{counter_ids_by_event[eidx][0]}', "
            f"'active', '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')"
        )
    lines.append("INSERT INTO counter_staff (id, tenant_id, user_id, counter_id, status, assigned_at, created_at, updated_at) VALUES")
    lines.append(",\n".join(cs_vals))
    lines.append(";")
    lines.append("")

    # ─── GATE_STAFF (Bayu → Gate 1 for each event) ──────────────────────
    lines.append("-- ─── GATE_STAFF ────────────────────────────────────────────────────────")
    gs_vals = []
    for eidx in range(len(EVENTS)):
        gs_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"gate-staff-bayu-{eidx}"))
        gs_vals.append(
            f"    ('{gs_id}', '{TENANT_ID}', '{USER_IDS['bayu']}', '{gate_ids_by_event[eidx][0]}', "
            f"'active', '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')"
        )
    lines.append("INSERT INTO gate_staff (id, tenant_id, user_id, gate_id, status, assigned_at, created_at, updated_at) VALUES")
    lines.append(",\n".join(gs_vals))
    lines.append(";")
    lines.append("")

    # ─── WRISTBAND_INVENTORIES (9 per event = 45 rows) ──────────────────
    lines.append("-- ─── WRISTBAND_INVENTORIES ─────────────────────────────────────────────")
    lines.append("INSERT INTO wristband_inventories (id, tenant_id, event_id, color, color_hex, type, total_stock, used_stock, remaining_stock, created_at, updated_at) VALUES")
    wi_vals = []
    for eidx, evt in enumerate(EVENTS):
        for widx, wi in enumerate(WRISTBAND_INVENTORY):
            wi_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"wi-{eidx}-{widx}"))
            tt_def = TICKET_TYPE_DEFS[widx]
            total = tt_def["quota"]
            used = event_sold_data[eidx][tt_def["name"]]
            remaining = total - used
            wi_vals.append(
                f"    ('{wi_id}', '{TENANT_ID}', '{evt['id']}', '{sql_str(wi['color'])}', "
                f"'{wi['color_hex']}', '{sql_str(wi['type'])}', {total}, {used}, {remaining}, "
                f"'{sql_ts(now)}', '{sql_ts(now)}')"
            )
    lines.append(",\n".join(wi_vals))
    lines.append(";")
    lines.append("")

    # ─── Summary ──────────────────────────────────────────────────────
    lines.append("-- ─── SEED SUMMARY ──────────────────────────────────────────────────────")
    total_all_quota = sum(tt["quota"] for tt in TICKET_TYPE_DEFS) * len(EVENTS)
    total_all_sold = sum(
        event_sold_data[eidx][tt["name"]]
        for eidx in range(len(EVENTS))
        for tt in TICKET_TYPE_DEFS
    )
    lines.append(f"-- Total events: {len(EVENTS)}")
    lines.append(f"-- Total quota:  {total_all_quota:,}")
    lines.append(f"-- Total sold:   {total_all_sold:,}")
    lines.append(f"-- Total available: {total_all_quota - total_all_sold:,}")
    lines.append(f"-- Platform fee: {PLATFORM_FEE_PCT}% per ticket")
    lines.append("")

    for eidx, evt in enumerate(EVENTS):
        lines.append(f"-- ─── {evt['city']} ({evt['slug']}) ───")
        event_quota = sum(tt["quota"] for tt in TICKET_TYPE_DEFS)
        event_sold = sum(event_sold_data[eidx][tt["name"]] for tt in TICKET_TYPE_DEFS)
        lines.append(f"--   Quota: {event_quota:,} | Sold: {event_sold:,} | Available: {event_quota - event_sold:,}")
        for tt in TICKET_TYPE_DEFS:
            price = evt["prices"][tt["name"]]
            fee = int(price * PLATFORM_FEE_PCT / 100)
            sold = event_sold_data[eidx][tt["name"]]
            lines.append(f"--   {tt['name']:12s} | Rp {price:>10,} + fee Rp {fee:>8,} | quota: {tt['quota']:>5,} | sold: {sold:>5,} | avail: {tt['quota']-sold:>5,}")
        lines.append("")

    lines.append("-- ============================================================================")
    lines.append("-- END OF SEED DATA")
    lines.append("-- ============================================================================")

    return "\n".join(lines)


if __name__ == "__main__":
    sql = generate_sql()
    output_path = "/home/z/my-project/backend/database/seed-data.sql"
    with open(output_path, "w") as f:
        f.write(sql + "\n")
    print(f"✅ Seed SQL written to {output_path}")

    # Print summary
    random.seed(42)
    total_quota = sum(tt["quota"] for tt in TICKET_TYPE_DEFS) * len(EVENTS)
    # Recalculate sold for summary
    total_sold = 0
    for eidx in range(len(EVENTS)):
        for tt in TICKET_TYPE_DEFS:
            sold_pct = random.uniform(0.40, 0.85)
            sold = int(tt["quota"] * sold_pct)
            sold = min(sold, tt["quota"] - 5)
            sold = max(sold, 0)
            total_sold += sold

    print(f"   Events: {len(EVENTS)}")
    print(f"   Total quota: {total_quota:,}")
    print(f"   Total sold: {total_sold:,}")
    print(f"   Total available: {total_quota - total_sold:,}")
    print(f"   Platform fee: {PLATFORM_FEE_PCT}%")
