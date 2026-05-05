#!/bin/bash
# =============================================================
#  SELEEVENT — Quick Seed Cloud SQL dari Google Cloud Shell
#
#  Sheila On 7 "Melompat Lebih Tinggi" Tour 2025
#  5 Cities × 12,000 tickets = 60,000 total, 5% platform fee
#
#  Script ini SELF-CONTAINED — tidak perlu clone repo!
#  Cukup paste ke Cloud Shell dan jalankan.
#
#  Yang dilakukan:
#    1. Generate seed SQL (Python inline)
#    2. Upload ke Cloud Storage
#    3. Import ke Cloud SQL
#    4. Verifikasi data
#
#  Prasyarat:
#    - gcloud auth login
#    - gcloud config set project eventku-494416
#
#  Cara Pakai:
#    1. Buka Google Cloud Shell: https://shell.cloud.google.com
#    2. Paste script ini atau download:
#       curl -sL <URL> -o cloudshell-quick-seed.sh && bash cloudshell-quick-seed.sh
#    3. Atau: bash cloudshell-quick-seed.sh --yes  (non-interaktif)
# =============================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
INSTANCE_NAME="eventku"
DB_NAME="eventku"
DB_USER="eventku"
BUCKET="${PROJECT_ID}-seed-data"

SKIP_CONFIRM=false
if [[ "${1:-}" == "--yes" || "${1:-}" == "-y" ]]; then
    SKIP_CONFIRM=true
fi

echo "================================================"
echo "  SELEEVENT — Quick Seed Cloud SQL"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  Database: $DB_NAME"
echo "  5 Cities × 12,000 tickets = 60,000 total"
echo "================================================"
echo ""

# ─── Step 0: Verify prerequisites ─────────────────────────
echo "▸ Step 0: Verifikasi prerequisites..."

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    echo "❌ Error: Belum login. Jalankan: gcloud auth login"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Set project ke $PROJECT_ID..."
    gcloud config set project "$PROJECT_ID"
fi

echo "  ✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format="value(account)")"
echo ""

# ─── Step 1: Generate seed SQL dengan Python ──────────────
echo "▸ Step 1: Generate seed SQL (5 kota, 60.000 tiket)..."

SEED_FILE="/tmp/seleevent-seed-data.sql"

python3 << 'PYTHON_SCRIPT' > "$SEED_FILE"
#!/usr/bin/env python3
"""Generate seed SQL for SeleEvent — 5 Cities Tour"""
import json, random, uuid
from datetime import datetime, timezone

TENANT_ID = "10000000-0000-0000-0000-000000000001"
USER_IDS = {
    "bukdan": "40000000-0000-0000-0000-000000000001",
    "rizky":  "40000000-0000-0000-0000-000000000002",
    "andi":   "40000000-0000-0000-0000-000000000003",
    "rina":   "40000000-0000-0000-0000-000000000004",
    "bayu":   "40000000-0000-0000-0000-000000000005",
    "budi":   "40000000-0000-0000-0000-000000000006",
}
PLATFORM_FEE_PCT = 5

EVENTS = [
    {"id":"30000000-0000-0000-0000-000000000001","slug":"sheila-on7-bandung","title":"Sheila On 7 — BANDUNG","subtitle":"Melompat Lebih Tinggi Tour 2025","date":datetime(2025,6,1,12,0,0,tzinfo=timezone.utc),"doors":datetime(2025,6,1,9,0,0,tzinfo=timezone.utc),"venue":"Baros Field","city":"Bandung","address":"Jl. Baros No.1, Cimahi, Jawa Barat 40511","prices":{"VVIP PIT":3250000,"VIP ZONE":2600000,"FESTIVAL":2000000,"CAT 1":1600000,"CAT 2":1300000,"CAT 3":1000000,"CAT 4":750000,"CAT 5":500000,"CAT 6":300000}},
    {"id":"30000000-0000-0000-0000-000000000002","slug":"sheila-on7-makassar","title":"Sheila On 7 — MAKASSAR","subtitle":"Melompat Lebih Tinggi Tour 2025","date":datetime(2025,6,8,12,0,0,tzinfo=timezone.utc),"doors":datetime(2025,6,8,9,0,0,tzinfo=timezone.utc),"venue":"Pantai Losari Arena","city":"Makassar","address":"Jl. Penghibur, Pantai Losari, Makassar, Sulawesi Selatan 90173","prices":{"VVIP PIT":3000000,"VIP ZONE":2400000,"FESTIVAL":1850000,"CAT 1":1450000,"CAT 2":1150000,"CAT 3":900000,"CAT 4":700000,"CAT 5":450000,"CAT 6":275000}},
    {"id":"30000000-0000-0000-0000-000000000003","slug":"sheila-on7-medan","title":"Sheila On 7 — MEDAN","subtitle":"Melompat Lebih Tinggi Tour 2025","date":datetime(2025,6,15,12,0,0,tzinfo=timezone.utc),"doors":datetime(2025,6,15,9,0,0,tzinfo=timezone.utc),"venue":"Lapangan Merdeka Medan","city":"Medan","address":"Jl. Balai Kota, Medan Bar., Kota Medan, Sumatera Utara 20112","prices":{"VVIP PIT":3000000,"VIP ZONE":2400000,"FESTIVAL":1850000,"CAT 1":1450000,"CAT 2":1150000,"CAT 3":900000,"CAT 4":700000,"CAT 5":450000,"CAT 6":275000}},
    {"id":"30000000-0000-0000-0000-000000000004","slug":"sheila-on7-jakarta","title":"Sheila On 7 — JAKARTA","subtitle":"Melompat Lebih Tinggi Tour 2025","date":datetime(2025,6,22,12,0,0,tzinfo=timezone.utc),"doors":datetime(2025,6,22,9,0,0,tzinfo=timezone.utc),"venue":"GBK Madya Stadium","city":"Jakarta","address":"Jl. Gatot Subroto, Senayan, Kebayoran Baru, Jakarta Pusat 10270","prices":{"VVIP PIT":3500000,"VIP ZONE":2800000,"FESTIVAL":2200000,"CAT 1":1750000,"CAT 2":1400000,"CAT 3":1100000,"CAT 4":850000,"CAT 5":550000,"CAT 6":350000}},
    {"id":"30000000-0000-0000-0000-000000000005","slug":"sheila-on7-balikpapan","title":"Sheila On 7 — BALIKPAPAN","subtitle":"Melompat Lebih Tinggi Tour 2025","date":datetime(2025,6,29,12,0,0,tzinfo=timezone.utc),"doors":datetime(2025,6,29,9,0,0,tzinfo=timezone.utc),"venue":"Lapangan Merdeka BPN","city":"Balikpapan","address":"Jl. Jend. Sudirman, Balikpapan Kota, Kalimantan Timur 76113","prices":{"VVIP PIT":2750000,"VIP ZONE":2200000,"FESTIVAL":1700000,"CAT 1":1350000,"CAT 2":1050000,"CAT 3":850000,"CAT 4":650000,"CAT 5":400000,"CAT 6":250000}},
]

TICKET_TYPE_DEFS = [
    {"name":"VVIP PIT","description":"Standing paling depan — barisan depan panggung","quota":170,"tier":"floor","zone":"PIT","emoji":"👑","benefits":["Standing paling depan (barrier VVIP)","Welcome drink + F&B gratis sepuasnya","Exclusive merchandise pack (T-shirt + Poster)","Early entry 30 menit sebelum gate buka","Wristband premium (gold embossed)","Meet & Greet session sebelum konser","Photobooth area eksklusif","Lounge area dengan sofa dan AC"]},
    {"name":"VIP ZONE","description":"Standing VIP — di belakang VVIP Pit","quota":280,"tier":"floor","zone":"VIP","emoji":"⭐","benefits":["Standing zone VIP (di belakang VVIP)","Dedicated bar & food stall","Merchandise discount 20%","Early entry 15 menit","Wristband VIP (teal embossed)"]},
    {"name":"FESTIVAL","description":"General admission standing — bebas pilih posisi","quota":1700,"tier":"floor","zone":"Festival","emoji":"🎵","benefits":["General admission standing area","Bebas pilih posisi dalam area festival","Akses food court & merchandise area"]},
    {"name":"CAT 1","description":"Tribun Bawah Kiri — kursi bernomor","quota":1100,"tier":"tribun","zone":"West","emoji":"🎟️","benefits":["Kursi bernomor (assigned seating)","Tribun bawah kiri — view premium","Pemandangan stage jelas","Akses food court & merchandise"]},
    {"name":"CAT 2","description":"Tribun Tengah Kiri — kursi bernomor","quota":1700,"tier":"tribun","zone":"East","emoji":"🎫","benefits":["Kursi bernomor (assigned seating)","Tribun tengah kiri — view baik","Akses food court & merchandise"]},
    {"name":"CAT 3","description":"Tribun Tengah Kanan — kursi bernomor","quota":1700,"tier":"tribun","zone":"North","emoji":"🎫","benefits":["Kursi bernomor (assigned seating)","Tribun tengah kanan — view baik","Akses food court & merchandise"]},
    {"name":"CAT 4","description":"Tribun Atas Kanan — kursi bernomor","quota":2200,"tier":"tribun","zone":"South","emoji":"🎟️","benefits":["Kursi bernomor (assigned seating)","Tribun atas kanan","Akses food court & merchandise"]},
    {"name":"CAT 5","description":"Tribun Ujung Belakang — kursi bernomor","quota":1700,"tier":"tribun","zone":"Corner-NW","emoji":"🎟️","benefits":["Kursi bernomor (assigned seating)","Tribun ujung belakang","Akses food court & merchandise"]},
    {"name":"CAT 6","description":"Tribun Belakang — kursi bernomor","quota":1450,"tier":"tribun","zone":"Corner-SE","emoji":"🎫","benefits":["Kursi bernomor (assigned seating)","Tribun belakang","Akses food court & merchandise"]},
]

WRISTBAND_INVENTORY = [
    {"color":"Gold","color_hex":"#FFD700","type":"VVIP PIT"},
    {"color":"Teal","color_hex":"#00A39D","type":"VIP ZONE"},
    {"color":"Orange","color_hex":"#F8AD3C","type":"FESTIVAL"},
    {"color":"Merah","color_hex":"#EF4444","type":"CAT 1"},
    {"color":"Biru","color_hex":"#3B82F6","type":"CAT 2"},
    {"color":"Hijau","color_hex":"#22C55E","type":"CAT 3"},
    {"color":"Ungu","color_hex":"#A855F7","type":"CAT 4"},
    {"color":"Putih","color_hex":"#F8FAFC","type":"CAT 5"},
    {"color":"Kuning","color_hex":"#EAB308","type":"CAT 6"},
]

COUNTERS_TEMPLATE = [
    {"name":"Counter A","location":"Gate 1"},
    {"name":"Counter B","location":"Gate 3"},
    {"name":"Counter C","location":"Gate 5"},
]

GATES_TEMPLATE = [
    {"name":"Gate 1","type":"entry","location":"North Entrance"},
    {"name":"Gate 2","type":"entry","location":"South Entrance"},
    {"name":"Gate 3","type":"exit","location":"North Exit"},
    {"name":"Gate 4","type":"both","location":"VIP Entrance/Exit"},
]

def sql_str(s): return s.replace("'", "''")
def sql_json(arr): return sql_str(json.dumps(arr, ensure_ascii=False))
def sql_ts(dt): return dt.strftime("%Y-%m-%d %H:%M:%S+00")
def make_tt_id(e, t): return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"tt-e{e}-t{t}"))

lines = []
now = datetime(2025, 3, 1, 12, 0, 0, tzinfo=timezone.utc)

lines.append("-- SeleEvent Seed Data — 5 Cities × 12,000 tickets = 60,000 total, 5% fee")
lines.append("")
lines.append("ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(5,2) NOT NULL DEFAULT 0;")
lines.append("")
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

# TENANT
lines.append(f"INSERT INTO tenants (id, name, slug, primary_color, secondary_color, plan, is_active, max_events, max_tickets, created_at, updated_at) VALUES ('{TENANT_ID}', 'SeleEvent', 'seleevent', '#00A39D', '#F8AD3C', 'enterprise', true, 10, 100000, '{sql_ts(now)}', '{sql_ts(now)}');")
lines.append("")

# USERS
users = [
    (USER_IDS["bukdan"], "google-superadmin", "bukdan@seleevent.id", "Bukdan Admin", "SUPER_ADMIN", "active"),
    (USER_IDS["rizky"], "google-admin", "rizky@seleevent.id", "Rizky Pratama", "ADMIN", "active"),
    (USER_IDS["andi"], "google-organizer", "andi.wijaya@gmail.com", "Andi Wijaya", "ORGANIZER", "active"),
    (USER_IDS["rina"], "google-counter", "rina.w@gmail.com", "Rina Wulandari", "COUNTER_STAFF", "active"),
    (USER_IDS["bayu"], "google-gate", "bayu.a@gmail.com", "Bayu Aditya", "GATE_STAFF", "active"),
    (USER_IDS["budi"], "google-participant", "budi.santoso@gmail.com", "Budi Santoso", "PARTICIPANT", "active"),
]
lines.append("INSERT INTO users (id, google_id, email, name, role, status, created_at, updated_at) VALUES")
lines.append(",\n".join([f"    ('{uid}', '{gid}', '{sql_str(email)}', '{sql_str(name)}', '{role}', '{status}', '{sql_ts(now)}', '{sql_ts(now)}')" for uid, gid, email, name, role, status in users]))
lines.append(";")
lines.append("")

# TENANT_USERS
tu_roles = {"bukdan":"SUPER_ADMIN","rizky":"ADMIN","andi":"ORGANIZER","rina":"COUNTER_STAFF","bayu":"GATE_STAFF","budi":"PARTICIPANT"}
lines.append("INSERT INTO tenant_users (id, user_id, tenant_id, role, is_active, joined_at, created_at, updated_at) VALUES")
tu_vals = []
for i, (key, uid) in enumerate(USER_IDS.items()):
    tu_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"tu-{uid}"))
    tu_vals.append(f"    ('{tu_id}', '{uid}', '{TENANT_ID}', '{tu_roles[key]}', true, '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append(",\n".join(tu_vals))
lines.append(";")
lines.append("")

# SUBSCRIPTION
sub_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "sub-seleevent"))
period_end = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
lines.append(f"INSERT INTO subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, created_at, updated_at) VALUES ('{sub_id}', '{TENANT_ID}', 'enterprise', 'active', '{sql_ts(now)}', '{sql_ts(period_end)}', '{sql_ts(now)}', '{sql_ts(now)}');")
lines.append("")

# EVENTS
lines.append("INSERT INTO events (id, tenant_id, slug, title, subtitle, date, doors_open, venue, city, address, capacity, status, created_at, updated_at) VALUES")
event_vals = []
for evt in EVENTS:
    total_quota = sum(tt["quota"] for tt in TICKET_TYPE_DEFS)
    event_vals.append(f"    ('{evt['id']}', '{TENANT_ID}', '{sql_str(evt['slug'])}', '{sql_str(evt['title'])}', '{sql_str(evt['subtitle'])}', '{sql_ts(evt['date'])}', '{sql_ts(evt['doors'])}', '{sql_str(evt['venue'])}', '{sql_str(evt['city'])}', '{sql_str(evt['address'])}', {total_quota}, 'published', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append(",\n".join(event_vals))
lines.append(";")
lines.append("")

# TICKET_TYPES
lines.append("INSERT INTO ticket_types (id, tenant_id, event_id, name, description, price, quota, sold, tier, zone, emoji, benefits, platform_fee, created_at, updated_at) VALUES")
random.seed(42)
tt_all_vals = []
event_sold_data = {}
for eidx, evt in enumerate(EVENTS):
    event_sold_data[eidx] = {}
    for tidx, tt in enumerate(TICKET_TYPE_DEFS):
        tt_id = make_tt_id(eidx, tidx)
        price = evt["prices"][tt["name"]]
        quota = tt["quota"]
        sold_pct = random.uniform(0.40, 0.85)
        sold = int(quota * sold_pct)
        sold = min(sold, quota - 5)
        sold = max(sold, 0)
        event_sold_data[eidx][tt["name"]] = sold
        benefits_json = sql_json(tt["benefits"])
        tt_all_vals.append(f"    ('{tt_id}', '{TENANT_ID}', '{evt['id']}', '{sql_str(tt['name'])}', '{sql_str(tt['description'])}', {price}, {quota}, {sold}, '{tt['tier']}', '{tt['zone']}', '{tt['emoji']}', '{benefits_json}', {PLATFORM_FEE_PCT}, '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append(",\n".join(tt_all_vals))
lines.append(";")
lines.append("")

# COUNTERS
lines.append("INSERT INTO counters (id, tenant_id, event_id, name, location, capacity, status, created_at, updated_at) VALUES")
c_vals = []
counter_ids_by_event = {}
for eidx, evt in enumerate(EVENTS):
    counter_ids_by_event[eidx] = []
    for cidx, c in enumerate(COUNTERS_TEMPLATE):
        cid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"counter-{eidx}-{cidx}"))
        counter_ids_by_event[eidx].append(cid)
        c_vals.append(f"    ('{cid}', '{TENANT_ID}', '{evt['id']}', '{sql_str(c['name'])}', '{sql_str(c['location'])}', 500, 'active', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append(",\n".join(c_vals))
lines.append(";")
lines.append("")

# GATES
lines.append("INSERT INTO gates (id, tenant_id, event_id, name, type, location, capacity_per_min, status, created_at, updated_at) VALUES")
g_vals = []
gate_ids_by_event = {}
for eidx, evt in enumerate(EVENTS):
    gate_ids_by_event[eidx] = []
    for gidx, g in enumerate(GATES_TEMPLATE):
        gid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"gate-{eidx}-{gidx}"))
        gate_ids_by_event[eidx].append(gid)
        g_vals.append(f"    ('{gid}', '{TENANT_ID}', '{evt['id']}', '{sql_str(g['name'])}', '{g['type']}', '{sql_str(g['location'])}', 30, 'active', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append(",\n".join(g_vals))
lines.append(";")
lines.append("")

# COUNTER_STAFF
cs_vals = []
for eidx in range(len(EVENTS)):
    cs_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"counter-staff-rina-{eidx}"))
    cs_vals.append(f"    ('{cs_id}', '{TENANT_ID}', '{USER_IDS['rina']}', '{counter_ids_by_event[eidx][0]}', 'active', '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append("INSERT INTO counter_staff (id, tenant_id, user_id, counter_id, status, assigned_at, created_at, updated_at) VALUES")
lines.append(",\n".join(cs_vals))
lines.append(";")
lines.append("")

# GATE_STAFF
gs_vals = []
for eidx in range(len(EVENTS)):
    gs_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"gate-staff-bayu-{eidx}"))
    gs_vals.append(f"    ('{gs_id}', '{TENANT_ID}', '{USER_IDS['bayu']}', '{gate_ids_by_event[eidx][0]}', 'active', '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append("INSERT INTO gate_staff (id, tenant_id, user_id, gate_id, status, assigned_at, created_at, updated_at) VALUES")
lines.append(",\n".join(gs_vals))
lines.append(";")
lines.append("")

# WRISTBAND_INVENTORIES
wi_vals = []
for eidx, evt in enumerate(EVENTS):
    for widx, wi in enumerate(WRISTBAND_INVENTORY):
        wi_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"wi-{eidx}-{widx}"))
        tt_def = TICKET_TYPE_DEFS[widx]
        total = tt_def["quota"]
        used = event_sold_data[eidx][tt_def["name"]]
        remaining = total - used
        wi_vals.append(f"    ('{wi_id}', '{TENANT_ID}', '{evt['id']}', '{sql_str(wi['color'])}', '{wi['color_hex']}', '{sql_str(wi['type'])}', {total}, {used}, {remaining}, '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append("INSERT INTO wristband_inventories (id, tenant_id, event_id, color, color_hex, type, total_stock, used_stock, remaining_stock, created_at, updated_at) VALUES")
lines.append(",\n".join(wi_vals))
lines.append(";")
lines.append("")

# Summary
total_all_quota = sum(tt["quota"] for tt in TICKET_TYPE_DEFS) * len(EVENTS)
total_all_sold = sum(event_sold_data[eidx][tt["name"]] for eidx in range(len(EVENTS)) for tt in TICKET_TYPE_DEFS)
lines.append(f"-- Total events: {len(EVENTS)}")
lines.append(f"-- Total quota:  {total_all_quota:,}")
lines.append(f"-- Total sold:   {total_all_sold:,}")
lines.append(f"-- Total available: {total_all_quota - total_all_sold:,}")
lines.append(f"-- Platform fee: {PLATFORM_FEE_PCT}%")

print("\n".join(lines))
PYTHON_SCRIPT

if [ ! -f "$SEED_FILE" ] || [ ! -s "$SEED_FILE" ]; then
    echo "❌ Error: Gagal generate seed SQL"
    exit 1
fi

echo "  ✅ Seed SQL generated: $(wc -l < "$SEED_FILE") lines, $(du -h "$SEED_FILE" | cut -f1)"
echo ""

# ─── Step 2: Upload ke Cloud Storage ─────────────────────
echo "▸ Step 2: Upload seed SQL ke Cloud Storage..."

if ! gsutil ls "gs://${BUCKET}" &>/dev/null; then
    echo "  Membuat bucket: $BUCKET"
    gsutil mb -l "$REGION" "gs://${BUCKET}" 2>/dev/null || true
fi

gsutil cp "$SEED_FILE" "gs://${BUCKET}/seed-data.sql"
echo "  ✅ Uploaded ke gs://${BUCKET}/seed-data.sql"
echo ""

# ─── Step 3: Import ke Cloud SQL ──────────────────────────
echo "▸ Step 3: Import seed SQL ke Cloud SQL..."
echo "  ⚠️  Ini akan REPLACE semua data di database!"
echo ""

if [ "$SKIP_CONFIRM" = false ]; then
    read -p "  Lanjutkan? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "  Dibatalkan."
        exit 0
    fi
fi

echo "  Mengimport... (ini bisa 1-3 menit)"
gcloud sql import sql "$INSTANCE_NAME" "gs://${BUCKET}/seed-data.sql" \
    --database="$DB_NAME" \
    --project="$PROJECT_ID" \
    --quiet

echo "  ✅ Seed data berhasil diimport"
echo ""

# ─── Step 4: Verifikasi ──────────────────────────────────
echo "▸ Step 4: Verifikasi data..."

# Get the Cloud SQL public IP or use the API
API_URL="https://eventku-api-staging-lkfw4e5kna-et.a.run.app"

echo ""
echo "  Testing: GET /api/v1/events/sheila-on7-bandung"
BANDUNG=$(curl -s "${API_URL}/api/v1/events/sheila-on7-bandung" 2>/dev/null || echo "")
if echo "$BANDUNG" | grep -q "VVIP PIT"; then
    echo "  ✅ Bandung — tiket ditemukan!"
else
    echo "  ⚠️  Bandung response:"
    echo "$BANDUNG" | head -3
fi

echo ""
echo "  Testing: GET /api/v1/events/sheila-on7-jakarta"
JAKARTA=$(curl -s "${API_URL}/api/v1/events/sheila-on7-jakarta" 2>/dev/null || echo "")
if echo "$JAKARTA" | grep -q "VVIP PIT"; then
    echo "  ✅ Jakarta — tiket ditemukan!"
else
    echo "  ⚠️  Jakarta response:"
    echo "$JAKARTA" | head -3
fi

echo ""
echo "  Testing: GET /api/v1/events/sheila-on7-balikpapan"
BPN=$(curl -s "${API_URL}/api/v1/events/sheila-on7-balikpapan" 2>/dev/null || echo "")
if echo "$BPN" | grep -q "VVIP PIT"; then
    echo "  ✅ Balikpapan — tiket ditemukan!"
else
    echo "  ⚠️  Balikpapan response:"
    echo "$BPN" | head -3
fi

echo ""
echo "================================================"
echo "  ✅  QUICK SEED COMPLETE!"
echo "================================================"
echo ""
echo "  🌐 Frontend: https://eventku-web-staging-lkfw4e5kna-et.a.run.app"
echo "  🔌 API:      https://eventku-api-staging-lkfw4e5kna-et.a.run.app"
echo ""
echo "  🎫 5 Cities × 12,000 tickets = 60,000 total"
echo "     Bandung (1 Jun) | Makassar (8 Jun) | Medan (15 Jun)"
echo "     Jakarta (22 Jun) | Balikpapan (29 Jun)"
echo ""
echo "  💡 Jika backend perlu redeploy (kode berubah), jalankan:"
echo "     ./gcp/cloudshell-full-deploy.sh"
echo "================================================"
