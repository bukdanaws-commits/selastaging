#!/bin/bash
# =============================================================
#  SELEEVENT — Seed Cloud SQL & Redeploy to Cloud Run
#
#  Sheila On 7 "Melompat Lebih Tinggi" Tour 2025
#  5 Cities × 12,000 tickets = 60,000 total
#
#  This script:
#    1. Uploads seed-data.sql to Cloud Storage
#    2. Imports it into Cloud SQL (replaces all data)
#    3. Rebuilds & redeploys the backend API
#    4. Rebuilds & redeploys the frontend
#
#  Prerequisites:
#    - gcloud CLI authenticated:  gcloud auth login
#    - Project set:               gcloud config set project eventku-494416
#
#  Usage:
#    ./gcp/seed-and-deploy.sh          # Interactive (asks confirmation)
#    ./gcp/seed-and-deploy.sh --yes    # Non-interactive (skip confirmation)
# =============================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
INSTANCE_NAME="eventku"
DB_NAME="eventku"
DB_USER="eventku"
BUCKET="${PROJECT_ID}-seed-data"

STAGING_API_URL="https://eventku-api-staging-lkfw4e5kna-et.a.run.app"
STAGING_WEB_URL="https://eventku-web-staging-lkfw4e5kna-et.a.run.app"

SKIP_CONFIRM=false
if [[ "${1:-}" == "--yes" || "${1:-}" == "-y" ]]; then
    SKIP_CONFIRM=true
fi

echo "================================================"
echo "  SELEEVENT — Seed & Deploy (5 Cities Tour)"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  Database: $DB_NAME"
echo "  API:      $STAGING_API_URL"
echo "  Web:      $STAGING_WEB_URL"
echo "================================================"
echo ""

# ─── Step 0: Verify prerequisites ─────────────────────────
echo "▸ Step 0: Verifying prerequisites..."

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    echo "❌ Error: No active gcloud account. Run: gcloud auth login"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Setting project to $PROJECT_ID..."
    gcloud config set project "$PROJECT_ID"
fi

echo "  ✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format="value(account)")"
echo ""

# ─── Step 1: Generate seed SQL (if needed) ────────────────
echo "▸ Step 1: Checking seed SQL file..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEED_FILE="$PROJECT_ROOT/backend/database/seed-data.sql"
GENERATOR="$PROJECT_ROOT/backend/database/generate_seed_sql.py"

if [ ! -f "$SEED_FILE" ]; then
    echo "  Seed file not found. Generating from script..."
    if [ -f "$GENERATOR" ]; then
        python3 "$GENERATOR"
        echo "  ✅ Seed SQL generated"
    else
        echo "❌ Error: Generator not found at $GENERATOR"
        exit 1
    fi
else
    echo "  ✅ Seed file exists: $SEED_FILE ($(wc -l < "$SEED_FILE") lines)"
fi
echo ""

# ─── Step 2: Upload seed SQL to Cloud Storage ─────────────
echo "▸ Step 2: Uploading seed SQL to Cloud Storage..."

# Create bucket if it doesn't exist
if ! gsutil ls "gs://${BUCKET}" &>/dev/null; then
    echo "  Creating Cloud Storage bucket: $BUCKET"
    gsutil mb -l "$REGION" "gs://${BUCKET}" 2>/dev/null || true
fi

gsutil cp "$SEED_FILE" "gs://${BUCKET}/seed-data.sql"
echo "  ✅ Uploaded seed-data.sql to gs://${BUCKET}/seed-data.sql"
echo ""

# ─── Step 3: Import seed SQL into Cloud SQL ───────────────
echo "▸ Step 3: Importing seed SQL into Cloud SQL..."
echo "  ⚠️  This will REPLACE ALL existing data in the database!"
echo ""

if [ "$SKIP_CONFIRM" = false ]; then
    read -p "  Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "  Aborted."
        exit 0
    fi
fi

gcloud sql import sql "$INSTANCE_NAME" "gs://${BUCKET}/seed-data.sql" \
    --database="$DB_NAME" \
    --project="$PROJECT_ID" \
    --quiet

echo "  ✅ Seed data imported successfully"
echo ""

# ─── Step 4: Rebuild & Redeploy Backend ───────────────────
echo "▸ Step 4: Rebuilding & redeploying backend API..."
gcloud builds submit --config "$PROJECT_ROOT/gcp/cloudbuild-backend.yaml" \
    --substitutions="_REGION=$REGION,_INSTANCE_NAME=$INSTANCE_NAME" \
    --project="$PROJECT_ID"

echo "  ✅ Backend deployed"
echo ""

# ─── Step 5: Rebuild & Redeploy Frontend ──────────────────
echo "▸ Step 5: Rebuilding & redeploying frontend..."
gcloud builds submit --config "$PROJECT_ROOT/gcp/cloudbuild-frontend.yaml" \
    --substitutions="_REGION=$REGION,_BACKEND_URL=$STAGING_API_URL" \
    --project="$PROJECT_ID"

echo "  ✅ Frontend deployed"
echo ""

# ─── Step 6: Verify API ──────────────────────────────────
echo "▸ Step 6: Verifying API endpoints..."

echo ""
echo "  Testing: GET /api/v1/events/sheila-on7-jakarta"
EVENT_RESPONSE=$(curl -s "${STAGING_API_URL}/api/v1/events/sheila-on7-jakarta" 2>/dev/null || echo "")
if echo "$EVENT_RESPONSE" | grep -q "VVIP PIT"; then
    echo "  ✅ Jakarta event endpoint works — ticket types found!"
else
    echo "  ⚠️  Jakarta event response:"
    echo "$EVENT_RESPONSE" | head -5
fi

echo ""
echo "  Testing: GET /api/v1/events/sheila-on7-bandung"
BANDUNG_RESPONSE=$(curl -s "${STAGING_API_URL}/api/v1/events/sheila-on7-bandung" 2>/dev/null || echo "")
if echo "$BANDUNG_RESPONSE" | grep -q "VVIP PIT"; then
    echo "  ✅ Bandung event endpoint works — ticket types found!"
else
    echo "  ⚠️  Bandung event response:"
    echo "$BANDUNG_RESPONSE" | head -5
fi

echo ""
echo "  Testing: GET /api/v1/events/sheila-on7-balikpapan"
BPN_RESPONSE=$(curl -s "${STAGING_API_URL}/api/v1/events/sheila-on7-balikpapan" 2>/dev/null || echo "")
if echo "$BPN_RESPONSE" | grep -q "VVIP PIT"; then
    echo "  ✅ Balikpapan event endpoint works — ticket types found!"
else
    echo "  ⚠️  Balikpapan event response:"
    echo "$BPN_RESPONSE" | head -5
fi

echo ""
echo "================================================"
echo "  ✅  SEED & DEPLOY COMPLETE!"
echo "================================================"
echo ""
echo "  🌐 Frontend: $STAGING_WEB_URL"
echo "  🔌 API:      $STAGING_API_URL"
echo ""
echo "  🎫 5 Cities × 12,000 tickets = 60,000 total"
echo "     Bandung (1 Jun) | Makassar (8 Jun) | Medan (15 Jun)"
echo "     Jakarta (22 Jun) | Balikpapan (29 Jun)"
echo ""
echo "  Verify tickets are showing on the landing page."
echo "================================================"
