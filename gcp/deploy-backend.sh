#!/bin/bash
# =============================================================
#  EVENTKU — Deploy Golang API to Cloud Run
#  Usage:   ./gcp/deploy-backend.sh <PROJECT_ID> [REGION]
#  Example: ./gcp/deploy-backend.sh eventku-494416 asia-southeast1
# =============================================================

set -euo pipefail

PROJECT_ID=${1:?Error: PROJECT_ID required. Usage: ./deploy-backend.sh <PROJECT_ID> [REGION]}
REGION=${2:-asia-southeast2}
INSTANCE_NAME="eventku"

echo "================================================"
echo "  EVENTKU — Deploying Backend API"
echo "  Project: $PROJECT_ID"
echo "  Region:  $REGION"
echo "================================================"

# Verify we're in the project root
if [ ! -f "backend/Dockerfile" ]; then
  echo "❌ Error: backend/Dockerfile not found. Run from project root."
  exit 1
fi

# Build and deploy using Cloud Build
echo ""
echo "▸ Submitting build to Cloud Build..."
gcloud builds submit --config gcp/cloudbuild-backend.yaml \
  --substitutions="_REGION=$REGION,_INSTANCE_NAME=$INSTANCE_NAME" \
  --project="$PROJECT_ID"

echo ""
echo "================================================"
echo "  ✅  Backend deployed to Cloud Run!"
echo "================================================"
echo ""
echo "  Service URL: https://$(gcloud run services describe eventku-api \
    --region="$REGION" --format='value(status.url)' --project="$PROJECT_ID" 2>/dev/null || echo '<check Cloud Console>')"
echo ""
echo "  To view logs:"
echo "    gcloud run services logs read eventku-api --region=$REGION"
echo "================================================"
