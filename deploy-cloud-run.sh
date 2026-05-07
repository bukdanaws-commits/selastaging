#!/bin/bash
# =============================================================================
#  DEPLOY EVENTKU-WEB TO GOOGLE CLOUD RUN
#  Run this script from Google Cloud Shell
#
#  Prerequisites:
#    - gcloud CLI authenticated
#    - Project: eventku-494416
#    - Region: asia-southeast2
# =============================================================================

set -e

PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
SERVICE_NAME="eventku-web"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "============================================"
echo "  🚀 DEPLOYING ${SERVICE_NAME} TO CLOUD RUN"
echo "============================================"
echo ""

# ── Step 1: Set project ──────────────────────────────────────────────────────
echo "📦 Step 1: Setting GCP project..."
gcloud config set project ${PROJECT_ID}

# ── Step 2: Build & push Docker image ────────────────────────────────────────
echo ""
echo "🔨 Step 2: Building Docker image with Cloud Build..."
echo "   This may take 5-10 minutes..."
echo ""
echo "   ⚠️  KEY: NEXT_PUBLIC_USE_MOCK=false is set in Dockerfile"
echo "   ⚠️  KEY: NEXT_PUBLIC_API_URL points to Cloud Run backend"
echo "   ⚠️  KEY: NEXT_PUBLIC_GOOGLE_CLIENT_ID is set"
echo ""
gcloud builds submit \
  --tag ${IMAGE_NAME} \
  --project ${PROJECT_ID} \
  --timeout=1200 \
  .

echo ""
echo "✅ Image built & pushed: ${IMAGE_NAME}"

# ── Step 3: Deploy to Cloud Run ──────────────────────────────────────────────
echo ""
echo "🚀 Step 3: Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

echo ""
echo "============================================"
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "🌐 Frontend URL:"
echo "   https://sheilaon7.eventku.co.id"
echo ""
echo "🔧 Cloud Run URL:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format="value(status.url)"
echo ""
echo "📋 Checklist setelah deploy:"
echo "   1. Cek apakah data tiket real (bukan mock)"
echo "   2. Cek apakah Google Login bisa jalan"
echo "   3. Pastikan backend API CORS mengizinkan frontend URL"
echo ""
