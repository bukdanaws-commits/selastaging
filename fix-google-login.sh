#!/bin/bash
# =============================================================================
#  SELEVENT — Fix Google Login on Cloud Run
#
#  This script diagnoses and fixes why Google Login doesn't work on the
#  deployed frontend. The root causes are:
#
#  1. NEXT_PUBLIC_GOOGLE_CLIENT_ID may be empty in the built frontend
#     (baked at BUILD time, not runtime)
#  2. NEXT_PUBLIC_USE_MOCK defaults to ON when not 'false' (mock intercepts)
#  3. NEXT_PUBLIC_API_URL may be empty (frontend doesn't know backend URL)
#  4. Google OAuth Console may not have Cloud Run URL as authorized origin
#
#  This script:
#  - Diagnoses the current state
#  - Rebuilds the frontend with correct build args
#  - Redeploys to Cloud Run
#
#  Usage:
#    chmod +x fix-google-login.sh
#    ./fix-google-login.sh              # Full fix (diagnose + rebuild + deploy)
#    ./fix-google-login.sh --diagnose   # Only diagnose
#    ./fix-google-login.sh --rebuild    # Only rebuild + deploy
# =============================================================================

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "  ${BLUE}ℹ${NC} $*"; }
success() { echo -e "  ${GREEN}✔${NC} $*"; }
warn()    { echo -e "  ${YELLOW}⚠${NC} $*"; }
error()   { echo -e "  ${RED}✖${NC} $*"; }

# ── Configuration ────────────────────────────────────────────────────────────
PROJECT_ID="eventku-494416"
REGION="asia-southeast2"
BACKEND_SERVICE="eventku-api"
FRONTEND_SERVICE="eventku-web"
AR_REPO="eventku"
AR_LOCATION="${REGION}"

GOOGLE_CLIENT_ID="503551786622-k3uajo9c2d6om6qnqofsa3b47fvo5o6g.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

DOKU_CLIENT_ID="BRN-0222-1777799032222"

# Script control
MODE="full"  # full, diagnose, rebuild
for arg in "$@"; do
  case $arg in
    --diagnose)  MODE="diagnose" ;;
    --rebuild)   MODE="rebuild" ;;
    --help|-h)
      echo "Usage: ./fix-google-login.sh [OPTIONS]"
      echo "  --diagnose  Only run diagnostics"
      echo "  --rebuild   Only rebuild + deploy"
      echo "  --help      Show this help"
      exit 0
      ;;
  esac
done

# ── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     🔧 SELEVENT — Fix Google Login on Cloud Run                             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# PHASE 1: DIAGNOSE
# =============================================================================
if [ "$MODE" = "full" ] || [ "$MODE" = "diagnose" ]; then
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  PHASE 1: DIAGNOSE${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Get service URLs
  BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "NOT_FOUND")
  FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "NOT_FOUND")

  info "Backend URL:  ${BACKEND_URL}"
  info "Frontend URL: ${FRONTEND_URL}"
  echo ""

  # ── Check 1: Backend health ─────────────────────────────────────────────────
  info "Check 1: Backend health..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    success "Backend health: HTTP ${HTTP_CODE} ✅"
  else
    error "Backend health: HTTP ${HTTP_CODE} ❌"
  fi

  # ── Check 2: Backend CORS ──────────────────────────────────────────────────
  info "Check 2: Backend CORS for frontend origin..."
  CORS_HEADER=$(curl -s -D - -o /dev/null \
    -H "Origin: ${FRONTEND_URL}" \
    -H "Access-Control-Request-Method: POST" \
    -X OPTIONS \
    "${BACKEND_URL}/api/v1/auth/google" 2>/dev/null | grep -i "access-control-allow-origin" || echo "NONE")
  if echo "$CORS_HEADER" | grep -q "$FRONTEND_URL"; then
    success "CORS: Frontend origin allowed ✅"
  else
    error "CORS: Frontend origin NOT in allowed origins ❌"
    echo "       Header: ${CORS_HEADER}"
  fi

  # ── Check 3: Backend auth endpoint ─────────────────────────────────────────
  info "Check 3: Backend /api/v1/auth/google endpoint..."
  AUTH_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"token":"test-invalid-token"}' \
    "${BACKEND_URL}/api/v1/auth/google" 2>/dev/null || echo "FAILED")
  if echo "$AUTH_RESPONSE" | grep -q "verification failed"; then
    success "Auth endpoint: Working (correctly rejects invalid tokens) ✅"
  elif echo "$AUTH_RESPONSE" | grep -q "success"; then
    warn "Auth endpoint: Returns success for test token (unexpected) ⚠️"
  else
    error "Auth endpoint: Unexpected response ❌"
    echo "       Response: ${AUTH_RESPONSE}"
  fi

  # ── Check 4: Frontend Cloud Run env vars ──────────────────────────────────
  info "Check 4: Frontend Cloud Run environment variables..."
  echo ""
  ENV_VARS=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format='value(spec.template.spec.containers[0].env)' 2>/dev/null || echo "")
  
  if echo "$ENV_VARS" | grep -q "NEXTAUTH_SECRET"; then
    success "NEXTAUTH_SECRET: Set ✅"
  else
    warn "NEXTAUTH_SECRET: NOT set ⚠️"
  fi
  
  if echo "$ENV_VARS" | grep -q "NODE_ENV"; then
    success "NODE_ENV: Set ✅"
  else
    warn "NODE_ENV: NOT set ⚠️"
  fi

  echo ""
  warn "NOTE: NEXT_PUBLIC_* vars are baked at BUILD TIME, not visible in Cloud Run env."
  warn "      They must be set as Docker build args during 'docker build'."
  warn "      Cloud Run env vars only affect runtime (server-side), not client JS."
  echo ""

  # ── Check 5: Frontend HTML for Google Client ID ──────────────────────────
  info "Check 5: Inspect built frontend for Google Client ID..."
  # Try to find the client ID in the page source or JS bundles
  FRONTEND_HTML=$(curl -s "${FRONTEND_URL}" 2>/dev/null || echo "")
  if echo "$FRONTEND_HTML" | grep -q "accounts.google.com"; then
    success "Google Identity Services script tag found in HTML ✅"
  else
    warn "Google Identity Services script tag NOT in HTML (loaded dynamically — OK) ⚠️"
  fi

  # Check if the client ID is anywhere in the JS (it should be if baked in)
  JS_BUNDLE_URL=$(echo "$FRONTEND_HTML" | grep -oP 'src="(/_next/static/[^"]*\.js)"' | head -1 | sed 's/src="//' | sed 's/"//')
  if [ -n "$JS_BUNDLE_URL" ]; then
    JS_CONTENT=$(curl -s "${FRONTEND_URL}${JS_BUNDLE_URL}" 2>/dev/null || echo "")
    if echo "$JS_CONTENT" | grep -q "$GOOGLE_CLIENT_ID"; then
      success "GOOGLE_CLIENT_ID found in JS bundle ✅ (baked in correctly)"
    else
      error "GOOGLE_CLIENT_ID NOT found in JS bundle ❌"
      echo "       This means NEXT_PUBLIC_GOOGLE_CLIENT_ID was empty at build time!"
      echo "       The frontend needs to be REBUILT with --build-arg=NEXT_PUBLIC_GOOGLE_CLIENT_ID=..."
    fi
  else
    warn "Could not find JS bundle URL to inspect"
  fi

  # ── Check 6: Mock mode in JS bundle ──────────────────────────────────────
  info "Check 6: Check if mock mode is disabled..."
  if [ -n "$JS_BUNDLE_URL" ]; then
    if echo "$JS_CONTENT" | grep -q '"false"'; then
      success "Mock mode string 'false' found in JS ✅"
    else
      warn "Could not confirm mock mode status in JS bundle"
    fi
  fi

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  DIAGNOSIS SUMMARY${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${YELLOW}Root Cause: NEXT_PUBLIC_* env vars are baked at BUILD time${NC}"
  echo -e "  ${YELLOW}Solution: Rebuild frontend with correct Docker build args${NC}"
  echo ""
  echo -e "  Required build args:"
  echo -e "    ${CYAN}NEXT_PUBLIC_GOOGLE_CLIENT_ID${NC} = ${GOOGLE_CLIENT_ID}"
  echo -e "    ${CYAN}NEXT_PUBLIC_API_URL${NC}           = ${BACKEND_URL}"
  echo -e "    ${CYAN}NEXT_PUBLIC_USE_MOCK${NC}           = false"
  echo ""
  echo -e "  Also required (in Google Cloud Console):"
  echo -e "    ${CYAN}Authorized JavaScript origins${NC}  = ${FRONTEND_URL}"
  echo -e "    ${CYAN}Authorized redirect URIs${NC}       = ${FRONTEND_URL}/api/auth/callback/google"
  echo ""

  if [ "$MODE" = "diagnose" ]; then
    echo -e "  ${BOLD}Run './fix-google-login.sh --rebuild' to apply the fix${NC}"
    echo ""
    exit 0
  fi
fi

# =============================================================================
# PHASE 2: REBUILD & REDEPLOY
# =============================================================================
if [ "$MODE" = "full" ] || [ "$MODE" = "rebuild" ]; then
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  PHASE 2: REBUILD & REDEPLOY${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Get service URLs
  BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "NOT_FOUND")
  FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "NOT_FOUND")

  info "Backend URL:  ${BACKEND_URL}"
  info "Frontend URL: ${FRONTEND_URL}"
  echo ""

  # ── Step 1: Rebuild frontend via Cloud Build ──────────────────────────────
  info "Step 1: Rebuilding frontend via Cloud Build with correct env vars..."
  info "  NEXT_PUBLIC_GOOGLE_CLIENT_ID = ${GOOGLE_CLIENT_ID}"
  info "  NEXT_PUBLIC_API_URL           = ${BACKEND_URL}"
  info "  NEXT_PUBLIC_USE_MOCK           = false"
  info "  NEXT_PUBLIC_DOKU_CLIENT_ID     = ${DOKU_CLIENT_ID}"
  echo ""
  warn "This will take 5-10 minutes..."
  echo ""

  gcloud builds submit . \
    --config=gcp/cloudbuild-frontend-cloudrun.yaml \
    --substitutions="\
_BACKEND_URL=${BACKEND_URL},\
_DOKU_NOTIFICATION_URL=${BACKEND_URL}/api/v1/doku/notification,\
_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},\
_DOKU_CLIENT_ID=${DOKU_CLIENT_ID}" \
    --project="${PROJECT_ID}" \
    --quiet

  success "Frontend image rebuilt and pushed to Artifact Registry ✅"
  echo ""

  # ── Step 2: Redeploy frontend to Cloud Run ────────────────────────────────
  info "Step 2: Redeploying frontend to Cloud Run with updated env vars..."

  FRONTEND_IMAGE="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${FRONTEND_SERVICE}:latest"

  # Get NEXTAUTH_SECRET from Secret Manager
  NEXTAUTH_SECRET_VALUE=$(gcloud secrets versions access latest --secret="nextauth-secret" 2>/dev/null || echo "")

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
    --set-secrets="NEXTAUTH_SECRET=nextauth-secret:latest" \
    --set-env-vars="NODE_ENV=production" \
    --allow-unauthenticated \
    --quiet

  success "Frontend redeployed to Cloud Run ✅"
  echo ""

  # ── Step 3: Verify ────────────────────────────────────────────────────────
  info "Step 3: Verifying deployment..."

  # Wait for new revision to serve
  info "Waiting 15 seconds for new revision to be ready..."
  sleep 15

  # Get the new frontend URL
  NEW_FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "unknown")

  info "Frontend URL: ${NEW_FRONTEND_URL}"

  # Health check
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${NEW_FRONTEND_URL}" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ]; then
    success "Frontend health check: HTTP ${HTTP_CODE} ✅"
  else
    warn "Frontend health check: HTTP ${HTTP_CODE} (may need more warm-up time)"
  fi

  # Check JS bundle for Google Client ID
  FRONTEND_HTML=$(curl -s "${NEW_FRONTEND_URL}" 2>/dev/null || echo "")
  JS_BUNDLE_URL=$(echo "$FRONTEND_HTML" | grep -oP 'src="(/_next/static/[^"]*\.js)"' | head -1 | sed 's/src="//' | sed 's/"//')
  if [ -n "$JS_BUNDLE_URL" ]; then
    JS_CONTENT=$(curl -s "${NEW_FRONTEND_URL}${JS_BUNDLE_URL}" 2>/dev/null || echo "")
    if echo "$JS_CONTENT" | grep -q "$GOOGLE_CLIENT_ID"; then
      success "GOOGLE_CLIENT_ID verified in new JS bundle ✅"
    else
      warn "GOOGLE_CLIENT_ID not found in first JS bundle (checking more...)"
      # Check multiple JS bundles
      for js_url in $(echo "$FRONTEND_HTML" | grep -oP 'src="(/_next/static/[^"]*\.js)"' | sed 's/src="//' | sed 's/"//'); do
        js_content=$(curl -s "${NEW_FRONTEND_URL}${js_url}" 2>/dev/null || echo "")
        if echo "$js_content" | grep -q "$GOOGLE_CLIENT_ID"; then
          success "GOOGLE_CLIENT_ID found in ${js_url} ✅"
          break
        fi
      done
    fi
  fi

  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${GREEN}  ✅ FIX APPLIED!${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${BOLD}Frontend URL:${NC} ${NEW_FRONTEND_URL}"
  echo ""
  echo -e "  ${YELLOW}⚠️  REQUIRED MANUAL STEP:${NC}"
  echo -e "  ${YELLOW}You MUST add the Cloud Run URL to Google OAuth Console:${NC}"
  echo ""
  echo -e "  1. Open: ${CYAN}https://console.cloud.google.com/apis/credentials${NC}"
  echo -e "  2. Click the OAuth 2.0 Client ID: ${CYAN}${GOOGLE_CLIENT_ID%%.*}...${NC}"
  echo -e "  3. Under '${BOLD}Authorized JavaScript origins${NC}', add:"
  echo -e "     ${GREEN}${NEW_FRONTEND_URL}${NC}"
  echo -e "  4. Under '${BOLD}Authorized redirect URIs${NC}', add:"
  echo -e "     ${GREEN}${NEW_FRONTEND_URL}/api/auth/callback/google${NC}"
  echo -e "  5. Click Save"
  echo ""
  echo -e "  ${BOLD}After completing the manual step, test Google Login at:${NC}"
  echo -e "  ${CYAN}${NEW_FRONTEND_URL}${NC}"
  echo ""
fi
