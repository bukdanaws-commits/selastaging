#!/bin/bash
# =============================================================================
#  SELEVENT — Cloud Shell Deployment Script
#  Deploy to existing GCP infrastructure (Cloud Run + Cloud SQL PostgreSQL)
#
#  Project:   eventku-494416
#  Region:    asia-southeast2 (Jakarta)
#  Cloud SQL: eventku (PostgreSQL 18.3)
#  DB:        eventku / eventku / Bukdan#bangku101
#
#  Usage:
#    chmod +x deploy-cloudshell.sh
#    ./deploy-cloudshell.sh              # Full deployment
#    ./deploy-cloudshell.sh --step 5     # Run only step 5
#    ./deploy-cloudshell.sh --from-step 3 # Start from step 3
#    ./deploy-cloudshell.sh --dry-run    # Preview mode
#
#  Prerequisites:
#    - Cloud Shell with gcloud authenticated
#    - Docker available in Cloud Shell
#    - Repository cloned: git clone https://github.com/bukdanaws-commits/selastaging.git
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

# Cloud Run service names
BACKEND_SERVICE="eventku-api"
FRONTEND_SERVICE="eventku-web"

# Artifact Registry
AR_REPO="eventku"
AR_LOCATION="${REGION}"

# Domain
FRONTEND_DOMAIN="sheilaon7.eventku.co.id"
BACKEND_DOMAIN="api.sheilaon7.eventku.co.id"

# DOKU Credentials (Sandbox)
DOKU_CLIENT_ID="BRN-0222-1777799032222"
DOKU_CLIENT_SECRET="SK-zgNQt47nzv2f3sPTDPG4"
DOKU_SHARED_KEY="doku_key_3a4d17030ddd4adaa5a398f88c867556"
DOKU_BSN="BSN-0222-1777799032208"
DOKU_IS_SANDBOX="true"

# Google OAuth
GOOGLE_CLIENT_ID="503551786622-k3uajo9c2d6om6qnqofsa3b47fvo5o6g.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# JWT secrets (generate if not set)
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -hex 32)}"

# Script control
DRY_RUN=false
RUN_STEP=""
FROM_STEP=""
SKIP_CONFIRM=false
SCRIPT_START=$(date +%s)

# ── Parse Arguments ──────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --dry-run)          DRY_RUN=true ;;
    --step=*)           RUN_STEP="${arg#*=}" ;;
    --from-step=*)      FROM_STEP="${arg#*=}" ;;
    --yes|-y)           SKIP_CONFIRM=true ;;
    --help|-h)
      echo "Usage: ./deploy-cloudshell.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run         Preview mode (no changes)"
      echo "  --step N          Run only step N"
      echo "  --from-step N     Start from step N"
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
echo -e "${BOLD}${CYAN}║     🚀 SELEVENT — Cloud Shell Deployment (GCP Cloud Run)             ║${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Configuration:${NC}"
echo -e "    Project:          ${BOLD}${PROJECT_ID}${NC}"
echo -e "    Region:           ${BOLD}${REGION}${NC} (Jakarta)"
echo -e "    Cloud SQL:        ${BOLD}${DB_INSTANCE}${NC} (PostgreSQL 18.3)"
echo -e "    Backend Service:  ${BOLD}${BACKEND_SERVICE}${NC}"
echo -e "    Frontend Service: ${BOLD}${FRONTEND_SERVICE}${NC}"
echo -e "    AR Repository:    ${BOLD}${AR_REPO}${NC}"
echo -e "    DOKU:             ${BOLD}Sandbox${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}━━━ 🔍 DRY-RUN MODE — No changes will be made ━━━${NC}"
  echo ""
fi

# =============================================================================
# STEP 1: Verify Prerequisites
# =============================================================================
if should_run_step 1; then
  step_header 1 "Verify Prerequisites"

  # Check gcloud
  if command -v gcloud &>/dev/null; then
    success "gcloud CLI: $(gcloud --version 2>/dev/null | head -1)"
  else
    error "gcloud CLI not found!"
    exit 1
  fi

  # Check Docker
  if command -v docker &>/dev/null; then
    success "Docker: $(docker --version 2>/dev/null)"
  else
    error "Docker not found! Required for building images."
    exit 1
  fi

  # Check gcloud auth
  AUTH_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1)
  if [ -n "$AUTH_ACCOUNT" ]; then
    success "Authenticated as: ${AUTH_ACCOUNT}"
  else
    error "Not authenticated! Run: gcloud auth login"
    exit 1
  fi

  # Check project
  CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
  if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    info "Setting project to ${PROJECT_ID}..."
    gcloud config set project "$PROJECT_ID"
  fi
  success "Project: ${PROJECT_ID}"

  # Check billing
  BILLING=$(gcloud beta billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || echo "unknown")
  if [ "$BILLING" = "True" ]; then
    success "Billing: Enabled"
  else
    warn "Billing status: ${BILLING}"
  fi

  # Check Cloud SQL instance
  SQL_STATE=$(gcloud sql instances describe "$DB_INSTANCE" --format='value(state)' 2>/dev/null || echo "NOT_FOUND")
  if [ "$SQL_STATE" = "RUNNABLE" ]; then
    success "Cloud SQL '${DB_INSTANCE}': RUNNABLE"
  else
    error "Cloud SQL '${DB_INSTANCE}' state: ${SQL_STATE}"
    echo "    Make sure the instance exists and is running."
    exit 1
  fi

  # Check disk space
  DISK_AVAIL=$(df -h /home | awk 'NR==2 {print $4}')
  success "Disk available: ${DISK_AVAIL}"

  echo ""
  success "Step 1 complete: All prerequisites verified ($(elapsed))"
fi

# =============================================================================
# STEP 2: Enable Required APIs
# =============================================================================
if should_run_step 2; then
  step_header 2 "Enable Required GCP APIs"

  confirm "Enable required APIs?"

  APIS=(
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "secretmanager.googleapis.com"
    "compute.googleapis.com"
    "iam.googleapis.com"
  )

  for api in "${APIS[@]}"; do
    api_name=$(echo "$api" | cut -d'.' -f1)
    info "Enabling ${api_name}..."
    if [ "$DRY_RUN" != true ]; then
      gcloud services enable "$api" --project="$PROJECT_ID" --quiet 2>/dev/null || true
    fi
  done

  echo ""
  success "Step 2 complete: APIs enabled ($(elapsed))"
fi

# =============================================================================
# STEP 3: Create Artifact Registry Repository
# =============================================================================
if should_run_step 3; then
  step_header 3 "Create Artifact Registry Repository"

  # Check if repo exists
  REPO_EXISTS=$(gcloud artifacts repositories describe "$AR_REPO" \
    --location="$AR_LOCATION" --format='value(name)' 2>/dev/null || echo "")

  if [ -n "$REPO_EXISTS" ]; then
    success "Artifact Registry '${AR_REPO}' already exists"
  else
    confirm "Create Artifact Registry Docker repository '${AR_REPO}'?"
    info "Creating Artifact Registry repository..."
    if [ "$DRY_RUN" != true ]; then
      gcloud artifacts repositories create "$AR_REPO" \
        --repository-format=docker \
        --location="$AR_LOCATION" \
        --description="SELEVENT Docker images" \
        --quiet
    fi
    success "Artifact Registry '${AR_REPO}' created"
  fi

  # Configure Docker auth for Artifact Registry
  info "Configuring Docker auth for Artifact Registry..."
  if [ "$DRY_RUN" != true ]; then
    gcloud auth configure-docker "${AR_LOCATION}-docker.pkg.dev" --quiet 2>/dev/null || true
  fi

  echo ""
  success "Step 3 complete: Artifact Registry ready ($(elapsed))"
fi

# =============================================================================
# STEP 4: Create Secret Manager Secrets
# =============================================================================
if should_run_step 4; then
  step_header 4 "Create Secret Manager Secrets"

  confirm "Create/update secrets in Secret Manager?"

  # Ensure Secret Manager API is enabled
  if [ "$DRY_RUN" != true ]; then
    gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" --quiet 2>/dev/null || true
  fi

  # Function to create or update a secret
  create_secret() {
    local name="$1"
    local value="$2"

    if [ "$DRY_RUN" = true ]; then
      echo -e "  ${YELLOW}[DRY-RUN]${NC} Would create secret: ${name}"
      return 0
    fi

    # Check if secret exists
    if gcloud secrets describe "$name" --format='value(name)' &>/dev/null; then
      # Update existing secret
      echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --quiet 2>/dev/null
      success "Secret '${name}' updated (new version)"
    else
      # Create new secret
      echo -n "$value" | gcloud secrets create "$name" --data-file=- --quiet 2>/dev/null
      success "Secret '${name}' created"
    fi
  }

  create_secret "db-password" "$DB_PASSWORD"
  create_secret "jwt-secret" "$JWT_SECRET"
  create_secret "jwt-refresh-secret" "$JWT_REFRESH_SECRET"
  create_secret "nextauth-secret" "$NEXTAUTH_SECRET"
  create_secret "doku-client-id" "$DOKU_CLIENT_ID"
  create_secret "doku-client-secret" "$DOKU_CLIENT_SECRET"
  create_secret "doku-shared-key" "$DOKU_SHARED_KEY"
  create_secret "doku-bsn" "$DOKU_BSN"
  create_secret "google-client-id" "$GOOGLE_CLIENT_ID"
  create_secret "google-client-secret" "$GOOGLE_CLIENT_SECRET"

  echo ""
  success "Step 4 complete: Secrets configured ($(elapsed))"
fi

# =============================================================================
# STEP 5: Build & Push Backend Docker Image
# =============================================================================
if should_run_step 5; then
  step_header 5 "Build & Push Backend Docker Image"

  confirm "Build and push backend Docker image? (This takes 3-5 minutes)"

  BACKEND_IMAGE="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${BACKEND_SERVICE}"
  BACKEND_TAG="${BACKEND_IMAGE}:$(date +%Y%m%d-%H%M%S)"
  BACKEND_LATEST="${BACKEND_IMAGE}:latest"

  info "Backend image: ${BACKEND_LATEST}"

  if [ "$DRY_RUN" != true ]; then
    # Build from project root (Docker context = ".")
    info "Building backend image..."
    docker build \
      --network=host \
      -f backend/Dockerfile \
      -t "$BACKEND_TAG" \
      -t "$BACKEND_LATEST" \
      --build-arg VERSION="cloudrun-$(date +%Y%m%d-%H%M%S)" \
      .

    success "Backend image built"

    # Push to Artifact Registry
    info "Pushing backend image to Artifact Registry..."
    docker push "$BACKEND_TAG"
    docker push "$BACKEND_LATEST"

    success "Backend image pushed"
  fi

  echo ""
  success "Step 5 complete: Backend image ready ($(elapsed))"
fi

# =============================================================================
# STEP 6: Deploy Backend to Cloud Run
# =============================================================================
if should_run_step 6; then
  step_header 6 "Deploy Backend to Cloud Run"

  confirm "Deploy backend to Cloud Run?"

  BACKEND_IMAGE="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${BACKEND_SERVICE}:latest"

  if [ "$DRY_RUN" != true ]; then
    info "Deploying ${BACKEND_SERVICE} to Cloud Run..."

    gcloud run deploy "$BACKEND_SERVICE" \
      --image="$BACKEND_IMAGE" \
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
APP_ENV=production,\
DB_DRIVER=postgres,\
DB_HOST=/cloudsql/${CLOUDSQL_CONNECTION},\
DB_PORT=5432,\
DB_USER=${DB_USER},\
DB_NAME=${DB_NAME},\
DB_SSLMODE=disable,\
DOKU_CLIENT_ID=${DOKU_CLIENT_ID},\
DOKU_IS_SANDBOX=${DOKU_IS_SANDBOX},\
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
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

    success "Backend deployed to Cloud Run"

    # Get the service URL
    BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")
    info "Backend URL: ${BACKEND_URL}"
  fi

  echo ""
  success "Step 6 complete: Backend deployed ($(elapsed))"
fi

# =============================================================================
# STEP 7: Build & Push Frontend Docker Image
# =============================================================================
if should_run_step 7; then
  step_header 7 "Build & Push Frontend Docker Image"

  confirm "Build and push frontend Docker image? (This takes 5-8 minutes)"

  # Get backend URL for build arg
  BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "https://${BACKEND_DOMAIN}")
  
  # For production, the frontend should call the backend via the custom domain
  # We'll use the Cloud Run URL initially, then switch to custom domain after DNS setup
  info "Backend URL for frontend: ${BACKEND_URL}"

  FRONTEND_IMAGE="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${FRONTEND_SERVICE}"
  FRONTEND_TAG="${FRONTEND_IMAGE}:$(date +%Y%m%d-%H%M%S)"
  FRONTEND_LATEST="${FRONTEND_IMAGE}:latest"

  if [ "$DRY_RUN" != true ]; then
    info "Building frontend image..."
    docker build \
      --network=host \
      -f Dockerfile.frontend \
      -t "$FRONTEND_TAG" \
      -t "$FRONTEND_LATEST" \
      --build-arg NEXT_PUBLIC_API_URL="${BACKEND_URL}" \
      --build-arg NEXT_PUBLIC_USE_MOCK=false \
      --build-arg NEXT_PUBLIC_DOKU_ENVIRONMENT=sandbox \
      --build-arg NEXT_PUBLIC_DOKU_API_BASE_URL=https://api-sandbox.doku.com \
      --build-arg NEXT_PUBLIC_DOKU_CHECKOUT_URL=https://checkout-sandbox.doku.com \
      --build-arg NEXT_PUBLIC_DOKU_CLIENT_ID="${DOKU_CLIENT_ID}" \
      --build-arg NEXT_PUBLIC_DOKU_NOTIFICATION_URL="${BACKEND_URL}/api/v1/doku/notification" \
      --build-arg NEXT_PUBLIC_DOKU_FINISH_URL="https://${FRONTEND_DOMAIN}/payment/success" \
      --build-arg NEXT_PUBLIC_DOKU_ERROR_URL="https://${FRONTEND_DOMAIN}/payment/error" \
      --build-arg NEXT_PUBLIC_DOKU_UNPAYMENT_URL="https://${FRONTEND_DOMAIN}/payment/pending" \
      --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
      --build-arg NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=5 \
      --build-arg NEXT_PUBLIC_SETTLEMENT_DAYS=7 \
      .

    success "Frontend image built"

    info "Pushing frontend image to Artifact Registry..."
    docker push "$FRONTEND_TAG"
    docker push "$FRONTEND_LATEST"

    success "Frontend image pushed"
  fi

  echo ""
  success "Step 7 complete: Frontend image ready ($(elapsed))"
fi

# =============================================================================
# STEP 8: Deploy Frontend to Cloud Run
# =============================================================================
if should_run_step 8; then
  step_header 8 "Deploy Frontend to Cloud Run"

  confirm "Deploy frontend to Cloud Run?"

  FRONTEND_IMAGE="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${FRONTEND_SERVICE}:latest"

  if [ "$DRY_RUN" != true ]; then
    info "Deploying ${FRONTEND_SERVICE} to Cloud Run..."

    gcloud run deploy "$FRONTEND_SERVICE" \
      --image="$FRONTEND_IMAGE" \
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
NODE_ENV=production" \
      --allow-unauthenticated \
      --quiet

    success "Frontend deployed to Cloud Run"

    # Get the service URL
    FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
      --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")
    info "Frontend URL: ${FRONTEND_URL}"
  fi

  echo ""
  success "Step 8 complete: Frontend deployed ($(elapsed))"
fi

# =============================================================================
# STEP 9: Verify Deployment
# =============================================================================
if should_run_step 9; then
  step_header 9 "Verify Deployment"

  info "Checking Cloud Run services..."

  # Backend health check
  BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")

  if [ -n "$BACKEND_URL" ]; then
    info "Backend URL: ${BACKEND_URL}"
    if [ "$DRY_RUN" != true ]; then
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" 2>/dev/null || echo "000")
      if [ "$HTTP_CODE" = "200" ]; then
        success "Backend health check: OK (${HTTP_CODE})"
      else
        warn "Backend health check: HTTP ${HTTP_CODE} (may need warm-up time)"
      fi
    fi
  else
    warn "Backend URL not found"
  fi

  # Frontend health check
  FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")

  if [ -n "$FRONTEND_URL" ]; then
    info "Frontend URL: ${FRONTEND_URL}"
    if [ "$DRY_RUN" != true ]; then
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null || echo "000")
      if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        success "Frontend health check: OK (${HTTP_CODE})"
      else
        warn "Frontend health check: HTTP ${HTTP_CODE} (may need warm-up time)"
      fi
    fi
  else
    warn "Frontend URL not found"
  fi

  # List all Cloud Run services
  echo ""
  info "All Cloud Run services in ${REGION}:"
  gcloud run services list --region="$REGION" --format='table(name,status.url,status.latestCreatedRevisionName)' 2>/dev/null || true

  echo ""
  success "Step 9 complete: Deployment verified ($(elapsed))"
fi

# =============================================================================
# STEP 10: Custom Domain Mapping (Optional)
# =============================================================================
if should_run_step 10; then
  step_header 10 "Custom Domain Mapping (Cloudflare)"

  echo ""
  info "═══════════════════════════════════════════════════════════════"
  info "  CUSTOM DOMAIN SETUP (via Cloudflare DNS)"
  info "═══════════════════════════════════════════════════════════════"
  echo ""

  # Get Cloud Run URLs
  BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")
  FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")

  # Extract the hostname from Cloud Run URL for CNAME target
  BACKEND_HOST=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')
  FRONTEND_HOST=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')

  echo -e "  ${BOLD}Cloudflare DNS Records to Add:${NC}"
  echo ""
  echo -e "  ${CYAN}Frontend:${NC}"
  echo "    Type:   CNAME"
  echo "    Name:   sheilaon7"
  echo "    Target: ${FRONTEND_HOST}"
  echo "    Proxy:  Proxied (orange cloud)"
  echo ""
  echo -e "  ${CYAN}Backend:${NC}"
  echo "    Type:   CNAME"
  echo "    Name:   api.sheilaon7"
  echo "    Target: ${BACKEND_HOST}"
  echo "    Proxy:  Proxied (orange cloud)"
  echo ""
  echo -e "  ${CYAN}Cloudflare SSL Settings:${NC}"
  echo "    Mode:   Full (Strict)"
  echo ""
  echo -e "  ${CYAN}After DNS is configured, map domains in Cloud Run:${NC}"
  echo ""
  echo "    # Backend domain mapping:"
  echo "    gcloud run domain-mappings create \\"
  echo "      --service=${BACKEND_SERVICE} \\"
  echo "      --domain=${BACKEND_DOMAIN} \\"
  echo "      --region=${REGION}"
  echo ""
  echo "    # Frontend domain mapping:"
  echo "    gcloud run domain-mappings create \\"
  echo "      --service=${FRONTEND_SERVICE} \\"
  echo "      --domain=${FRONTEND_DOMAIN} \\"
  echo "      --region=${REGION}"
  echo ""
  echo -e "  ${YELLOW}⚠ Note: Cloud Run domain mapping requires verifying domain ownership${NC}"
  echo -e "  ${YELLOW}  in Google Search Console first. Add a TXT record to Cloudflare DNS.${NC}"
  echo ""
  echo -e "  ${YELLOW}⚠ Alternative: Use Cloudflare Workers/Tunnel instead of CNAME${NC}"
  echo -e "  ${YELLOW}  This avoids Cloud Run domain mapping limitations.${NC}"
  echo ""

  success "Step 10 complete: Custom domain instructions provided"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "N/A")
FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
  --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "N/A")

echo -e "  ${BOLD}Backend:${NC}  ${BACKEND_URL}"
echo -e "  ${BOLD}Frontend:${NC} ${FRONTEND_URL}"
echo ""
echo -e "  ${BOLD}Next Steps:${NC}"
echo "  1. Set up Cloudflare DNS (see Step 10 instructions above)"
echo "  2. Rebuild frontend with production backend URL if using custom domain"
echo "  3. Update DOKU notification URL in DOKU Dashboard"
echo "  4. ⚠️  ROTATE all credentials that were shared in chat!"
echo "  5. Test the full flow: Login → Browse → Order → Pay → Check Ticket"
echo ""
echo -e "  Total time: $(elapsed)"
echo ""
