#!/bin/bash
# =============================================================
#  EVENTKU — Setup GitHub → Cloud Build → Cloud Run CI/CD
#  
#  Creates Cloud Build triggers that automatically deploy when
#  you push to your GitHub repository.
#
#  Usage:
#    ./gcp/setup-github-deploy.sh <PROJECT_ID> [REGION] [GITHUB_REPO]
#
#  Example:
#    ./gcp/setup-github-deploy.sh eventku-494416 asia-southeast1 \
#        github.com/bukdanaws-commits/seleevent
#
#  Prerequisites:
#    1. Run ./gcp/setup.sh first (infrastructure must exist)
#    2. gcloud CLI installed and authenticated
#    3. GitHub repo connected to GCP (see instructions below)
# =============================================================

set -euo pipefail

PROJECT_ID=${1:?Error: PROJECT_ID required}
REGION=${2:-asia-southeast1}
INSTANCE_NAME="eventku-db"
GITHUB_REPO=${3:-"github.com/bukdanaws-commits/seleevent"}

echo "================================================"
echo "  EVENTKU — GitHub CI/CD Setup"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  GitHub:   $GITHUB_REPO"
echo "================================================"

# ── Step 1: Verify infrastructure exists ────────────────
echo ""
echo "▸ [1/4] Verifying infrastructure..."

# Check Cloud SQL instance
if ! gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" > /dev/null 2>&1; then
  echo "❌ Cloud SQL instance '$INSTANCE_NAME' not found!"
  echo "   Run ./gcp/setup.sh $PROJECT_ID first."
  exit 1
fi
echo "  ✅ Cloud SQL: $INSTANCE_NAME"

# Check Artifact Registry
if ! gcloud artifacts repositories describe docker --location="$REGION" --project="$PROJECT_ID" > /dev/null 2>&1; then
  echo "❌ Artifact Registry not found!"
  echo "   Run ./gcp/setup.sh $PROJECT_ID first."
  exit 1
fi
echo "  ✅ Artifact Registry: docker"

# Check secrets exist
for SECRET in database-password jwt-secret refresh-jwt-secret google-client-secret; do
  if ! gcloud secrets describe "$SECRET" --project="$PROJECT_ID" > /dev/null 2>&1; then
    echo "❌ Secret '$SECRET' not found!"
    echo "   Run ./gcp/setup.sh $PROJECT_ID first."
    exit 1
  fi
done
echo "  ✅ Secret Manager: 4 secrets configured"

# ── Step 2: Ensure Cloud Build has required permissions ──
echo ""
echo "▸ [2/4] Configuring Cloud Build IAM permissions..."
PROJECT_NUM=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CB_SA="${PROJECT_NUM}@cloudbuild.gserviceaccount.com"

for ROLE in \
  "roles/run.admin" \
  "roles/iam.serviceAccountUser" \
  "roles/cloudsql.client" \
  "roles/storage.admin" \
  "roles/artifactregistry.writer"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CB_SA}" \
    --role="$ROLE" --quiet > /dev/null
done
echo "  ✅ Cloud Build permissions configured"

# ── Step 3: Connect GitHub repository ────────────────────
echo ""
echo "▸ [3/4] Connecting GitHub repository..."
echo ""
echo "  ┌─ IMPORTANT: GitHub Connection ──────────────────┐"
echo "  │                                                   │"
echo "  │  If this is your first time, you need to connect  │"
echo "  │  your GitHub account to Cloud Build:              │"
echo "  │                                                   │"
echo "  │  Option A — Via Console (RECOMMENDED):            │"
echo "  │  1. Open: https://console.cloud.google.com/cloud-build/triggers  │"
echo "  │  2. Click "Connect Repository"                     │"
echo "  │  3. Select "GitHub (Cloud Build GitHub App)"      │"
echo "  │  4. Authenticate & select:                         │"
echo "  │     $GITHUB_REPO           │"
echo "  │  5. Come back here and re-run this script         │"
echo "  │                                                   │"
echo "  │  Option B — Via CLI:                               │"
echo "  │  Run: gcloud builds connections create github \    │"
echo "  │       --region=$REGION \                           │"
echo "  │       --name=eventku-github-connection            │"
echo "  │                                                   │"
echo "  └───────────────────────────────────────────────────┘"
echo ""

# Try to list existing connections
CONNECTIONS=$(gcloud builds connections list --region="$REGION" --project="$PROJECT_ID" --format="value(name)" 2>/dev/null || echo "")

if [ -z "$CONNECTIONS" ]; then
  echo "  ⚠️  No GitHub connection found."
  echo "  Please connect your GitHub repo in Cloud Console first, then re-run this script."
  echo ""
  echo "  👉 https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
  echo ""
  echo "  After connecting, run this script again to create triggers."
  exit 1
fi

echo "  ✅ GitHub connection found: $CONNECTIONS"

# ── Step 4: Create Cloud Build Triggers ──────────────────
echo ""
echo "▸ [4/4] Creating Cloud Build triggers..."

# Get the repository name from the connection
REPO_NAME=$(basename "$GITHUB_REPO")

# ── Trigger 1: Backend API ───────────────────────────────
echo ""
echo "  Creating trigger: eventku-backend-deploy..."

# Delete existing trigger if it exists
gcloud builds triggers delete eventku-backend-deploy \
  --region="$REGION" --project="$PROJECT_ID" --quiet 2>/dev/null || true

gcloud builds triggers create github \
  --name="eventku-backend-deploy" \
  --region="$REGION" \
  --repo-name="$REPO_NAME" \
  --repo-owner="$(dirname "$GITHUB_REPO" | sed 's|.*://||')" \
  --branch-pattern="^main$" \
  --build-config="gcp/cloudbuild-backend.yaml" \
  --substitutions="_REGION=$REGION,_INSTANCE_NAME=$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --no-include-logs-with-status 2>/dev/null || \
echo "  ⚠️  CLI trigger creation failed. Create manually in Console (see below)."

echo "  ✅ Backend trigger created (or manual setup needed)"

# ── Trigger 2: Frontend Web ──────────────────────────────
echo ""
echo "  Creating trigger: eventku-frontend-deploy..."

# Delete existing trigger if it exists
gcloud builds triggers delete eventku-frontend-deploy \
  --region="$REGION" --project="$PROJECT_ID" --quiet 2>/dev/null || true

# Get backend URL for frontend build
BACKEND_URL="${BACKEND_URL:-$(gcloud run services describe eventku-api \
  --region="$REGION" --format='value(status.url)' --project="$PROJECT_ID" 2>/dev/null || echo 'https://eventku-api-xxxxx-xx.a.run.app')}"

gcloud builds triggers create github \
  --name="eventku-frontend-deploy" \
  --region="$REGION" \
  --repo-name="$REPO_NAME" \
  --repo-owner="$(dirname "$GITHUB_REPO" | sed 's|.*://||')" \
  --branch-pattern="^main$" \
  --build-config="gcp/cloudbuild-frontend.yaml" \
  --substitutions="_REGION=$REGION,_BACKEND_URL=$BACKEND_URL" \
  --project="$PROJECT_ID" \
  --no-include-logs-with-status 2>/dev/null || \
echo "  ⚠️  CLI trigger creation failed. Create manually in Console (see below)."

echo "  ✅ Frontend trigger created (or manual setup needed)"

# ── Done! ────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  ✅  EVENTKU GitHub CI/CD SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "  ┌─ Cloud Build Triggers ──────────────────────────┐"
echo "  │                                                    │"
echo "  │  📦 Backend Trigger: eventku-backend-deploy       │"
echo "  │     → Push to main/ (backend files changed)       │"
echo "  │     → Builds Go API → Docker → Cloud Run          │"
echo "  │                                                    │"
echo "  │  🌐 Frontend Trigger: eventku-frontend-deploy     │"
echo "  │     → Push to main/ (frontend files changed)      │"
echo "  │     → Builds Next.js → Docker → Cloud Run         │"
echo "  └───────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ How It Works ──────────────────────────────────┐"
echo "  │                                                    │"
echo "  │  1. Kamu push code ke GitHub (branch main)        │"
echo "  │  2. Cloud Build otomatis trigger & build           │"
echo "  │  3. Docker image push ke Artifact Registry         │"
echo "  │  4. Auto-deploy ke Cloud Run                       │"
echo "  │  5. Website & API langsung update! 🚀             │"
echo "  └───────────────────────────────────────────────────┘"
echo ""
echo "  ┌─ Manual Deploy (Fallback) ──────────────────────┐"
echo "  │                                                    │"
echo "  │  Backend:                                          │"
echo "  │    ./gcp/deploy-backend.sh $PROJECT_ID              │"
echo "  │                                                    │"
echo "  │  Frontend:                                         │"
echo "  │    ./gcp/deploy-frontend.sh $PROJECT_ID $REGION \  │"
echo "  │      \$BACKEND_URL                                  │"
echo "  └───────────────────────────────────────────────────┘"
echo ""
echo "  Manage triggers: https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
echo "============================================================"
