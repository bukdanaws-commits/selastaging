#!/bin/bash
# =============================================================
#  SELEEVENT — Seed Cloud SQL via Cloud SQL Proxy + psql
#
#  Alternative to GCS import. Uses Cloud SQL Proxy for direct
#  SQL execution. Useful when GCS import fails.
#
#  Prerequisites:
#    - gcloud CLI authenticated
#    - psql client installed (sudo apt install postgresql-client)
#    - cloud-sql-proxy (gcloud components install cloud-sql-proxy)
#
#  Usage:
#    ./gcp/seed-via-proxy.sh          # Interactive
#    ./gcp/seed-via-proxy.sh --yes    # Non-interactive
# =============================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
INSTANCE_NAME="eventku"
DB_NAME="eventku"
DB_USER="eventku"
PROXY_PORT=5433

SKIP_CONFIRM=false
if [[ "${1:-}" == "--yes" || "${1:-}" == "-y" ]]; then
    SKIP_CONFIRM=true
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEED_FILE="$PROJECT_ROOT/backend/database/seed-data.sql"

echo "================================================"
echo "  SELEEVENT — Seed via Cloud SQL Proxy"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "================================================"
echo ""

# ─── Verify seed file exists ──────────────────────────────
if [ ! -f "$SEED_FILE" ]; then
    echo "❌ Seed file not found: $SEED_FILE"
    echo "   Generate dulu: python3 backend/database/generate_seed_sql.py"
    exit 1
fi

echo "  ✅ Seed file: $(wc -l < "$SEED_FILE") lines"
echo ""

# ─── Confirm ──────────────────────────────────────────────
if [ "$SKIP_CONFIRM" = false ]; then
    echo "  ⚠️  Ini akan REPLACE semua data di database!"
    read -p "  Lanjutkan? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "  Dibatalkan."
        exit 0
    fi
fi
echo ""

# ─── Get DB password from Secret Manager ──────────────────
echo "▸ Mengambil password dari Secret Manager..."
DB_PASSWORD=$(gcloud secrets versions access latest --secret="database-password" --project="$PROJECT_ID" 2>/dev/null)
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Tidak bisa mengambil password dari Secret Manager"
    echo "  Pastikan:"
    echo "  1. gcloud auth login sudah dijalankan"
    echo "  2. gcloud config set project $PROJECT_ID"
    echo "  3. Secret 'database-password' ada di Secret Manager"
    exit 1
fi
echo "  ✅ Password ditemukan"
echo ""

# ─── Start Cloud SQL Proxy ────────────────────────────────
echo "▸ Starting Cloud SQL Proxy on port $PROXY_PORT..."
echo "  Instance: $PROJECT_ID:$REGION:$INSTANCE_NAME"

# Kill any existing proxy on this port
fuser -k "$PROXY_PORT/tcp" 2>/dev/null || true
sleep 1

cloud-sql-proxy "$PROJECT_ID:$REGION:$INSTANCE_NAME" --port="$PROXY_PORT" &
PROXY_PID=$!
sleep 3

# Verify proxy is running
if ! kill -0 "$PROXY_PID" 2>/dev/null; then
    echo "❌ Error: Cloud SQL Proxy gagal start"
    echo "  Coba install: gcloud components install cloud-sql-proxy"
    exit 1
fi
echo "  ✅ Proxy running (PID: $PROXY_PID)"
echo ""

# ─── Execute seed SQL ─────────────────────────────────────
echo "▸ Menjalankan seed SQL..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h 127.0.0.1 \
    -p "$PROXY_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$SEED_FILE"

echo "  ✅ Seed SQL berhasil dijalankan"
echo ""

# ─── Verify data ──────────────────────────────────────────
echo "▸ Verifikasi data..."
echo ""
PGPASSWORD="$DB_PASSWORD" psql \
    -h 127.0.0.1 \
    -p "$PROXY_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT e.city, tt.name, tt.price, tt.quota, tt.sold, tt.tier, tt.platform_fee FROM ticket_types tt JOIN events e ON tt.event_id = e.id ORDER BY e.city, tt.price DESC;"

echo ""

# ─── Stop proxy ───────────────────────────────────────────
kill "$PROXY_PID" 2>/dev/null || true
echo "  ✅ Proxy dihentikan"
echo ""

echo "================================================"
echo "  ✅  SEED VIA PROXY COMPLETE!"
echo "================================================"
echo ""
echo "  Next step: Redeploy backend jika perlu"
echo "    bash gcp/cloudshell-full-deploy.sh --deploy-only --yes"
echo "================================================"
