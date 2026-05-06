#!/bin/bash
# =============================================================
#  SELEEVENT — Full Deploy dari Google Cloud Shell
#
#  Sheila On 7 "Melompat Lebih Tinggi" Tour 2025
#  5 Cities × 12,000 tickets = 60,000 total, 5% platform fee
#
#  Script ini melakukan:
#    1. Clone/pull repo dari GitHub
#    2. Generate seed SQL
#    3. Upload ke Cloud Storage
#    4. Import ke Cloud SQL
#    5. Build & deploy backend API (Cloud Build → Cloud Run)
#    6. Build & deploy frontend (Cloud Build → Cloud Run)
#    7. Verifikasi endpoints
#
#  Prasyarat:
#    - gcloud auth login
#    - gcloud config set project eventku-494416
#    - GitHub repo sudah ada (atau buat baru)
#
#  Cara Pakai:
#    bash cloudshell-full-deploy.sh              # Interaktif
#    bash cloudshell-full-deploy.sh --yes        # Non-interaktif
#    bash cloudshell-full-deploy.sh --seed-only  # Hanya seed database
#    bash cloudshell-full-deploy.sh --deploy-only # Hanya deploy (tanpa seed)
# =============================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
INSTANCE_NAME="eventku"
DB_NAME="eventku"
DB_USER="eventku"
BUCKET="${PROJECT_ID}-seed-data"

# ─── GANTI DENGAN REPO ANDA ────────────────────────────────
# Jika belum punya repo, lihat petunjuk di bawah
GITHUB_REPO="${GITHUB_REPO:-}"  # e.g. "username/seleevent"
BRANCH="${BRANCH:-main}"
# ────────────────────────────────────────────────────────────

STAGING_API_URL="https://eventku-api-staging-lkfw4e5kna-et.a.run.app"
STAGING_WEB_URL="https://eventku-web-staging-lkfw4e5kna-et.a.run.app"

SKIP_CONFIRM=false
SEED_ONLY=false
DEPLOY_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --yes|-y) SKIP_CONFIRM=true ;;
        --seed-only) SEED_ONLY=true ;;
        --deploy-only) DEPLOY_ONLY=true ;;
    esac
done

echo "================================================"
echo "  SELEEVENT — Full Deploy dari Cloud Shell"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  API:      $STAGING_API_URL"
echo "  Web:      $STAGING_WEB_URL"
echo "================================================"
echo ""

# ─── Step 0: Verify prerequisites ─────────────────────────
echo "▸ Step 0: Verifikasi prerequisites..."

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    echo "❌ Error: Belum login. Jalankan:"
    echo "  gcloud auth login"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Set project ke $PROJECT_ID..."
    gcloud config set project "$PROJECT_ID"
fi

echo "  ✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format="value(account)")"
echo ""

# ─── Step 0b: Fix Cloud Build permissions ────────────────────
echo "▸ Step 0b: Fix Cloud Build IAM permissions..."

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

# Grant Cloud SQL Client
echo "  Granting roles/cloudsql.client..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/cloudsql.client" \
    --quiet 2>/dev/null || echo "  ⚠️  May already have this role"

# Grant Secret Manager Access
echo "  Granting roles/secretmanager.secretAccessor..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || echo "  ⚠️  May already have this role"

echo "  ✅ IAM permissions granted!"
echo ""

# ─── Step 1: Clone/Pull Repository ────────────────────────
if [ "$DEPLOY_ONLY" = false ]; then
    echo "▸ Step 1: Setup source code..."

    PROJECT_DIR="$HOME/seleevent"

    if [ -z "$GITHUB_REPO" ]; then
        echo ""
        echo "  ⚠️  GITHUB_REPO belum diset!"
        echo ""
        echo "  Pilihan A: Set environment variable"
        echo "    export GITHUB_REPO=username/seleevent"
        echo "    bash cloudshell-full-deploy.sh"
        echo ""
        echo "  Pilihan B: Clone manual dulu"
        echo "    git clone https://github.com/username/seleevent.git $PROJECT_DIR"
        echo "    cd $PROJECT_DIR"
        echo ""
        echo "  Pilihan C: Buat repo dari project yang sudah ada"
        echo "    1. Buat repo kosong di https://github.com/new"
        echo "    2. Dari mesin lokal:"
        echo "       cd /path/to/my-project"
        echo "       git remote add origin https://github.com/username/seleevent.git"
        echo "       git push -u origin main"
        echo "    3. Kemudian di Cloud Shell:"
        echo "       git clone https://github.com/username/seleevent.git $PROJECT_DIR"
        echo ""
        echo "  Pilihan D: Upload langsung ke Cloud Shell"
        echo "    1. Di Cloud Shell, klik ⋮ > Upload file"
        echo "    2. Upload project sebagai .tar.gz"
        echo "    3. Ekstrak: tar xzf seleevent.tar.gz -C $PROJECT_DIR"
        echo ""
        echo "  Pilihan E: Skip clone, gunakan quick-seed saja"
        echo "    bash gcp/cloudshell-quick-seed.sh --yes"
        echo ""

        # Fallback: try to use the project dir if it already exists
        if [ -d "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/backend/database/generate_seed_sql.py" ]; then
            echo "  ✅ Folder $PROJECT_DIR sudah ada, menggunakan yang ada."
        else
            echo "❌ Tidak bisa lanjut tanpa source code."
            echo "   Gunakan cloudshell-quick-seed.sh untuk seed database saja."
            exit 1
        fi
    else
        if [ -d "$PROJECT_DIR" ]; then
            echo "  Folder $PROJECT_DIR sudah ada, melakukan git pull..."
            cd "$PROJECT_DIR"
            git pull origin "$BRANCH" || echo "  ⚠️  Git pull gagal, menggunakan kode yang ada"
        else
            echo "  Cloning dari GitHub: $GITHUB_REPO..."
            git clone "https://github.com/${GITHUB_REPO}.git" "$PROJECT_DIR"
        fi
    fi

    cd "$PROJECT_DIR"
    echo "  ✅ Source code siap di $PROJECT_DIR"
    echo ""
fi

PROJECT_ROOT="${PROJECT_DIR:-$HOME/seleevent}"
cd "$PROJECT_ROOT"

# ─── Step 2: Generate seed SQL ────────────────────────────
if [ "$DEPLOY_ONLY" = false ]; then
    echo "▸ Step 2: Generate seed SQL..."

    SEED_FILE="$PROJECT_ROOT/backend/database/seed-data.sql"
    GENERATOR="$PROJECT_ROOT/backend/database/generate_seed_sql.py"

    if [ -f "$GENERATOR" ]; then
        python3 "$GENERATOR"
        echo "  ✅ Seed SQL generated dari script"
    elif [ -f "$SEED_FILE" ]; then
        echo "  ✅ Seed file sudah ada: $(wc -l < "$SEED_FILE") lines"
    else
        echo "❌ Error: Tidak ada generator maupun seed file"
        exit 1
    fi
    echo ""
fi

# ─── Step 3: Upload seed SQL ke Cloud Storage ─────────────
if [ "$DEPLOY_ONLY" = false ]; then
    echo "▸ Step 3: Upload seed SQL ke Cloud Storage..."

    SEED_FILE="$PROJECT_ROOT/backend/database/seed-data.sql"

    if [ ! -f "$SEED_FILE" ]; then
        echo "❌ Error: Seed file tidak ditemukan: $SEED_FILE"
        exit 1
    fi

    if ! gsutil ls "gs://${BUCKET}" &>/dev/null; then
        echo "  Membuat bucket: $BUCKET"
        gsutil mb -l "$REGION" "gs://${BUCKET}" 2>/dev/null || true
    fi

    gsutil cp "$SEED_FILE" "gs://${BUCKET}/seed-data.sql"
    echo "  ✅ Uploaded ke gs://${BUCKET}/seed-data.sql"
    echo ""
fi

# ─── Step 4: Import ke Cloud SQL ──────────────────────────
if [ "$DEPLOY_ONLY" = false ]; then
    echo "▸ Step 4: Import seed SQL ke Cloud SQL..."
    echo "  ⚠️  Ini akan REPLACE semua data di database!"
    echo ""

    if [ "$SKIP_CONFIRM" = false ]; then
        read -p "  Lanjutkan import? (yes/no): " CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            echo "  Import dibatalkan. Lanjut ke deploy..."
        else
            echo "  Mengimport... (1-3 menit)"
            gcloud sql import sql "$INSTANCE_NAME" "gs://${BUCKET}/seed-data.sql" \
                --database="$DB_NAME" \
                --project="$PROJECT_ID" \
                --quiet
            echo "  ✅ Seed data berhasil diimport"
        fi
    else
        echo "  Mengimport... (1-3 menit)"
        gcloud sql import sql "$INSTANCE_NAME" "gs://${BUCKET}/seed-data.sql" \
            --database="$DB_NAME" \
            --project="$PROJECT_ID" \
            --quiet
        echo "  ✅ Seed data berhasil diimport"
    fi
    echo ""
fi

# ─── Exit if seed-only ────────────────────────────────────
if [ "$SEED_ONLY" = true ]; then
    echo "================================================"
    echo "  ✅  SEED-ONLY COMPLETE!"
    echo "================================================"
    echo ""
    echo "  Untuk redeploy backend/frontend:"
    echo "    cd $PROJECT_ROOT && bash gcp/cloudshell-full-deploy.sh --deploy-only --yes"
    echo ""
    exit 0
fi

# ─── Step 5: Build & Deploy Backend ──────────────────────
echo "▸ Step 5: Build & deploy backend API..."

if [ ! -f "$PROJECT_ROOT/gcp/cloudbuild-backend.yaml" ]; then
    echo "❌ Error: cloudbuild-backend.yaml tidak ditemukan"
    echo "   Pastikan source code lengkap di $PROJECT_ROOT"
    exit 1
fi

echo "  Submitting Cloud Build untuk backend... (5-10 menit)"

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

GIT_SHORT_SHA=$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "latest")
echo "  Image tag: $GIT_SHORT_SHA"
gcloud builds submit "$PROJECT_ROOT" \
    --config "$PROJECT_ROOT/gcp/cloudbuild-backend.yaml" \
    --substitutions="_REGION=$REGION,_INSTANCE_NAME=$INSTANCE_NAME,_SHORT_SHA=$GIT_SHORT_SHA" \
    --project="$PROJECT_ID" \
    --timeout=1200s

echo "  ✅ Backend deployed"
echo ""

# ─── Step 6: Build & Deploy Frontend ──────────────────────
echo "▸ Step 6: Build & deploy frontend..."

if [ ! -f "$PROJECT_ROOT/gcp/cloudbuild-frontend.yaml" ]; then
    echo "❌ Error: cloudbuild-frontend.yaml tidak ditemukan"
    exit 1
fi

echo "  Submitting Cloud Build untuk frontend... (8-15 menit)"
echo "  Image tag: $GIT_SHORT_SHA"
gcloud builds submit "$PROJECT_ROOT" \
    --config "$PROJECT_ROOT/gcp/cloudbuild-frontend.yaml" \
    --substitutions="_REGION=$REGION,_BACKEND_URL=$STAGING_API_URL,_SHORT_SHA=$GIT_SHORT_SHA" \
    --project="$PROJECT_ID" \
    --timeout=1800s

echo "  ✅ Frontend deployed"
echo ""

# ─── Step 7: Verifikasi ──────────────────────────────────
echo "▸ Step 7: Verifikasi endpoints..."

echo ""
for CITY in bandung makassar medan jakarta balikpapan; do
    SLUG="sheila-on7-${CITY}"
    RESPONSE=$(curl -s "${STAGING_API_URL}/api/v1/events/${SLUG}" 2>/dev/null || echo "")
    if echo "$RESPONSE" | grep -q "VVIP PIT"; then
        echo "  ✅ ${CITY^} — tiket ditemukan!"
    else
        echo "  ⚠️  ${CITY^} — response tidak expected"
        echo "$RESPONSE" | head -2
    fi
done

echo ""
echo "================================================"
echo "  ✅  FULL DEPLOY COMPLETE!"
echo "================================================"
echo ""
echo "  🌐 Frontend: $STAGING_WEB_URL"
echo "  🔌 API:      $STAGING_API_URL"
echo ""
echo "  🎫 5 Cities × 12,000 tickets = 60,000 total"
echo "     Bandung (1 Jun) | Makassar (8 Jun) | Medan (15 Jun)"
echo "     Jakarta (22 Jun) | Balikpapan (29 Jun)"
echo ""
echo "  📊 Cek dashboard:"
echo "     https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "     https://console.cloud.google.com/sql/instances/$INSTANCE_NAME?project=$PROJECT_ID"
echo "================================================"
