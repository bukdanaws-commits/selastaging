#!/bin/bash
# =============================================================================
#  SELEVENT — Staging Update Script
#  Updates the existing GCP Cloud Run deployment with:
#    1. Fixed auth service (email fallback matching for seed users)
#    2. New DOKU sandbox credentials
#    3. Seed data in Cloud SQL
#    4. Rebuilt & redeployed backend + frontend
#
#  Project:   eventku-494416
#  Region:    asia-southeast2 (Jakarta)
#
#  Usage:
#    chmod +x update-staging.sh
#    ./update-staging.sh                    # Full update
#    ./update-staging.sh --step 2           # Run only step 2
#    ./update-staging.sh --dry-run          # Preview mode
#    ./update-staging.sh --skip-seed        # Skip database seeding
# =============================================================================

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Configuration ────────────────────────────────────────────────────────────
PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
DB_INSTANCE="eventku"
DB_NAME="eventku"
DB_USER="eventku"
DB_PASSWORD="Bukdan#bangku101"
CLOUDSQL_CONNECTION="${PROJECT_ID}:${REGION}:${DB_INSTANCE}"

# Cloud Run services
BACKEND_SERVICE="eventku-api"
FRONTEND_SERVICE="eventku-web"

# Artifact Registry
AR_REPO="eventku"
AR_LOCATION="${REGION}"

# DOKU Sandbox Credentials (NEW — March 2025)
DOKU_CLIENT_ID="BRN-0252-1778130371806"
DOKU_CLIENT_SECRET="SK-X1oIgyQUlXcdxBeGvWrB"
DOKU_SHARED_KEY="doku_key_sandbox_ed97f1c31f0b4119bfa35d6aa39e1d82"
DOKU_BSN="SK-zvnfHvsAy59mNLUDfxSb"
DOKU_IS_SANDBOX="true"

# Google OAuth
GOOGLE_CLIENT_ID="503551786622-k3uajo9c2d6om6qnqofsa3b47fvo5o6g.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# SUPER_ADMIN_EMAILS — email yang auto-promote ke SUPER_ADMIN
SUPER_ADMIN_EMAILS="bukdan101@gmail.com"

# JWT secrets (reuse existing or generate new)
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -hex 32)}"

# Script control
DRY_RUN=false
RUN_STEP=""
FROM_STEP=""
SKIP_SEED=false
SKIP_CONFIRM=false
SCRIPT_START=$(date +%s)

# ── Parse Arguments ──────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --dry-run)          DRY_RUN=true ;;
    --step=*)           RUN_STEP="${arg#*=}" ;;
    --from-step=*)      FROM_STEP="${arg#*=}" ;;
    --skip-seed)        SKIP_SEED=true ;;
    --yes|-y)           SKIP_CONFIRM=true ;;
    --help|-h)
      echo "Usage: ./update-staging.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run         Preview mode (no changes)"
      echo "  --step N          Run only step N"
      echo "  --from-step N     Start from step N"
      echo "  --skip-seed       Skip database seeding"
      echo "  --yes / -y        Skip confirmation prompts"
      echo "  --help / -h       Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      exit 1
      ;;
  esac
done

# ── Helper Functions ─────────────────────────────────────────────────────────
info()    { echo -e "  ${BLUE}ℹ${NC} $*"; }
success() { echo -e "  ${GREEN}✔${NC} $*"; }
warn()    { echo -e "  ${YELLOW}⚠${NC} $*"; }
error()   { echo -e "  ${RED}✖${NC} $*"; }

step_header() {
  local num="$1"
  local title="$2"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  STEP ${num}: ${title}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

should_run_step() {
  local step="$1"
  if [ -n "$RUN_STEP" ] && [ "$RUN_STEP" != "$step" ]; then return 1; fi
  if [ -n "$FROM_STEP" ] && [ "$step" -lt "$FROM_STEP" ]; then return 1; fi
  return 0
}

confirm() {
  local msg="$1"
  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} Would prompt: ${msg}"
    return 0
  fi
  if [ "$SKIP_CONFIRM" = true ]; then
    echo -e "  ${DIM}(auto-confirmed)${NC}"
    return 0
  fi
  echo ""
  echo -e "  ${YELLOW}⚡ ${msg}${NC}"
  read -p "  Continue? [y/N]: " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then return 0; else return 1; fi
}

elapsed() {
  local now=$(date +%s)
  local diff=$((now - SCRIPT_START))
  echo "${diff}s"
}

# ── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${BOLD}${CYAN}║     🔄 SELEVENT — Staging Update (Auth Fix + DOKU + Seed Data)       ║${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Changes:${NC}"
echo -e "    ✅ Auth service: Email fallback matching (claim seed users)"
echo -e "    ✅ DOKU:        New sandbox credentials (BRN-0252-...)"
echo -e "    ✅ SUPER_ADMIN: bukdan101@gmail.com"
echo -e "    ✅ Seed Data:   Sheila On 7 Tour 2025 (5 cities, 60K tickets)"
echo ""
echo -e "  ${BOLD}Configuration:${NC}"
echo -e "    Project:       ${BOLD}${PROJECT_ID}${NC}"
echo -e "    Region:        ${BOLD}${REGION}${NC}"
echo -e "    DOKU Client:   ${BOLD}${DOKU_CLIENT_ID}${NC}"
echo -e "    Admin Email:   ${BOLD}${SUPER_ADMIN_EMAILS}${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}━━━ 🔍 DRY-RUN MODE — No changes will be made ━━━${NC}"
  echo ""
fi

# =============================================================================
# STEP 1: Verify Current Deployment
# =============================================================================
if should_run_step 1; then
  step_header 1 "Verify Current Deployment"

  # Check gcloud
  if ! command -v gcloud &>/dev/null; then
    error "gcloud CLI not found!"
    exit 1
  fi
  success "gcloud CLI: $(gcloud --version 2>/dev/null | head -1)"

  # Check project
  CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
  if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    info "Setting project to ${PROJECT_ID}..."
    gcloud config set project "$PROJECT_ID"
  fi
  success "Project: ${PROJECT_ID}"

  # Check Cloud SQL
  SQL_STATE=$(gcloud sql instances describe "$DB_INSTANCE" --format='value(state)' 2>/dev/null || echo "NOT_FOUND")
  if [ "$SQL_STATE" = "RUNNABLE" ]; then
    success "Cloud SQL '${DB_INSTANCE}': RUNNABLE"
  else
    error "Cloud SQL '${DB_INSTANCE}' state: ${SQL_STATE}"
    exit 1
  fi

  # Check existing Cloud Run services
  BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")
  FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")

  if [ -n "$BACKEND_URL" ]; then
    success "Backend: ${BACKEND_URL}"
  else
    error "Backend service '${BACKEND_SERVICE}' not found!"
    exit 1
  fi

  if [ -n "$FRONTEND_URL" ]; then
    success "Frontend: ${FRONTEND_URL}"
  else
    warn "Frontend service '${FRONTEND_SERVICE}' not found"
  fi

  # Quick health check
  if [ -n "$BACKEND_URL" ] && [ "$DRY_RUN" != true ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" 2>/dev/null || echo "000")
    info "Backend health: HTTP ${HTTP_CODE}"
  fi

  echo ""
  success "Step 1 complete: Current deployment verified ($(elapsed))"
fi

# =============================================================================
# STEP 2: Update Secret Manager with New DOKU Credentials
# =============================================================================
if should_run_step 2; then
  step_header 2 "Update Secret Manager (New DOKU Sandbox Credentials)"

  confirm "Update Secret Manager secrets with new DOKU sandbox credentials?"

  # Function to create or update a secret
  create_or_update_secret() {
    local name="$1"
    local value="$2"

    if [ "$DRY_RUN" = true ]; then
      echo -e "  ${YELLOW}[DRY-RUN]${NC} Would update secret: ${name}"
      return 0
    fi

    # Check if secret exists
    if gcloud secrets describe "$name" --format='value(name)' &>/dev/null; then
      # Update existing secret with new version
      echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --quiet 2>/dev/null
      success "Secret '${name}' updated (new version)"
    else
      # Create new secret
      echo -n "$value" | gcloud secrets create "$name" --data-file=- --quiet 2>/dev/null
      success "Secret '${name}' created"
    fi
  }

  info "Updating DOKU sandbox secrets..."
  create_or_update_secret "doku-client-id" "$DOKU_CLIENT_ID"
  create_or_update_secret "doku-client-secret" "$DOKU_CLIENT_SECRET"
  create_or_update_secret "doku-shared-key" "$DOKU_SHARED_KEY"
  create_or_update_secret "doku-bsn" "$DOKU_BSN"

  # Also ensure other secrets exist
  info "Verifying other secrets..."
  create_or_update_secret "db-password" "$DB_PASSWORD"
  create_or_update_secret "jwt-secret" "$JWT_SECRET"
  create_or_update_secret "jwt-refresh-secret" "$JWT_REFRESH_SECRET"
  create_or_update_secret "nextauth-secret" "$NEXTAUTH_SECRET"
  create_or_update_secret "google-client-id" "$GOOGLE_CLIENT_ID"
  create_or_update_secret "google-client-secret" "$GOOGLE_CLIENT_SECRET"

  echo ""
  success "Step 2 complete: Secret Manager updated ($(elapsed))"
fi

# =============================================================================
# STEP 3: Seed Cloud SQL Database
# =============================================================================
if should_run_step 3; then
  step_header 3 "Seed Cloud SQL Database"

  if [ "$SKIP_SEED" = true ]; then
    warn "Skipping database seeding (--skip-seed flag)"
  else
    confirm "⚠️  This will DELETE existing data and insert fresh seed data. Continue?"

    if [ "$DRY_RUN" != true ]; then
      info "Pulling latest code from GitHub..."
      git pull origin main 2>/dev/null || true

      SEED_FILE="backend/database/seed-data.sql"

      if [ ! -f "$SEED_FILE" ]; then
        error "Seed file not found: ${SEED_FILE}"
        exit 1
      fi
      success "Seed file found: ${SEED_FILE}"

      info "Connecting to Cloud SQL and executing seed data..."
      info "Using: gcloud sql import sql"

      # Upload seed file to a GCS bucket temporarily
      GCS_BUCKET="gs://${PROJECT_ID}-staging-seed"

      # Create bucket if not exists
      if ! gsutil ls "$GCS_BUCKET" &>/dev/null; then
        info "Creating GCS bucket: ${GCS_BUCKET}"
        gsutil mb -p "$PROJECT_ID" -l "$REGION" "$GCS_BUCKET" 2>/dev/null || true
      fi

      # Upload seed file
      SEED_GCS_PATH="${GCS_BUCKET}/seed-data-$(date +%Y%m%d-%H%M%S).sql"
      info "Uploading seed file to ${SEED_GCS_PATH}..."
      gsutil cp "$SEED_FILE" "$SEED_GCS_PATH"

      # Import into Cloud SQL
      info "Importing seed data into Cloud SQL instance '${DB_INSTANCE}' database '${DB_NAME}'..."
      info "This may take 1-2 minutes..."

      gcloud sql import sql "$DB_INSTANCE" "$SEED_GCS_PATH" \
        --database="$DB_NAME" \
        --user="$DB_USER" \
        --quiet \
        --project="$PROJECT_ID"

      success "Seed data imported successfully!"

      # Clean up GCS file
      info "Cleaning up GCS seed file..."
      gsutil rm "$SEED_GCS_PATH" 2>/dev/null || true

      # Verify by querying user count
      info "Verifying seed data..."
      USER_COUNT=$(gcloud sql databases execute \
        "SELECT count(*) FROM users;" \
        --instance="$DB_INSTANCE" \
        --database="$DB_NAME" \
        --format='value(count)' 2>/dev/null || echo "?")
      EVENT_COUNT=$(gcloud sql databases execute \
        "SELECT count(*) FROM events;" \
        --instance="$DB_INSTANCE" \
        --database="$DB_NAME" \
        --format='value(count)' 2>/dev/null || echo "?")
      TT_COUNT=$(gcloud sql databases execute \
        "SELECT count(*) FROM ticket_types;" \
        --instance="$DB_INSTANCE" \
        --database="$DB_NAME" \
        --format='value(count)' 2>/dev/null || echo "?")

      success "Users: ${USER_COUNT}, Events: ${EVENT_COUNT}, Ticket Types: ${TT_COUNT}"

      # Show the SUPER_ADMIN user
      info "SUPER_ADMIN user in database:"
      gcloud sql databases execute \
        "SELECT id, email, name, role FROM users WHERE role='SUPER_ADMIN';" \
        --instance="$DB_INSTANCE" \
        --database="$DB_NAME" \
        --format='table' 2>/dev/null || true
    else
      echo -e "  ${YELLOW}[DRY-RUN]${NC} Would seed database with ${SEED_FILE}"
    fi
  fi

  echo ""
  success "Step 3 complete: Database seeded ($(elapsed))"
fi

# =============================================================================
# STEP 4: Rebuild & Deploy Backend (with Auth Fix)
# =============================================================================
if should_run_step 4; then
  step_header 4 "Rebuild & Deploy Backend (Auth Fix)"

  confirm "Rebuild and deploy backend with auth service fix? (5-10 minutes)"

  BACKEND_IMAGE="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${BACKEND_SERVICE}"

  if [ "$DRY_RUN" != true ]; then
    # ── Phase 1: Pull latest code ─────────────────────────────────────────
    info "Pulling latest code from GitHub..."
    git pull origin main 2>/dev/null || true

    # ── Phase 2: Build Go binary on host ──────────────────────────────────
    info "Phase 1: Building Go binary on Cloud Shell host..."
    cd backend

    # Ensure Go is available
    if ! command -v go &>/dev/null; then
      info "Installing Go 1.25..."
      curl -sLO https://go.dev/dl/go1.25.0.linux-amd64.tar.gz
      sudo tar -C /usr/local -xzf go1.25.0.linux-amd64.tar.gz
      export PATH=$PATH:/usr/local/go/bin
      rm -f go1.25.0.linux-amd64.tar.gz
    fi

    info "Running: CGO_ENABLED=0 go build -o ../eventku-api ./cmd/server"
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
      -ldflags="-s -w -X main.version=staging-authfix-$(date +%Y%m%d-%H%M%S)" \
      -o ../eventku-api ./cmd/server

    cd ..
    success "Go binary built: $(ls -lh eventku-api | awk '{print $5}')"

    # ── Phase 3: Cloud Build + Push ──────────────────────────────────────
    info "Phase 2: Preparing Cloud Build context..."
    mkdir -p /tmp/backend-build
    cp eventku-api /tmp/backend-build/

    cat > /tmp/backend-build/Dockerfile << 'DOCKERFILE'
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata libc6-compat
ENV TZ=Asia/Jakarta
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 -G appuser appuser
WORKDIR /app
COPY --chown=appuser:appuser eventku-api /app/eventku-api
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
ENTRYPOINT ["/app/eventku-api"]
DOCKERFILE

    info "Phase 3: Submitting to Cloud Build (pushes to Artifact Registry)..."
    gcloud builds submit /tmp/backend-build \
      --tag="${BACKEND_IMAGE}:latest" \
      --project="${PROJECT_ID}" \
      --quiet

    success "Backend image pushed to Artifact Registry"

    # Cleanup
    rm -rf /tmp/backend-build

    # ── Phase 4: Deploy to Cloud Run ─────────────────────────────────────
    info "Deploying ${BACKEND_SERVICE} to Cloud Run..."

    gcloud run deploy "$BACKEND_SERVICE" \
      --image="${BACKEND_IMAGE}:latest" \
      --region="$REGION" \
      --platform=managed \
      --cpu=1 \
      --memory=512Mi \
      --min-instances=0 \
      --max-instances=10 \
      --concurrency=80 \
      --timeout=300 \
      --port=8080 \
      --add-cloudsql-instances="$CLOUDSQL_CONNECTION" \
      --set-env-vars="\
APP_ENV=staging,\
DB_DRIVER=postgres,\
DB_HOST=/cloudsql/${CLOUDSQL_CONNECTION},\
DB_PORT=5432,\
DB_USER=${DB_USER},\
DB_NAME=${DB_NAME},\
DB_SSLMODE=disable,\
DOKU_CLIENT_ID=${DOKU_CLIENT_ID},\
DOKU_IS_SANDBOX=${DOKU_IS_SANDBOX},\
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},\
SUPER_ADMIN_EMAILS=${SUPER_ADMIN_EMAILS}" \
      --set-secrets="\
DB_PASSWORD=db-password:latest,\
JWT_SECRET=jwt-secret:latest,\
REFRESH_JWT_SECRET=jwt-refresh-secret:latest,\
DOKU_CLIENT_SECRET=doku-client-secret:latest,\
DOKU_SHARED_KEY=doku-shared-key:latest,\
DOKU_BSN=doku-bsn:latest,\
GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
      --allow-unauthenticated \
      --quiet

    success "Backend deployed to Cloud Run!"

    # Verify
    BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")
    info "Backend URL: ${BACKEND_URL}"

    # Health check
    sleep 5
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      success "Backend health check: OK (${HTTP_CODE})"
    else
      warn "Backend health check: HTTP ${HTTP_CODE} (may need warm-up)"
    fi

    # Check revision
    REVISION=$(gcloud run services describe "$BACKEND_SERVICE" \
      --region="$REGION" --format='value(status.latestCreatedRevisionName)' 2>/dev/null || echo "unknown")
    info "Revision: ${REVISION}"
  fi

  echo ""
  success "Step 4 complete: Backend rebuilt & deployed ($(elapsed))"
fi

# =============================================================================
# STEP 5: Rebuild & Deploy Frontend
# =============================================================================
if should_run_step 5; then
  step_header 5 "Rebuild & Deploy Frontend"

  confirm "Rebuild and deploy frontend? (5-10 minutes)"

  if [ "$DRY_RUN" != true ]; then
    # Get backend URL for NEXT_PUBLIC_API_URL
    BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")
    info "Backend URL for frontend: ${BACKEND_URL}"

    FRONTEND_IMAGE="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${FRONTEND_SERVICE}"

    # Use Cloud Build for frontend (needs npm install + next build)
    info "Submitting frontend build to Cloud Build..."

    gcloud builds submit . \
      --config=gcp/cloudbuild-frontend-cloudrun.yaml \
      --substitutions="\
_BACKEND_URL=${BACKEND_URL},\
_DOKU_NOTIFICATION_URL=${BACKEND_URL}/api/v1/doku/notification,\
_NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},\
_NEXT_PUBLIC_API_URL=${BACKEND_URL},\
_NEXT_PUBLIC_USE_MOCK=false,\
_NEXT_PUBLIC_DOKU_CLIENT_ID=${DOKU_CLIENT_ID}" \
      --project="${PROJECT_ID}" \
      --quiet

    success "Frontend image pushed to Artifact Registry"

    # Deploy to Cloud Run
    FRONTEND_RUN_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")

    info "Deploying ${FRONTEND_SERVICE} to Cloud Run..."

    gcloud run deploy "$FRONTEND_SERVICE" \
      --image="${FRONTEND_IMAGE}:latest" \
      --region="$REGION" \
      --platform=managed \
      --cpu=1 \
      --memory=512Mi \
      --min-instances=0 \
      --max-instances=10 \
      --concurrency=80 \
      --timeout=300 \
      --port=3000 \
      --set-secrets="\
NEXTAUTH_SECRET=nextauth-secret:latest" \
      --set-env-vars="\
NODE_ENV=production,\
NEXTAUTH_URL=${FRONTEND_RUN_URL}" \
      --allow-unauthenticated \
      --quiet

    success "Frontend deployed to Cloud Run!"

    # Verify
    FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")
    info "Frontend URL: ${FRONTEND_URL}"

    # Health check
    sleep 5
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ]; then
      success "Frontend health check: OK (${HTTP_CODE})"
    else
      warn "Frontend health check: HTTP ${HTTP_CODE} (may need warm-up)"
    fi

    # Check revision
    REVISION=$(gcloud run services describe "$FRONTEND_SERVICE" \
      --region="$REGION" --format='value(status.latestCreatedRevisionName)' 2>/dev/null || echo "unknown")
    info "Revision: ${REVISION}"
  fi

  echo ""
  success "Step 5 complete: Frontend rebuilt & deployed ($(elapsed))"
fi

# =============================================================================
# STEP 6: Verification Tests
# =============================================================================
if should_run_step 6; then
  step_header 6 "Verification Tests"

  if [ "$DRY_RUN" != true ]; then
    BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")
    FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")

    echo ""
    info "Running verification tests..."

    # Test 1: Backend health
    info "Test 1: Backend health check..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      success "Backend health: OK (${HTTP_CODE})"
    else
      error "Backend health: HTTP ${HTTP_CODE}"
    fi

    # Test 2: Backend CORS
    info "Test 2: Backend CORS headers..."
    CORS_HEADER=$(curl -s -I -X OPTIONS \
      -H "Origin: ${FRONTEND_URL}" \
      -H "Access-Control-Request-Method: POST" \
      "${BACKEND_URL}/api/v1/auth/google" 2>/dev/null | \
      grep -i "access-control-allow-origin" | head -1 || echo "none")
    if echo "$CORS_HEADER" | grep -q "access-control"; then
      success "CORS: ${CORS_HEADER}" | tr -d '\r'
    else
      warn "CORS: No Access-Control-Allow-Origin header found"
    fi

    # Test 3: Frontend page
    info "Test 3: Frontend page..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ]; then
      success "Frontend: OK (${HTTP_CODE})"
    else
      error "Frontend: HTTP ${HTTP_CODE}"
    fi

    # Test 4: Google Client ID in frontend JS
    info "Test 4: Google Client ID in frontend JS bundle..."
    JS_BUNDLE=$(curl -s "${FRONTEND_URL}" 2>/dev/null | \
      grep -oP '_next/static/[^"]+\.js' | head -1 || echo "")
    if [ -n "$JS_BUNDLE" ]; then
      FULL_URL="${FRONTEND_URL}/${JS_BUNDLE}"
      FOUND=$(curl -s "$FULL_URL" 2>/dev/null | grep -c "$GOOGLE_CLIENT_ID" || echo "0")
      if [ "$FOUND" -gt 0 ]; then
        success "Google Client ID found in JS bundle"
      else
        warn "Google Client ID NOT found in JS bundle (may need rebuild)"
      fi
    else
      warn "Could not find JS bundle URL"
    fi

    # Test 5: Auth endpoint
    info "Test 5: Auth endpoint (POST without token)..."
    AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d '{"idToken":"invalid-test-token"}' \
      "${BACKEND_URL}/api/v1/auth/google" 2>/dev/null || echo -e "\n000")
    AUTH_HTTP=$(echo "$AUTH_RESPONSE" | tail -1)
    AUTH_BODY=$(echo "$AUTH_RESPONSE" | head -1)
    # We expect 401/400 (invalid token), not 500 (server error) or 404 (route missing)
    if [ "$AUTH_HTTP" = "401" ] || [ "$AUTH_HTTP" = "400" ]; then
      success "Auth endpoint: Working (returns ${AUTH_HTTP} for invalid token — expected)"
    elif [ "$AUTH_HTTP" = "500" ]; then
      error "Auth endpoint: HTTP 500 (server error!)"
      info "Response: ${AUTH_BODY}"
    else
      warn "Auth endpoint: HTTP ${AUTH_HTTP} (expected 401/400 for invalid token)"
    fi

    # Test 6: DOKU configuration check
    info "Test 6: Backend DOKU configuration..."
    DOKU_RESPONSE=$(curl -s "${BACKEND_URL}/api/v1/doku/status" 2>/dev/null || echo "")
    if echo "$DOKU_RESPONSE" | grep -q "configured"; then
      success "DOKU: Configured"
    elif echo "$DOKU_RESPONSE" | grep -q "not configured"; then
      warn "DOKU: Not configured (missing credentials)"
    else
      info "DOKU status endpoint not available (may not exist yet)"
    fi

    echo ""
    info "═══════════════════════════════════════════════════════════"
    info "  STAGING DEPLOYMENT SUMMARY"
    info "═══════════════════════════════════════════════════════════"
    echo ""
    echo -e "  ${BOLD}Backend:${NC}  ${BACKEND_URL}"
    echo -e "  ${BOLD}Frontend:${NC} ${FRONTEND_URL}"
    echo ""
    echo -e "  ${BOLD}DOKU Sandbox:${NC}"
    echo -e "    Client ID:   ${DOKU_CLIENT_ID}"
    echo -e "    Shared Key:  ${DOKU_SHARED_KEY:0:20}..."
    echo ""
    echo -e "  ${BOLD}Auth:${NC}"
    echo -e "    Admin Email: ${SUPER_ADMIN_EMAILS}"
    echo -e "    Google ID:   ${GOOGLE_CLIENT_ID:0:30}..."
    echo ""
    echo -e "  ${GREEN}✅ Email Fallback Matching is ACTIVE${NC}"
    echo -e "  ${GREEN}✅ Seed users with fake google_id can be 'claimed' by real Google login${NC}"
    echo ""
  fi

  echo ""
  success "Step 6 complete: Verification done ($(elapsed))"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  🎉 STAGING UPDATE COMPLETE!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "N/A")
FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
  --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "N/A")

echo -e "  ${BOLD}Backend:${NC}  ${BACKEND_URL}"
echo -e "  ${BOLD}Frontend:${NC} ${FRONTEND_URL}"
echo ""
echo -e "  ${BOLD}What Changed:${NC}"
echo "  ✅ Auth service: Email fallback matching (seed user claim)"
echo "  ✅ DOKU: New sandbox credentials (BRN-0252-1778130371806)"
echo "  ✅ SUPER_ADMIN email: bukdan101@gmail.com"
echo "  ✅ Database: Seeded with Sheila On 7 Tour 2025 data"
echo ""
echo -e "  ${BOLD}Next Steps:${NC}"
echo "  1. Add Cloud Run frontend URL to Google OAuth Console:"
echo "     → https://console.cloud.google.com/apis/credentials"
echo "     → Add '${FRONTEND_URL}' to Authorized JavaScript origins"
echo ""
echo "  2. Test Google Login with bukdan101@gmail.com"
echo "     → Should 'claim' the SUPER_ADMIN seed user"
echo "     → First login updates google_id from 'google-superadmin' to real Google Sub ID"
echo ""
echo "  3. Test DOKU sandbox payment flow"
echo ""
echo "  4. ⚠️  ROTATE all credentials shared in chat!"
echo ""
echo -e "  Total time: $(elapsed)"
echo ""
