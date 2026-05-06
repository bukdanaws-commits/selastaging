# =============================================================================
#  EVENTKU — GCP Deployment Guide
#  Project: eventku-494416 | Region: asia-southeast2 (Jakarta)
#  Cloud SQL: eventku-494416:asia-southeast2:eventku
#  Backend Cloud Run: eventku-api
# =============================================================================

# ── PREREQUISITES ────────────────────────────────────────────────────────────
# 1. gcloud CLI installed and authenticated
# 2. Docker installed (for local testing)
# 3. Access to GCP project eventku-494416
# 4. Cloud SQL Admin API enabled
# 5. Cloud Run Admin API enabled
# 6. Artifact Registry API enabled
# 7. Secret Manager API enabled

# ── STEP 0: SETUP ───────────────────────────────────────────────────────────

# Authenticate
gcloud auth login
gcloud config set project eventku-494416
gcloud config set region asia-southeast2

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com

# ── STEP 1: CREATE ARTIFACT REGISTRY ────────────────────────────────────────

gcloud artifacts repositories create eventku-repo \
  --repository-format=docker \
  --location=asia-southeast2 \
  --description="Eventku Docker images"

# ── STEP 2: CREATE SECRETS IN SECRET MANAGER ────────────────────────────────

echo -n "Bukdan#bangku101" | \
  gcloud secrets create DB_PASSWORD --data-file=-

echo -n "SK-zgNQt47nzv2f3sPTDPG4" | \
  gcloud secrets create DOKU_CLIENT_SECRET --data-file=-

echo -n "doku_key_3a4d17030ddd4adaa5a398f88c867556" | \
  gcloud secrets create DOKU_SHARED_KEY --data-file=-

echo -n "BSN-0222-1777799032208" | \
  gcloud secrets create DOKU_BSN --data-file=-

# Generate JWT secrets
openssl rand -base64 32 | tr -d '\n' | \
  gcloud secrets create JWT_SECRET --data-file=-

openssl rand -base64 32 | tr -d '\n' | \
  gcloud secrets create REFRESH_JWT_SECRET --data-file=-

# ── STEP 3: BUILD & DEPLOY BACKEND ─────────────────────────────────────────

# Build and push to Artifact Registry using Cloud Build
gcloud builds submit --config deploy/gcp/cloudbuild-backend.yaml \
  --substitutions=_REGION=asia-southeast2,_REPO=eventku-repo

# OR manual build + push:
# docker build -f backend/Dockerfile -t asia-southeast2-docker.pkg.dev/eventku-494416/eventku-repo/backend:latest .
# docker push asia-southeast2-docker.pkg.dev/eventku-494416/eventku-repo/backend:latest

# Deploy backend to Cloud Run (update existing service)
gcloud run deploy eventku-api \
  --image=asia-southeast2-docker.pkg.dev/eventku-494416/eventku-repo/backend:latest \
  --region=asia-southeast2 \
  --platform=managed \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --add-cloudsql-instances=eventku-494416:asia-southeast2:eventku \
  --set-env-vars="DB_DRIVER=postgres,DB_HOST=/cloudsql/eventku-494416:asia-southeast2:eventku,DB_PORT=5432,DB_USER=eventku,DB_NAME=eventku,DB_SSLMODE=require,APP_ENV=production,APP_PORT=8080,DOKU_CLIENT_ID=BRN-0222-1777799032222,DOKU_IS_SANDBOX=true,JWT_EXPIRATION=24h,REFRESH_JWT_EXPIRATION=168h" \
  --update-secrets="DB_PASSWORD=DB_PASSWORD:latest,DOKU_CLIENT_SECRET=DOKU_CLIENT_SECRET:latest,DOKU_SHARED_KEY=DOKU_SHARED_KEY:latest,DOKU_BSN=DOKU_BSN:latest,JWT_SECRET=JWT_SECRET:latest,REFRESH_JWT_SECRET=REFRESH_JWT_SECRET:latest"

# ── STEP 4: BUILD & DEPLOY FRONTEND ─────────────────────────────────────────

# Build with production env vars baked in
gcloud builds submit --config deploy/gcp/cloudbuild-frontend.yaml \
  --substitutions=_REGION=asia-southeast2,_REPO=eventku-repo

# OR manual build:
# docker build -f Dockerfile.frontend \
#   --build-arg NEXT_PUBLIC_API_URL=https://api.sheilaon7.eventku.co.id \
#   --build-arg NEXT_PUBLIC_USE_MOCK=false \
#   --build-arg NEXT_PUBLIC_DOKU_ENVIRONMENT=sandbox \
#   --build-arg NEXT_PUBLIC_DOKU_CLIENT_ID=BRN-0222-1777799032222 \
#   -t asia-southeast2-docker.pkg.dev/eventku-494416/eventku-repo/frontend:latest .
# docker push asia-southeast2-docker.pkg.dev/eventku-494416/eventku-repo/frontend:latest

# Deploy frontend to Cloud Run (new service)
gcloud run deploy sheilaon7-frontend \
  --image=asia-southeast2-docker.pkg.dev/eventku-494416/eventku-repo/frontend:latest \
  --region=asia-southeast2 \
  --platform=managed \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=5 \
  --timeout=300 \
  --set-env-vars="NEXT_PUBLIC_API_URL=https://api.sheilaon7.eventku.co.id,NEXT_PUBLIC_USE_MOCK=false,NEXT_PUBLIC_DOKU_ENVIRONMENT=sandbox,NEXT_PUBLIC_DOKU_CLIENT_ID=BRN-0222-1777799032222,NEXT_PUBLIC_DOKU_NOTIFICATION_URL=https://api.sheilaon7.eventku.co.id/api/v1/doku/notification,NEXT_PUBLIC_DOKU_FINISH_URL=https://sheilaon7.eventku.co.id/payment/success,NEXT_PUBLIC_DOKU_ERROR_URL=https://sheilaon7.eventku.co.id/payment/error,NEXT_PUBLIC_DOKU_UNPAYMENT_URL=https://sheilaon7.eventku.co.id/payment/pending"

# ── STEP 5: RUN DATABASE MIGRATION ─────────────────────────────────────────
# Option A: Run seed job on Cloud Run
gcloud run jobs create eventku-migrate \
  --image=asia-southeast2-docker.pkg.dev/eventku-494416/eventku-repo/backend:latest \
  --region=asia-southeast2 \
  --task-environment=\
  --add-cloudsql-instances=eventku-494416:asia-southeast2:eventku \
  --set-env-vars="DB_DRIVER=postgres,DB_HOST=/cloudsql/eventku-494416:asia-southeast2:eventku,DB_PORT=5432,DB_USER=eventku,DB_NAME=eventku,DB_SSLMODE=require" \
  --update-secrets="DB_PASSWORD=DB_PASSWORD:latest" \
  --command="/app/eventku-api" \
  --args="--migrate"

# Option B: Connect to Cloud SQL from local machine using Cloud SQL Auth Proxy
# Install: https://cloud.google.com/sql/docs/postgres/sql-proxy
# ./cloud-sql-proxy eventku-494416:asia-southeast2:eventku
# Then run migration locally:
# DB_DRIVER=postgres DB_HOST=127.0.0.1 DB_PORT=5432 DB_USER=eventku \
#   DB_PASSWORD="Bukdan#bangku101" DB_NAME=eventku DB_SSLMODE=disable \
#   go run ./cmd/server/main.go

# Option C: Run migration via Cloud Build
# gcloud builds submit --config deploy/gcp/cloudbuild-migrate.yaml

# ── STEP 6: SEED DATABASE ───────────────────────────────────────────────────
# After migration, seed with initial data
# Option: Run seed from local via Cloud SQL Auth Proxy
# DB_DRIVER=postgres DB_HOST=127.0.0.1 DB_PORT=5432 DB_USER=eventku \
#   DB_PASSWORD="Bukdan#bangku101" DB_NAME=eventku DB_SSLMODE=disable \
#   go run ./cmd/seed/main.go

# ── STEP 7: CONFIGURE CLOUDFLARE DNS ────────────────────────────────────────
# In Cloudflare Dashboard for eventku.co.id:
#
# Type    Name            Content                                         Proxy
# ────    ────            ───────                                         ─────
# CNAME   sheilaon7       sheilaon7-frontend-XXXXX.run.app               ☁️ Proxied
# CNAME   api.sheilaon7   eventku-api-503551786622.asia-southeast2.run.app ☁️ Proxied
#
# NOTE: Frontend CNAME will be known after first deploy (Step 4)
#
# Cloudflare Settings:
# - SSL/TLS Mode: Full (Strict)
# - Always Use HTTPS: On
# - Minimum TLS: 1.2

# ── STEP 8: UPDATE DOKU DASHBOARD ───────────────────────────────────────────
# Login to DOKU Dashboard and update:
# - Payment Notification URL: https://api.sheilaon7.eventku.co.id/api/v1/doku/notification
# - Identify URL: (if applicable)
# - Switch to Production credentials when ready

# ── STEP 9: VERIFY ──────────────────────────────────────────────────────────

# Test backend health
curl https://api.sheilaon7.eventku.co.id/health

# Test frontend
curl -I https://sheilaon7.eventku.co.id

# Test DOKU B2B token
curl -X POST https://api.sheilaon7.eventku.co.id/api/v1/doku/test-token

# ── USEFUL COMMANDS ──────────────────────────────────────────────────────────

# View Cloud Run logs
gcloud run services logs read eventku-api --region=asia-southeast2 --limit=50

# View Cloud SQL logs
gcloud sql instances list
gcloud sql databases list --instance=eventku

# SSH into Cloud SQL
gcloud sql connect eventku --user=eventku --database=eventku

# List secrets
gcloud secrets list

# Update a secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy after code change
gcloud builds submit --config deploy/gcp/cloudbuild-backend.yaml
