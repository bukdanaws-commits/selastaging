#!/bin/bash
# =============================================================
#  EVENTKU — GCP Infrastructure Setup Script
#  Usage:   ./gcp/setup.sh <PROJECT_ID> [REGION]
#  Example: ./gcp/setup.sh eventku-494416 asia-southeast1
# =============================================================

set -euo pipefail

PROJECT_ID=${1:?Error: PROJECT_ID required. Usage: ./setup.sh <PROJECT_ID> [REGION]}
REGION=${2:-asia-southeast1}
ZONE="${REGION}-a"

echo "================================================"
echo "  EVENTKU — GCP INFRASTRUCTURE SETUP"
echo "  Project: $PROJECT_ID"
echo "  Region:  $REGION"
echo "================================================"

# ── Step 1: Set project ──────────────────────────────────
echo ""
echo "▸ [1/13] Setting project..."
gcloud config set project "$PROJECT_ID"

# ── Step 2: Enable required APIs ────────────────────────
echo ""
echo "▸ [2/13] Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  sql-component.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  dns.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com \
  redis.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  --project="$PROJECT_ID"

# ── Step 3: Create Service Account ──────────────────────
echo ""
echo "▸ [3/13] Creating service account..."
SA_NAME="eventku-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create "$SA_NAME" \
  --display-name="EVENTKU Cloud Run Service Account" \
  --project="$PROJECT_ID" 2>/dev/null || echo "  ℹ️  Service account already exists, skipping creation."

# ── Step 4: Grant IAM roles ─────────────────────────────
echo ""
echo "▸ [4/13] Granting IAM roles to $SA_EMAIL..."
for ROLE in \
  "roles/cloudsql.client" \
  "roles/secretmanager.secretAccessor" \
  "roles/storage.objectViewer" \
  "roles/storage.objectCreator" \
  "roles/redis.viewer" \
  "roles/logging.logWriter" \
  "roles/monitoring.metricWriter" \
  "roles/errorreporting.writer"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" --condition=None --quiet > /dev/null
  echo "  ✅  $ROLE"
done

# ── Step 5: Create Cloud SQL instance ───────────────────
echo ""
echo "▸ [5/13] Creating Cloud SQL PostgreSQL instance..."
INSTANCE_NAME="eventku-db"

gcloud sql instances create "$INSTANCE_NAME" \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-7680 \
  --region="$REGION" \
  --edition=ENTERPRISE \
  --availability-type=regional \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03 \
  --database-flags=log_checkpoints=on,log_connections=on,log_disconnections=on \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud sql instances create "$INSTANCE_NAME" \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-7680 \
  --region="$REGION" \
  --availability-type=regional \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03 \
  --database-flags=log_checkpoints=on,log_connections=on,log_disconnections=on \
  --project="$PROJECT_ID"

# ── Step 6: Create database ─────────────────────────────
echo ""
echo "▸ [6/13] Creating database..."
gcloud sql databases create eventku \
  --instance="$INSTANCE_NAME" \
  --project="$PROJECT_ID"

# ── Step 7: Create database user ────────────────────────
echo ""
echo "▸ [7/13] Creating database user..."
DB_USER="eventku"
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

echo "  ⚠️  SAVE THIS PASSWORD: $DB_PASS"
echo "  ⚠️  You will NOT be able to see it again!"

gcloud sql users create "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$DB_PASS" \
  --project="$PROJECT_ID"

# ── Step 8: Store secrets in Secret Manager ─────────────
echo ""
echo "▸ [8/13] Storing secrets in Secret Manager..."

# Database password
echo -n "$DB_PASS" | gcloud secrets create database-password \
  --data-file=- \
  --replication-policy=automatic \
  --project="$PROJECT_ID" 2>/dev/null || \
  echo -n "$DB_PASS" | gcloud secrets versions add database-password \
    --data-file=- \
    --project="$PROJECT_ID"

# JWT secret
JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=')
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret \
  --data-file=- \
  --replication-policy=automatic \
  --project="$PROJECT_ID" 2>/dev/null || \
  echo -n "$JWT_SECRET" | gcloud secrets versions add jwt-secret \
    --data-file=- \
    --project="$PROJECT_ID"

# Refresh JWT secret
REFRESH_JWT_SECRET=$(openssl rand -base64 24 | tr -d '/+=')
echo -n "$REFRESH_JWT_SECRET" | gcloud secrets create refresh-jwt-secret \
  --data-file=- \
  --replication-policy=automatic \
  --project="$PROJECT_ID" 2>/dev/null || \
  echo -n "$REFRESH_JWT_SECRET" | gcloud secrets versions add refresh-jwt-secret \
    --data-file=- \
    --project="$PROJECT_ID"

# Google OAuth Client Secret
GOOGLE_CLIENT_SECRET="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"
echo -n "$GOOGLE_CLIENT_SECRET" | gcloud secrets create google-client-secret \
  --data-file=- \
  --replication-policy=automatic \
  --project="$PROJECT_ID" 2>/dev/null || \
  echo -n "$GOOGLE_CLIENT_SECRET" | gcloud secrets versions add google-client-secret \
    --data-file=- \
    --project="$PROJECT_ID"

echo "  ✅  database-password"
echo "  ✅  jwt-secret"
echo "  ✅  refresh-jwt-secret"
echo "  ✅  google-client-secret"

# ── Step 9: Grant SA access to secrets ──────────────────
echo ""
echo "▸ [9/13] Granting service account access to secrets..."
for SECRET in database-password jwt-secret refresh-jwt-secret google-client-secret; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" > /dev/null
done
echo "  ✅  Secret access granted"

# ── Step 10: Create Cloud Storage bucket ────────────────
echo ""
echo "▸ [10/13] Creating Cloud Storage bucket..."
BUCKET_NAME="${PROJECT_ID}-assets"
gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}" 2>/dev/null || \
  echo "  ℹ️  Bucket already exists, skipping creation."

# Create folder structure
gsutil cp /dev/null "gs://${BUCKET_NAME}/qr-codes/.keep" 2>/dev/null || true
gsutil cp /dev/null "gs://${BUCKET_NAME}/event-images/.keep" 2>/dev/null || true
gsutil cp /dev/null "gs://${BUCKET_NAME}/exports/.keep" 2>/dev/null || true

# Make bucket publicly readable (for QR codes, event images)
gsutil iam ch allUsers:objectViewer "gs://${BUCKET_NAME}"
echo "  ✅  gs://${BUCKET_NAME}"

# ── Step 11: Create Artifact Registry ───────────────────
echo ""
echo "▸ [11/13] Creating Artifact Registry..."
gcloud artifacts repositories create docker \
  --repository-format=docker \
  --location="$REGION" \
  --description="EVENTKU Docker images" \
  --project="$PROJECT_ID" 2>/dev/null || \
  echo "  ℹ️  Artifact Registry already exists, skipping creation."

echo "  ✅  ${REGION}-docker.pkg.dev/${PROJECT_ID}/docker"

# ── Step 12: Grant Cloud Build service account roles ────
echo ""
echo "▸ [12/13] Setting up Cloud Build service permissions..."
PROJECT_NUM=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

# Cloud Build needs roles to deploy to Cloud Run, push images, etc.
for ROLE in \
  "roles/run.admin" \
  "roles/iam.serviceAccountUser" \
  "roles/cloudsql.client"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
    --role="$ROLE" --condition=None --quiet > /dev/null
done
echo "  ✅  Cloud Build permissions configured"

# ── Step 13: Output summary ─────────────────────────────
echo ""
echo "▸ [13/13] Done!"
echo ""
echo "============================================================"
echo "  ✅  EVENTKU GCP SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "  PROJECT_ID:        $PROJECT_ID"
echo "  REGION:            $REGION"
echo "  SERVICE ACCOUNT:   $SA_EMAIL"
echo ""
echo "  ┌─ Cloud SQL ─────────────────────────────────────┐"
echo "  │  Instance:    $INSTANCE_NAME"
echo "  │  Database:    eventku"
echo "  │  User:        $DB_USER"
echo "  │  Password:    $DB_PASS"
echo "  │  Connection:  /cloudsql/$PROJECT_ID:$REGION:$INSTANCE_NAME"
echo "  │  Public IP:   $(gcloud sql instances describe $INSTANCE_NAME --format='value(ipAddresses[0].ipAddress)' --project=$PROJECT_ID)"
echo "  └─────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ Cloud Storage ────────────────────────────────┐"
echo "  │  Bucket:      gs://${BUCKET_NAME}"
echo "  │  Folders:     qr-codes/, event-images/, exports/"
echo "  └─────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ Artifact Registry ────────────────────────────┐"
echo "  │  Repository:  ${REGION}-docker.pkg.dev/${PROJECT_ID}/docker"
echo "  └─────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ Secret Manager ───────────────────────────────┐"
echo "  │  database-password   (✅ set)"
echo "  │  jwt-secret          (✅ set)"
echo "  │  refresh-jwt-secret  (✅ set)"
echo "  └─────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ Next Steps ───────────────────────────────────┐"
echo "  │  1. Deploy backend:   ./gcp/deploy-backend.sh $PROJECT_ID"
echo "  │  2. Deploy frontend:  ./gcp/deploy-frontend.sh $PROJECT_ID $REGION <BACKEND_URL>"
echo "  │  3. Configure DNS:    Add A record for your domain"
echo "  └─────────────────────────────────────────────────┘"
echo "============================================================"
