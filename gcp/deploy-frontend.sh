#!/bin/bash
# =============================================================
#  EVENTKU — Deploy Next.js Frontend to Cloud Run
#  Usage:   ./gcp/deploy-frontend.sh <PROJECT_ID> [REGION] <BACKEND_URL>
#  Example: ./gcp/deploy-frontend.sh eventku-494416 asia-southeast1 \
#             https://eventku-api-xxxxx-xx.a.run.app
# =============================================================

set -euo pipefail

PROJECT_ID=${1:?Error: PROJECT_ID required. Usage: ./deploy-frontend.sh <PROJECT_ID> [REGION] <BACKEND_URL>}
REGION=${2:-asia-southeast2}
BACKEND_URL=${3:?Error: BACKEND_URL required. Usage: ./deploy-frontend.sh <PROJECT_ID> [REGION] <BACKEND_URL>}

echo "================================================"
echo "  EVENTKU — Deploying Frontend Web"
echo "  Project:    $PROJECT_ID"
echo "  Region:     $REGION"
echo "  Backend:    $BACKEND_URL"
echo "================================================"

# Verify we're in the project root
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from project root."
  exit 1
fi

if [ ! -f "Dockerfile.frontend" ]; then
  echo "❌ Error: Dockerfile.frontend not found."
  exit 1
fi

# Build and deploy using Cloud Build
echo ""
echo "▸ Submitting build to Cloud Build..."
gcloud builds submit --config gcp/cloudbuild-frontend.yaml \
  --substitutions="_REGION=$REGION,_BACKEND_URL=$BACKEND_URL" \
  --project="$PROJECT_ID"

echo ""
echo "================================================"
echo "  ✅  Frontend deployed to Cloud Run!"
echo "================================================"
echo ""
echo "  Service URL: https://$(gcloud run services describe eventku-web \
    --region="$REGION" --format='value(status.url)' --project="$PROJECT_ID" 2>/dev/null || echo '<check Cloud Console>')"
echo ""
echo "  To view logs:"
echo "    gcloud run services logs read eventku-web --region=$REGION"
echo "================================================"
