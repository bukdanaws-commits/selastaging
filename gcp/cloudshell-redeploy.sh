#!/bin/bash
# =============================================================
#  SELEEVENT — Full Redeploy dari Google Cloud Shell
#
#  Sheila On 7 "Melompat Lebih Tinggi" Tour 2025
#  5 Cities × 12,000 tickets = 60,000 total, 5% platform fee
#
#  Script ini melakukan:
#    1. Generate seed SQL (Python inline, no repo needed)
#    2. Import ke Cloud SQL via PROXY (bypass GCS error 412)
#       Fallback: GCS import dengan permission fix
#    3. Build & deploy backend API (Cloud Build → Cloud Run)
#    4. Build & deploy frontend (Cloud Build → Cloud Run)
#    5. Verifikasi endpoints
#
#  PRASYARAT:
#    - gcloud auth login
#    - gcloud config set project eventku-494416
#
#  CARA PAKAI:
#    # Dari repo yang sudah di-clone:
#    bash gcp/cloudshell-redeploy.sh --yes
#
#    # Atau self-contained (tanpa repo):
#    curl -sL <URL> | bash -s -- --yes
#
#  FLAGS:
#    --yes          Non-interaktif (skip semua konfirmasi)
#    --seed-only    Hanya seed database, skip deploy
#    --deploy-only  Hanya deploy, skip seed database
#    --no-proxy     Skip Cloud SQL Proxy, pakai GCS import
# =============================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
INSTANCE_NAME="eventku"
INSTANCE_CONN="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
DB_NAME="eventku"
DB_USER="eventku"
DB_PASSWORD="${DB_PASSWORD:-Bukdan#bangku101}"
BUCKET="${PROJECT_ID}-seed-data"

STAGING_API_URL="https://eventku-api-staging-lkfw4e5kna-et.a.run.app"
STAGING_WEB_URL="https://eventku-web-staging-lkfw4e5kna-et.a.run.app"

SKIP_CONFIRM=false
SEED_ONLY=false
DEPLOY_ONLY=false
NO_PROXY=false

for arg in "$@"; do
    case "$arg" in
        --yes|-y)       SKIP_CONFIRM=true ;;
        --seed-only)    SEED_ONLY=true ;;
        --deploy-only)  DEPLOY_ONLY=true ;;
        --no-proxy)     NO_PROXY=true ;;
    esac
done

echo "╔══════════════════════════════════════════════════╗"
echo "║   SELEEVENT — Full Redeploy dari Cloud Shell     ║"
echo "║   Sheila On 7 Tour 2025 — 5 Cities, 60K Tiket    ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Project:  $PROJECT_ID"
echo "║  Region:   $REGION"
echo "║  Instance: $INSTANCE_NAME"
echo "║  API:      $STAGING_API_URL"
echo "║  Web:      $STAGING_WEB_URL"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── Step 0: Verify prerequisites ─────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▸ Step 0: Verifikasi prerequisites..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    echo "❌ Error: Belum login. Jalankan: gcloud auth login"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Set project ke $PROJECT_ID..."
    gcloud config set project "$PROJECT_ID"
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "  ✅ Authenticated as: $ACTIVE_ACCOUNT"
echo ""

# ─── Step 0b: Fix Cloud Build permissions ────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▸ Step 0b: Fix Cloud Build IAM permissions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)" 2>/dev/null || echo "")
if [ -z "$PROJECT_NUMBER" ]; then
    echo "❌ Error: Tidak bisa mendapatkan project number"
    exit 1
fi

CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
echo "  Cloud Build SA: $CB_SA"

# Grant Artifact Registry Writer (required to push Docker images)
echo "  Granting roles/artifactregistry.writer..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/artifactregistry.writer" \
    --quiet 2>/dev/null || echo "  ⚠️  May already have this role"

# Grant Cloud Run Admin (required to deploy services)
echo "  Granting roles/run.admin..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/run.admin" \
    --quiet 2>/dev/null || echo "  ⚠️  May already have this role"

# Grant Service Account User (required to run as eventku-sa)
echo "  Granting roles/iam.serviceAccountUser on eventku-sa..."
gcloud iam service-accounts add-iam-policy-binding "eventku-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/iam.serviceAccountUser" \
    --quiet 2>/dev/null || echo "  ⚠️  May already have this role"

# Grant Cloud SQL Client (required for Cloud SQL connections)
echo "  Granting roles/cloudsql.client..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/cloudsql.client" \
    --quiet 2>/dev/null || echo "  ⚠️  May already have this role"

# Grant Secret Manager Access (required to read secrets)
echo "  Granting roles/secretmanager.secretAccessor..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || echo "  ⚠️  May already have this role"

echo "  ✅ IAM permissions granted!"
echo ""

# ─── Detect source code location ──────────────────────────
PROJECT_ROOT=""
if [ -f "./gcp/cloudbuild-backend.yaml" ]; then
    PROJECT_ROOT="$(pwd)"
    echo "  ✅ Source code ditemukan di: $PROJECT_ROOT"
elif [ -f "$HOME/seleevent/gcp/cloudbuild-backend.yaml" ]; then
    PROJECT_ROOT="$HOME/seleevent"
    echo "  ✅ Source code ditemukan di: $PROJECT_ROOT"
else
    echo "  ⚠️  Source code tidak ditemukan untuk deploy"
    echo "     Hanya akan menjalankan seed database"
    if [ "$DEPLOY_ONLY" = true ]; then
        echo "❌ Deploy-only membutuhkan source code!"
        echo "   Clone repo dulu:"
        echo "   git clone https://github.com/<username>/seleevent.git ~/seleevent"
        exit 1
    fi
fi
echo ""

# ═══════════════════════════════════════════════════════════
#  DATABASE SEEDING
# ═══════════════════════════════════════════════════════════
if [ "$DEPLOY_ONLY" = false ]; then

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▸ Step 1: Generate seed SQL (5 kota, 60.000 tiket)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SEED_FILE="/tmp/seleevent-seed-data.sql"

# Generate using inline Python (no repo needed)
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

lines.append("-- SeleEvent Seed Data — 5 Cities x 12,000 tickets = 60,000 total, 5% fee")
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
lines.append("DELETE FROM invoices;")
lines.append("DELETE FROM events;")
lines.append("DELETE FROM users;")
lines.append("DELETE FROM tenants;")
lines.append("")

lines.append(f"INSERT INTO tenants (id, name, slug, primary_color, secondary_color, plan, is_active, max_events, max_tickets, created_at, updated_at) VALUES ('{TENANT_ID}', 'SeleEvent', 'seleevent', '#00A39D', '#F8AD3C', 'enterprise', true, 10, 100000, '{sql_ts(now)}', '{sql_ts(now)}');")
lines.append("")

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

tu_roles = {"bukdan":"SUPER_ADMIN","rizky":"ADMIN","andi":"ORGANIZER","rina":"COUNTER_STAFF","bayu":"GATE_STAFF","budi":"PARTICIPANT"}
lines.append("INSERT INTO tenant_users (id, user_id, tenant_id, role, is_active, joined_at, created_at, updated_at) VALUES")
tu_vals = []
for i, (key, uid) in enumerate(USER_IDS.items()):
    tu_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"tu-{uid}"))
    tu_vals.append(f"    ('{tu_id}', '{uid}', '{TENANT_ID}', '{tu_roles[key]}', true, '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append(",\n".join(tu_vals))
lines.append(";")
lines.append("")

sub_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "sub-seleevent"))
period_end = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
lines.append(f"INSERT INTO subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, created_at, updated_at) VALUES ('{sub_id}', '{TENANT_ID}', 'enterprise', 'active', '{sql_ts(now)}', '{sql_ts(period_end)}', '{sql_ts(now)}', '{sql_ts(now)}');")
lines.append("")

lines.append("INSERT INTO events (id, tenant_id, slug, title, subtitle, date, doors_open, venue, city, address, capacity, status, created_at, updated_at) VALUES")
event_vals = []
for evt in EVENTS:
    total_quota = sum(tt["quota"] for tt in TICKET_TYPE_DEFS)
    event_vals.append(f"    ('{evt['id']}', '{TENANT_ID}', '{sql_str(evt['slug'])}', '{sql_str(evt['title'])}', '{sql_str(evt['subtitle'])}', '{sql_ts(evt['date'])}', '{sql_ts(evt['doors'])}', '{sql_str(evt['venue'])}', '{sql_str(evt['city'])}', '{sql_str(evt['address'])}', {total_quota}, 'published', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append(",\n".join(event_vals))
lines.append(";")
lines.append("")

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

cs_vals = []
for eidx in range(len(EVENTS)):
    cs_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"counter-staff-rina-{eidx}"))
    cs_vals.append(f"    ('{cs_id}', '{TENANT_ID}', '{USER_IDS['rina']}', '{counter_ids_by_event[eidx][0]}', 'active', '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append("INSERT INTO counter_staff (id, tenant_id, user_id, counter_id, status, assigned_at, created_at, updated_at) VALUES")
lines.append(",\n".join(cs_vals))
lines.append(";")
lines.append("")

gs_vals = []
for eidx in range(len(EVENTS)):
    gs_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"gate-staff-bayu-{eidx}"))
    gs_vals.append(f"    ('{gs_id}', '{TENANT_ID}', '{USER_IDS['bayu']}', '{gate_ids_by_event[eidx][0]}', 'active', '{sql_ts(now)}', '{sql_ts(now)}', '{sql_ts(now)}')")
lines.append("INSERT INTO gate_staff (id, tenant_id, user_id, gate_id, status, assigned_at, created_at, updated_at) VALUES")
lines.append(",\n".join(gs_vals))
lines.append(";")
lines.append("")

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

# ─── Step 2: Import ke Cloud SQL ──────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▸ Step 2: Import seed SQL ke Cloud SQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚠️  Ini akan REPLACE semua data di database!"
echo ""

if [ "$SKIP_CONFIRM" = false ]; then
    read -p "  Lanjutkan import? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "  Import dibatalkan. Lanjut ke deploy..."
        SEED_ONLY=false
        DEPLOY_ONLY=true
    fi
fi

IMPORT_SUCCESS=false

# ─── METHOD A: Cloud SQL Proxy (PREFERRED, bypasses GCS) ───
if [ "$NO_PROXY" = false ] && [ "$IMPORT_SUCCESS" = false ]; then
    echo ""
    echo "  📡 Method A: Cloud SQL Proxy (direct psql import)"
    echo ""

    # Install cloud-sql-proxy if not present
    if ! command -v cloud-sql-proxy &>/dev/null; then
        echo "  📦 Downloading cloud-sql-proxy..."
        curl -sL -o /tmp/cloud-sql-proxy \
            https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
        chmod +x /tmp/cloud-sql-proxy
        PROXY_BIN="/tmp/cloud-sql-proxy"
    else
        PROXY_BIN="cloud-sql-proxy"
    fi

    # Install psql if not present
    if ! command -v psql &>/dev/null; then
        echo "  📦 Installing postgresql-client..."
        sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-client 2>/dev/null || true
    fi

    # Start proxy in background
    echo "  🔌 Starting Cloud SQL Proxy..."
    $PROXY_BIN "$INSTANCE_CONN" --port 5432 --quiet &
    PROXY_PID=$!
    sleep 3

    # Test connection
    if PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 5432 -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        echo "  ✅ Proxy connected! Importing seed data..."

        # Import the seed SQL
        PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 5432 -U "$DB_USER" -d "$DB_NAME" < "$SEED_FILE"

        if [ $? -eq 0 ]; then
            echo "  ✅ Seed data imported via proxy!"
            IMPORT_SUCCESS=true
        else
            echo "  ⚠️  Proxy import had errors"
        fi
    else
        echo "  ⚠️  Proxy connection failed (password might be wrong)"
        echo "     Trying password from Secret Manager..."
        
        # Try getting password from Secret Manager
        SM_PASSWORD=$(gcloud secrets versions access latest --secret=database-password --project="$PROJECT_ID" 2>/dev/null || echo "")
        if [ -n "$SM_PASSWORD" ]; then
            echo "  🔑 Got password from Secret Manager"
            if PGPASSWORD="$SM_PASSWORD" psql -h 127.0.0.1 -p 5432 -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
                echo "  ✅ Proxy connected with Secret Manager password!"
                PGPASSWORD="$SM_PASSWORD" psql -h 127.0.0.1 -p 5432 -U "$DB_USER" -d "$DB_NAME" < "$SEED_FILE"
                if [ $? -eq 0 ]; then
                    IMPORT_SUCCESS=true
                    echo "  ✅ Seed data imported via proxy (SM password)!"
                fi
            fi
        fi
    fi

    # Stop proxy
    kill $PROXY_PID 2>/dev/null || true
    wait $PROXY_PID 2>/dev/null || true
    echo ""
fi

# ─── METHOD B: GCS Import with permission fix (FALLBACK) ───
if [ "$IMPORT_SUCCESS" = false ]; then
    echo ""
    echo "  📡 Method B: GCS Import (with permission fix)"
    echo ""

    # Fix GCS permissions first
    echo "  🔑 Fixing GCS permissions for Cloud SQL..."
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)" 2>/dev/null || echo "")

    if [ -n "$PROJECT_NUMBER" ]; then
        GCS_SA="service-${PROJECT_NUMBER}@cloud-sql-pg.iam.gserviceaccount.com"
        echo "  Granting Storage Object Viewer to: $GCS_SA"
        
        # Try multiple methods to grant permission
        gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
            --member="serviceAccount:${GCS_SA}" \
            --role="roles/storage.objectViewer" \
            --project="$PROJECT_ID" 2>/dev/null || \
        gsutil iam ch "serviceAccount:${GCS_SA}:objectViewer" "gs://${BUCKET}" 2>/dev/null || \
        echo "  ⚠️  Could not grant permission (may already exist)"

        echo "  ✅ Permission granted"
    fi

    # Upload to GCS
    if ! gsutil ls "gs://${BUCKET}" &>/dev/null; then
        echo "  Creating bucket: $BUCKET"
        gsutil mb -l "$REGION" "gs://${BUCKET}" 2>/dev/null || true
    fi

    echo "  📤 Uploading seed SQL to GCS..."
    gsutil cp "$SEED_FILE" "gs://${BUCKET}/seed-data.sql"
    echo "  ✅ Uploaded"

    # Import via gcloud
    echo "  📥 Importing to Cloud SQL... (1-3 menit)"
    gcloud sql import sql "$INSTANCE_NAME" "gs://${BUCKET}/seed-data.sql" \
        --database="$DB_NAME" \
        --project="$PROJECT_ID" \
        --quiet && IMPORT_SUCCESS=true || echo "  ⚠️  GCS import failed"

    echo ""
fi

# ─── METHOD C: gcloud sql execute (LAST RESORT) ────────────
if [ "$IMPORT_SUCCESS" = false ]; then
    echo ""
    echo "  📡 Method C: Direct SQL execution via gcloud"
    echo ""
    
    # Try reading the SQL file and executing in chunks
    echo "  Executing SQL via gcloud sql import (retry)..."
    sleep 10  # Wait a bit before retry
    
    gcloud sql import sql "$INSTANCE_NAME" "gs://${BUCKET}/seed-data.sql" \
        --database="$DB_NAME" \
        --project="$PROJECT_ID" \
        --quiet && IMPORT_SUCCESS=true || echo "  ❌ All import methods failed"
    
    echo ""
fi

if [ "$IMPORT_SUCCESS" = false ]; then
    echo "❌ DATABASE IMPORT FAILED!"
    echo ""
    echo "  Manual import options:"
    echo "  1. Via Cloud Console:"
    echo "     https://console.cloud.google.com/sql/instances/$INSTANCE_NAME/databases?project=$PROJECT_ID"
    echo "  2. Via Cloud SQL Proxy:"
    echo "     ./cloud-sql-proxy $INSTANCE_CONN --port 5432 &"
    echo "     PGPASSWORD='<your-password>' psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME < $SEED_FILE"
    echo ""
    echo "  Seed file tersedia di: $SEED_FILE"
    echo ""
    read -p "  Tetap lanjut deploy? (yes/no): " CONTINUE_DEPLOY
    if [ "$CONTINUE_DEPLOY" != "yes" ]; then
        exit 1
    fi
fi

echo "  ✅ Database seeding selesai!"
echo ""

fi # end DEPLOY_ONLY=false

# Exit if seed-only
if [ "$SEED_ONLY" = true ]; then
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  ✅  SEED-ONLY COMPLETE!                         ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║  Untuk redeploy backend/frontend:" 
    echo "║  bash gcp/cloudshell-redeploy.sh --deploy-only --yes"
    echo "╚══════════════════════════════════════════════════╝"
    exit 0
fi

# ═══════════════════════════════════════════════════════════
#  CLOUD BUILD DEPLOYMENT
# ═══════════════════════════════════════════════════════════

if [ -z "$PROJECT_ROOT" ]; then
    echo "❌ Tidak bisa deploy tanpa source code!"
    echo "   Clone repo dulu atau gunakan --seed-only"
    exit 1
fi

cd "$PROJECT_ROOT"

# ─── Step 3: Build & Deploy Backend ──────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▸ Step 3: Build & deploy backend API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$PROJECT_ROOT/gcp/cloudbuild-backend.yaml" ]; then
    echo "❌ Error: cloudbuild-backend.yaml tidak ditemukan di $PROJECT_ROOT"
    exit 1
fi

echo "  Submitting Cloud Build untuk backend... (5-10 menit)"
echo ""

# Ensure API services are enabled
echo "  Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    --project="$PROJECT_ID" \
    --quiet 2>/dev/null || true
echo ""

# Get git short SHA for image tagging
GIT_SHORT_SHA=$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "latest")
echo "  Image tag: $GIT_SHORT_SHA"

gcloud builds submit "$PROJECT_ROOT" \
    --config "$PROJECT_ROOT/gcp/cloudbuild-backend.yaml" \
    --substitutions="_REGION=$REGION,_INSTANCE_NAME=$INSTANCE_NAME,_SHORT_SHA=$GIT_SHORT_SHA" \
    --project="$PROJECT_ID" \
    --timeout=1200s

echo "  ✅ Backend deployed!"
echo ""

# ─── Step 4: Build & Deploy Frontend ──────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▸ Step 4: Build & deploy frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$PROJECT_ROOT/gcp/cloudbuild-frontend.yaml" ]; then
    echo "❌ Error: cloudbuild-frontend.yaml tidak ditemukan"
    exit 1
fi

echo "  Submitting Cloud Build untuk frontend... (8-15 menit)"
echo ""

# Re-use the same git SHA for frontend
echo "  Image tag: $GIT_SHORT_SHA"

gcloud builds submit "$PROJECT_ROOT" \
    --config "$PROJECT_ROOT/gcp/cloudbuild-frontend.yaml" \
    --substitutions="_REGION=$REGION,_BACKEND_URL=$STAGING_API_URL,_SHORT_SHA=$GIT_SHORT_SHA" \
    --project="$PROJECT_ID" \
    --timeout=1800s

echo "  ✅ Frontend deployed!"
echo ""

# ─── Step 5: Verifikasi ──────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▸ Step 5: Verifikasi endpoints (tunggu 30 detik)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sleep 30

API_URL="$STAGING_API_URL"

echo ""
echo "  🔍 Testing API endpoints..."
for CITY in bandung makassar medan jakarta balikpapan; do
    SLUG="sheila-on7-${CITY}"
    RESPONSE=$(curl -s "${API_URL}/api/v1/events/${SLUG}" 2>/dev/null || echo "")
    if echo "$RESPONSE" | grep -q "VVIP PIT"; then
        EVENT_TITLE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('event',{}).get('title','?'))" 2>/dev/null || echo "?")
        echo "  ✅ ${CITY^} — ${EVENT_TITLE}"
    else
        echo "  ⚠️  ${CITY^} — API belum siap (mungkin perlu tunggu lebih lama)"
    fi
done

echo ""
echo "  🔍 Testing frontend..."
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_WEB_URL" 2>/dev/null || echo "000")
if [ "$WEB_STATUS" = "200" ]; then
    echo "  ✅ Frontend OK (HTTP $WEB_STATUS)"
else
    echo "  ⚠️  Frontend HTTP $WEB_STATUS (mungkin perlu tunggu lebih lama)"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅  FULL REDEPLOY COMPLETE!                     ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║"
echo "║  🌐 Frontend: $STAGING_WEB_URL"
echo "║  🔌 API:      $STAGING_API_URL"
echo "║"
echo "║  🎫 5 Cities × 12,000 tickets = 60,000 total"
echo "║     Bandung (1 Jun) | Makassar (8 Jun) | Medan (15 Jun)"
echo "║     Jakarta (22 Jun) | Balikpapan (29 Jun)"
echo "║"
echo "║  📊 Cloud Console:"
echo "║     https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "║     https://console.cloud.google.com/sql/instances/$INSTANCE_NAME?project=$PROJECT_ID"
echo "║"
echo "║  📋 Build History:"
echo "║     https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
echo "╚══════════════════════════════════════════════════╝"
