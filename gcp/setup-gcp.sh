#!/bin/bash
# =============================================================================
#  SELEVENT — GCP Setup Automation Script
#
#  Usage:
#    chmod +x gcp/setup-gcp.sh
#    ./gcp/setup-gcp.sh [OPTIONS]
#
#  Options:
#    --project-id=selevent-prod    GCP Project ID (default: selevent-prod)
#    --region=asia-southeast2      GCP Region (default: asia-southeast2)
#    --db-tier=db-custom-4-16384   Cloud SQL tier (default: db-custom-4-16384)
#    --db-password=xxx             Database password (REQUIRED)
#    --doku-env=sandbox            DOKU environment: sandbox|production
#    --skip-sql                    Skip Cloud SQL setup
#    --skip-storage                Skip Cloud Storage setup
#    --skip-redis                  Skip Redis setup (default: skip)
#    --dry-run                     Show commands without executing
#
#  Examples:
#    ./gcp/setup-gcp.sh --db-password=S3cur3P@ss --doku-env=sandbox
#    ./gcp/setup-gcp.sh --project-id=myproject --dry-run
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Defaults ──────────────────────────────────────────────────────────────────
PROJECT_ID="selevent-prod"
REGION="asia-southeast2"
DB_TIER="db-custom-4-16384"
DB_PASSWORD=""
DOKU_ENV="sandbox"
SKIP_SQL=false
SKIP_STORAGE=false
SKIP_REDIS=true
SKIP_BUILD=false
DRY_RUN=false
BRANCH="doku"

# ── Parse Arguments ───────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --project-id=*)    PROJECT_ID="${arg#*=}" ;;
    --region=*)        REGION="${arg#*=}" ;;
    --db-tier=*)       DB_TIER="${arg#*=}" ;;
    --db-password=*)   DB_PASSWORD="${arg#*=}" ;;
    --doku-env=*)      DOKU_ENV="${arg#*=}" ;;
    --skip-sql)        SKIP_SQL=true ;;
    --skip-storage)    SKIP_STORAGE=true ;;
    --skip-redis)      SKIP_REDIS=true ;;
    --skip-build)      SKIP_BUILD=true ;;
    --dry-run)         DRY_RUN=true ;;
    --branch=*)        BRANCH="${arg#*=}" ;;
    --help|-h)
      head -20 "$0" | grep "^#" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      exit 1
      ;;
  esac
done

# ── Helper Functions ──────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
step()    { echo -e "\n${CYAN}━━━ STEP $1: $2 ━━━${NC}"; }

run_cmd() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $*"
  else
    info "Running: $*"
    eval "$@"
    success "Done: $*"
  fi
}

confirm() {
  if [ "$DRY_RUN" = true ]; then return 0; fi
  echo -e "${YELLOW}$1${NC}"
  read -p "Continue? (y/n): " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]]
}

# ── Pre-flight Checks ─────────────────────────────────────────────────────────
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         SELEVENT — GCP Setup Automation                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Configuration:"
echo "  Project ID:    $PROJECT_ID"
echo "  Region:        $REGION"
echo "  DB Tier:       $DB_TIER"
echo "  DOKU Env:      $DOKU_ENV"
echo "  Branch:        $BRANCH"
echo "  Dry Run:       $DRY_RUN"
echo ""

if [ "$DB_PASSWORD" = "" ] && [ "$SKIP_SQL" = false ]; then
  error "Database password is required! Use --db-password=YOUR_PASSWORD"
  echo ""
  echo "Usage: $0 --db-password=S3cur3P@ss --doku-env=sandbox"
  exit 1
fi

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
  error "gcloud CLI not found! Install from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
  error "Docker not found! Install from: https://docs.docker.com/get-docker/"
  exit 1
fi

echo -e "${GREEN}Pre-flight checks passed!${NC}\n"

# =============================================================================
# STEP 1: Setup Project
# =============================================================================
step 1 "Setup Google Cloud Project"

confirm "This will create/configure project: $PROJECT_ID"

run_cmd "gcloud auth login --quiet 2>/dev/null || true"
run_cmd "gcloud config set project $PROJECT_ID"
run_cmd "gcloud config set compute/region $REGION"
run_cmd "gcloud config set compute/zone ${REGION}-a"

# Check if project exists, create if not
PROJECT_EXISTS=$(gcloud projects describe $PROJECT_ID --format='value(projectId)' 2>/dev/null || echo "")
if [ "$PROJECT_EXISTS" = "" ]; then
  warn "Project '$PROJECT_ID' not found. Creating..."
  run_cmd "gcloud projects create $PROJECT_ID --name='Selevent Production'"
  warn "IMPORTANT: Enable billing at https://console.cloud.google.com/billing"
  warn "Then re-run this script."
  exit 0
fi

success "Project '$PROJECT_ID' is ready"

# =============================================================================
# STEP 2: Enable APIs
# =============================================================================
step 2 "Enable Required GCP APIs"

APIS=(
  "run.googleapis.com"
  "sqladmin.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "secretmanager.googleapis.com"
  "storage.googleapis.com"
  "vpcaccess.googleapis.com"
  "iam.googleapis.com"
  "servicenetworking.googleapis.com"
  "compute.googleapis.com"
  "dns.googleapis.com"
)

for api in "${APIS[@]}"; do
  run_cmd "gcloud services enable $api --quiet"
done

success "All APIs enabled"

# =============================================================================
# STEP 3: Setup VPC & Networking
# =============================================================================
step 3 "Setup VPC Networking"

# Create VPC
run_cmd "gcloud compute networks create selevent-vpc --subnet-mode=custom --quiet 2>/dev/null || echo 'VPC already exists'"

# Create VPC Connector for Cloud Run
run_cmd "gcloud compute networks vpc-access connectors create selevent-connector \
  --region=$REGION \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10 \
  --quiet 2>/dev/null || echo 'Connector already exists'"

# Setup VPC Peering for Cloud SQL
run_cmd "gcloud compute addresses create google-managed-services \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=selevent-vpc \
  --quiet 2>/dev/null || echo 'Address already exists'"

run_cmd "gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services \
  --network=selevent-vpc \
  --quiet 2>/dev/null || echo 'Peering already exists'"

success "VPC networking ready"

# =============================================================================
# STEP 4: Setup Cloud SQL (PostgreSQL)
# =============================================================================
if [ "$SKIP_SQL" = false ]; then
  step 4 "Setup Cloud SQL PostgreSQL"

  confirm "Create Cloud SQL instance (4 vCPU, 16GB RAM, HA)? ~$150-200/month"

  # Create instance
  run_cmd "gcloud sql instances create selevent-db \
    --database-version=POSTGRES_16 \
    --tier=$DB_TIER \
    --region=$REGION \
    --availability-type=regional \
    --storage-type=SSD \
    --storage-size=20GB \
    --storage-auto-increase \
    --backup-start-time=02:00 \
    --enable-point-in-time-recovery \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=03 \
    --database-flags=max_connections=200 \
    --network=selevent-vpc \
    --no-assign-ip \
    --quiet 2>/dev/null || echo 'Instance already exists'"

  # Wait for instance to be ready
  info "Waiting for Cloud SQL instance to be ready..."
  gcloud sql instances wait selevent-db --timeout=600 --region=$REGION 2>/dev/null || true

  # Create database
  run_cmd "gcloud sql databases create eventku --instance=selevent-db --quiet 2>/dev/null || echo 'Database already exists'"

  # Create user
  run_cmd "gcloud sql users create eventku \
    --instance=selevent-db \
    --password='$DB_PASSWORD' \
    --quiet 2>/dev/null || echo 'User already exists'"

  success "Cloud SQL ready: $PROJECT_ID:$REGION:selevent-db"
else
  warn "Skipping Cloud SQL setup"
fi

# =============================================================================
# STEP 5: Setup Cloud Storage
# =============================================================================
if [ "$SKIP_STORAGE" = false ]; then
  step 5 "Setup Cloud Storage (GCS)"

  BUCKETS=(
    "selevent-assets:public"
    "selevent-qrcodes:public"
    "selevent-withdrawal-proof:private"
    "selevent-avatars:public"
  )

  for bucket_info in "${BUCKETS[@]}"; do
    BUCKET="${bucket_info%%:*}"
    ACCESS="${bucket_info##*:}"

    run_cmd "gsutil mb -l $REGION gs://$BUCKET 2>/dev/null || echo 'Bucket already exists'"

    if [ "$ACCESS" = "public" ]; then
      run_cmd "gsutil iam ch allUsers:objectViewer gs://$BUCKET"
    fi
  done

  # Set CORS
  cat > /tmp/selevent-cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Cache-Control"],
    "maxAgeSeconds": 3600
  }
]
EOF
  run_cmd "gsutil cors set /tmp/selevent-cors.json gs://selevent-assets"
  run_cmd "gsutil cors set /tmp/selevent-cors.json gs://selevent-qrcodes"
  run_cmd "rm -f /tmp/selevent-cors.json"

  # QR Code lifecycle (auto-delete after 90 days)
  cat > /tmp/qr-lifecycle.json << 'EOF'
{"lifecycle":{"rule":[{"action":{"type":"Delete"},"condition":{"age":90}}]}}
EOF
  run_cmd "gsutil lifecycle set /tmp/qr-lifecycle.json gs://selevent-qrcodes"
  run_cmd "rm -f /tmp/qr-lifecycle.json"

  success "All GCS buckets created"
else
  warn "Skipping Cloud Storage setup"
fi

# =============================================================================
# STEP 6: Setup Secret Manager
# =============================================================================
step 6 "Setup Secret Manager"

SECRETS=(
  "database-password:$DB_PASSWORD"
  "jwt-secret:$(openssl rand -base64 32 2>/dev/null || echo 'change-me-jwt-secret-32chars')"
  "refresh-jwt-secret:$(openssl rand -base64 32 2>/dev/null || echo 'change-me-refresh-secret-32chars')"
)

for secret_info in "${SECRETS[@]}"; do
  SECRET_NAME="${secret_info%%:*}"
  SECRET_VALUE="${secret_info##*:}"

  if [ "$SECRET_VALUE" = "" ]; then
    warn "Skipping empty secret: $SECRET_NAME"
    continue
  fi

  echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" --data-file=- --quiet 2>/dev/null || \
    echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --quiet

  success "Secret '$SECRET_NAME' saved"
done

# Prompts for additional secrets
if [ "$DRY_RUN" = false ]; then
  echo ""
  info "Now configure DOKU secrets (press Enter to skip):"
  echo ""

  read -p "  DOKU Client Secret (or Enter to skip): " DOKU_SECRET
  if [ -n "$DOKU_SECRET" ]; then
    echo -n "$DOKU_SECRET" | gcloud secrets create doku-client-secret --data-file=- --quiet 2>/dev/null || \
      echo -n "$DOKU_SECRET" | gcloud secrets versions add doku-client-secret --data-file=- --quiet
  fi

  read -p "  DOKU Shared Key (or Enter to skip): " DOKU_SHARED
  if [ -n "$DOKU_SHARED" ]; then
    echo -n "$DOKU_SHARED" | gcloud secrets create doku-shared-key --data-file=- --quiet 2>/dev/null || \
      echo -n "$DOKU_SHARED" | gcloud secrets versions add doku-shared-key --data-file=- --quiet
  fi

  # DOKU RSA Private Key
  if [ -f "keys/doku-private.pem" ]; then
    cat keys/doku-private.pem | gcloud secrets create doku-private-key --data-file=- --quiet 2>/dev/null || \
      cat keys/doku-private.pem | gcloud secrets versions add doku-private-key --data-file=- --quiet
    success "DOKU RSA private key imported from keys/doku-private.pem"
  else
    warn "keys/doku-private.pem not found — run: openssl genrsa -out keys/doku-private.pem 2048"
  fi

  read -p "  Google OAuth Client Secret (or Enter to skip): " GOOGLE_SECRET
  if [ -n "$GOOGLE_SECRET" ]; then
    echo -n "$GOOGLE_SECRET" | gcloud secrets create google-client-secret --data-file=- --quiet 2>/dev/null || \
      echo -n "$GOOGLE_SECRET" | gcloud secrets versions add google-client-secret --data-file=- --quiet
  fi
fi

success "All secrets configured"

# =============================================================================
# STEP 7: Setup Artifact Registry
# =============================================================================
step 7 "Setup Artifact Registry"

run_cmd "gcloud artifacts repositories create eventku \
  --repository-format=docker \
  --location=$REGION \
  --description='Selevent Docker Images' \
  --quiet 2>/dev/null || echo 'Repository already exists'"

run_cmd "gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet"

success "Artifact Registry ready: ${REGION}-docker.pkg.dev/$PROJECT_ID/eventku"

# =============================================================================
# STEP 8: Setup IAM Service Account
# =============================================================================
step 8 "Setup IAM Service Account"

run_cmd "gcloud iam service-accounts create selevent-sa \
  --display-name='Selevent Cloud Run Service Account' \
  --quiet 2>/dev/null || echo 'SA already exists'"

SA_EMAIL="selevent-sa@$PROJECT_ID.iam.gserviceaccount.com"

ROLES=(
  "roles/cloudsql.client"
  "roles/secretmanager.secretAccessor"
  "roles/storage.objectAdmin"
  "roles/run.invoker"
  "roles/logging.logWriter"
  "roles/monitoring.metricWriter"
)

for role in "${ROLES[@]}"; do
  run_cmd "gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member='serviceAccount:$SA_EMAIL' \
    --role='$role' \
    --quiet 2>/dev/null"
done

success "Service Account '$SA_EMAIL' configured with 6 roles"

# =============================================================================
# STEP 9: Build & Deploy (Optional)
# =============================================================================
if [ "$SKIP_BUILD" = false ]; then
  step 9 "Build & Deploy Docker Images"

  confirm "Build and deploy to Cloud Run?"

  TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
  AR_PATH="${REGION}-docker.pkg.dev/$PROJECT_ID/eventku"

  # Ask for DOKU Client ID
  if [ "$DRY_RUN" = false ]; then
    read -p "  DOKU Client ID (MCH-xxx): " DOKU_CLIENT_ID
    read -p "  Google OAuth Client ID: " GOOGLE_CLIENT_ID
    read -p "  Backend API URL (or Enter to skip backend): " BACKEND_URL
  fi

  # ── Build Frontend ───────────────────────────────────────────────────────
  info "Building frontend Docker image..."

  run_cmd "docker build \
    -f Dockerfile.frontend \
    -t $AR_PATH/selevent-web:$TAG \
    -t $AR_PATH/selevent-web:latest \
    --build-arg=NEXT_PUBLIC_API_URL=${BACKEND_URL:-https://api.selamockc.com} \
    --build-arg=NEXT_PUBLIC_USE_MOCK=false \
    --build-arg=NEXT_PUBLIC_DOKU_ENVIRONMENT=$DOKU_ENV \
    --build-arg=NEXT_PUBLIC_DOKU_CLIENT_ID=${DOKU_CLIENT_ID:-} \
    --build-arg=NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-} \
    ."

  run_cmd "docker push $AR_PATH/selevent-web:$TAG"
  run_cmd "docker push $AR_PATH/selevent-web:latest"

  # ── Deploy Frontend ──────────────────────────────────────────────────────
  info "Deploying frontend to Cloud Run..."

  run_cmd "gcloud run deploy selevent-web \
    --image=$AR_PATH/selevent-web:$TAG \
    --region=$REGION \
    --platform=managed \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=1 \
    --max-instances=100 \
    --concurrency=80 \
    --timeout=300 \
    --port=3000 \
    --vpc-connector=selevent-connector \
    --set-env-vars='NODE_ENV=production,NEXT_PUBLIC_USE_MOCK=false,NEXT_PUBLIC_DOKU_ENVIRONMENT=$DOKU_ENV' \
    --set-secrets='DOKU_CLIENT_SECRET=doku-client-secret:latest,DOKU_SHARED_KEY=doku-shared-key:latest' \
    --service-account=$SA_EMAIL \
    --allow-unauthenticated \
    --quiet"

  # ── Build Backend ────────────────────────────────────────────────────────
  if [ -d "backend" ]; then
    info "Building backend Docker image..."

    run_cmd "docker build \
      -f backend/Dockerfile \
      -t $AR_PATH/selevent-api:$TAG \
      -t $AR_PATH/selevent-api:latest \
      --build-arg=VERSION=$TAG \
      ."

    run_cmd "docker push $AR_PATH/selevent-api:$TAG"
    run_cmd "docker push $AR_PATH/selevent-api:latest"

    # ── Deploy Backend ────────────────────────────────────────────────────
    info "Deploying backend to Cloud Run..."

    if [ "$SKIP_SQL" = false ]; then
      CLOUDSQL_FLAG="--add-cloudsql-instances=$PROJECT_ID:$REGION:selevent-db \
        --set-env-vars='APP_ENV=production,DB_DRIVER=postgres,DB_HOST=/cloudsql/$PROJECT_ID:$REGION:selevent-db,DB_NAME=eventku,DB_USER=eventku,DB_PORT=5432,DB_SSLMODE=require' \
        --set-secrets='DB_PASSWORD=database-password:latest,JWT_SECRET=jwt-secret:latest,REFRESH_JWT_SECRET=refresh-jwt-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest'"
    else
      CLOUDSQL_FLAG=""
    fi

    run_cmd "gcloud run deploy selevent-api \
      --image=$AR_PATH/selevent-api:$TAG \
      --region=$REGION \
      --platform=managed \
      --cpu=2 \
      --memory=1Gi \
      --min-instances=0 \
      --max-instances=10 \
      --concurrency=200 \
      --timeout=30 \
      --port=8080 \
      --no-cpu-throttling \
      --vpc-connector=selevent-connector \
      $CLOUDSQL_FLAG \
      --service-account=$SA_EMAIL \
      --allow-unauthenticated \
      --quiet"
  fi

  success "Deployment complete!"
else
  warn "Skipping build & deploy (use --skip-build=false to enable)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗"
echo "║         SELEVENT — GCP Setup Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Resources Created:"
echo "  Project:       $PROJECT_ID"
echo "  Region:        $REGION"
echo "  VPC:           selevent-vpc"
echo "  Connector:     selevent-connector"

if [ "$SKIP_SQL" = false ]; then
echo "  Cloud SQL:     $PROJECT_ID:$REGION:selevent-db (PostgreSQL 16)"
echo "  Database:      eventku"
echo "  User:          eventku"
fi

if [ "$SKIP_STORAGE" = false ]; then
echo "  GCS Buckets:   selevent-assets, selevent-qrcodes, selevent-avatars, selevent-withdrawal-proof"
fi

echo "  Artifact Reg:  ${REGION}-docker.pkg.dev/$PROJECT_ID/eventku"
echo "  Service Acct:  selevent-sa@$PROJECT_ID.iam.gserviceaccount.com"
echo "  Secrets:       $(gcloud secrets list --format='value(name)' 2>/dev/null | tr '\n' ', ')"
echo ""

if [ "$SKIP_BUILD" = false ]; then
echo "Service URLs:"
echo "  Frontend: $(gcloud run services describe selevent-web --region=$REGION --format='value(status.url)' 2>/dev/null || echo 'Not deployed')"
echo "  Backend:  $(gcloud run services describe selevent-api --region=$REGION --format='value(status.url)' 2>/dev/null || echo 'Not deployed')"
echo ""
fi

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure custom domain (see DEPLOYMENT-GCP.md Step 10)"
echo "  2. Update DOKU Dashboard with webhook URL"
echo "  3. Run database migrations (Step 12)"
echo "  4. Test payment flow end-to-end"
echo "  5. Setup monitoring & alerting (Step 13)"
echo ""
echo -e "${CYAN}Full documentation: DEPLOYMENT-GCP.md${NC}"
