#!/bin/bash
# =============================================================================
#  SELEVENT — Comprehensive GCP Cloud Run Deployment Script
#  Script Deployment GCP Lengkap untuk SeleEvent
#
#  Usage / Penggunaan:
#    chmod +x deploy-gcp.sh
#    ./deploy-gcp.sh [OPTIONS]
#
#  Options / Opsi:
#    --project-id=ID        GCP Project ID (default: selevent-prod-001)
#    --region=REGION         GCP Region (default: asia-southeast1)
#    --dry-run               Show what would be done / Tampilkan yang akan dilakukan
#    --step N                Run only step N / Jalankan hanya step tertentu (1-12)
#    --from-step N           Start from step N / Mulai dari step tertentu
#    --to-step N             Run up to step N / Jalankan sampai step tertentu
#    --skip-steps N,N,N      Skip specific steps / Lewati step tertentu
#    --yes / -y              Skip all confirmation prompts / Lewati semua konfirmasi
#    --help / -h             Show this help / Tampilkan bantuan
#
#  Examples / Contoh:
#    ./deploy-gcp.sh                                         # Run all steps
#    ./deploy-gcp.sh --dry-run                               # Preview mode
#    ./deploy-gcp.sh --step 5                                # Only step 5 (Cloud Storage)
#    ./deploy-gcp.sh --from-step 3 --to-step 7               # Steps 3-7 only
#    ./deploy-gcp.sh --skip-steps 4,6                        # Skip Cloud SQL & Secrets
#    ./deploy-gcp.sh --project-id=my-prod --region=us-east1 # Custom project
#
#  Steps Overview / Ringkasan Langkah:
#    1  Prerequisites Check        - Cek gcloud CLI, auth, billing
#    2  Project Setup              - Buat/set project GCP
#    3  Enable APIs                - Aktifkan semua API yang diperlukan
#    4  Cloud SQL PostgreSQL       - Buat instance, database, user, PgBouncer
#    5  Cloud Storage              - Buat buckets, lifecycle, CORS
#    6  Memorystore Redis          - Buat Redis instance (1GB, HA)
#    7  Secret Manager             - Buat semua secrets
#    8  VPC Connector              - Buat VPC connector untuk private IP
#    9  Docker Build               - Build & push ke Artifact Registry
#   10  Cloud Run Deploy           - Deploy dengan semua konfigurasi
#   11  Custom Domain              - Setup domain mapping & DNS
#   12  Monitoring                 - Setup uptime check & alerting
#
#  Default Configuration / Konfigurasi Default:
#    Region:           asia-southeast2 (Jakarta)
#    Project ID:       eventku-494416
#    DB Instance:      eventku (PostgreSQL 18)
#    DB Name:          selevent
#    DB User:          selevent
#    Redis:            1GB BASIC
#    VPC Connector:    selevent-vpc-connector
#    Min Instances:    2
#    Max Instances:    100
#    CPU:              2
#    Memory:           4Gi
#
#  Author / Penulis:   SeleEvent DevOps
#  Last Updated / Terakhir Diperbarui: Juli 2025
# =============================================================================

# ── Strict Error Handling / Penanganan Error Ketat ──────────────────────────
set -euo pipefail
IFS=$'\n\t'

# ── Trap: cleanup on error / Bersihkan saat error ───────────────────────────
trap 'error_handler $? $LINENO' ERR
trap 'cleanup' EXIT

error_handler() {
  local exit_code=$1
  local line_no=$2
  echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ❌ ERROR at line ${line_no} (exit code: ${exit_code})${NC}"
  echo -e "${RED}  ❌ ERROR di baris ${line_no} (kode keluar: ${exit_code})${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${YELLOW}💡 Rollback Suggestions / Saran Rollback:${NC}"
  echo "   gcloud run services list --region=$REGION"
  echo "   gcloud sql instances list"
  echo "   gcloud secrets list"
  echo "   gcloud redis instances list --region=$REGION"
  echo "   gsutil ls"
  echo ""
  echo -e "${YELLOW}💡 Untuk rollback ke revisi sebelumnya:${NC}"
  echo "   gcloud run revisions list --service=selevent --region=$REGION"
  echo "   gcloud run services update-traffic selevent --to-revisions=REVISION=100 --region=$REGION"
  echo ""
  exit $exit_code
}

cleanup() {
  # Remove any temp files / Hapus file sementara
  rm -f /tmp/selevent-cors.json /tmp/selevent-lifecycle-qr.json /tmp/selevent-lifecycle-proof.json 2>/dev/null || true
}

# ── Colors / Warna ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# ── Default Values / Nilai Default ──────────────────────────────────────────
# ── Auto-detect project ID from gcloud config / Deteksi otomatis dari gcloud config
PROJECT_ID="$(gcloud config get-value project 2>/dev/null || echo 'eventku-494416')"
REGION="asia-southeast2"
ZONE="${REGION}-b"
DB_INSTANCE_NAME="eventku"
DB_NAME="selevent"
DB_USER="selevent"
DB_PASSWORD=""
DB_TIER="db-custom-1-3840"          # 1 vCPU, 3840MB RAM — cost-effective for Jakarta
REDIS_NAME="selevent-redis"
REDIS_TIER="BASIC"                    # BASIC only (STANDARD_HA not available in Jakarta)
REDIS_MEMORY="1"
VPC_CONNECTOR_NAME="selevent-vpc-connector"
VPC_CONNECTOR_RANGE="28.2.0.0/28"     # Using 28.x range to avoid conflict with 10.79.x.x peering
VPC_NETWORK_NAME="selevent-vpc"
SERVICE_NAME="selevent"
ARTIFACT_REPO="selevent"
SA_NAME="selevent-sa"
DOMAIN_NAME=""
NOTIFICATION_EMAIL=""
DOKU_CLIENT_ID=""
DOKU_SHARED_KEY=""
DOKU_PRIVATE_KEY_FILE=""
JWT_SECRET=""
NEXTAUTH_SECRET=""

# ── Script Control Flags / Flag Kendali Script ─────────────────────────────
DRY_RUN=false
RUN_STEP=""
FROM_STEP=""
TO_STEP=""
SKIP_STEPS=""
SKIP_CONFIRM=false
SCRIPT_START_TIME=$(date +%s)

# ── Tracking Arrays / Array Pelacakan ───────────────────────────────────────
CREATED_RESOURCES=()
SKIPPED_RESOURCES=()
FAILED_RESOURCES=()

# =============================================================================
# PARSE ARGUMENTS / PARSE ARGUMEN
# =============================================================================
for arg in "$@"; do
  case $arg in
    --project-id=*)     PROJECT_ID="${arg#*=}" ;;
    --region=*)         REGION="${arg#*=}"; ZONE="${REGION}-a" ;;
    --dry-run)          DRY_RUN=true ;;
    --step=*)           RUN_STEP="${arg#*=}" ;;
    --from-step=*)      FROM_STEP="${arg#*=}" ;;
    --to-step=*)        TO_STEP="${arg#*=}" ;;
    --skip-steps=*)     SKIP_STEPS="${arg#*=}" ;;
    --yes|-y)           SKIP_CONFIRM=true ;;
    --help|-h)
      sed -n '2,/^# =====/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg / Argumen tidak dikenal: $arg${NC}"
      echo "Run './deploy-gcp.sh --help' for usage / Jalankan untuk bantuan"
      exit 1
      ;;
  esac
done

# ── Build skip set / Bangun set langkah yang dilewati ──────────────────────
declare -A SKIP_SET
if [ -n "$SKIP_STEPS" ]; then
  IFS=',' read -ra SKIP_ARRAY <<< "$SKIP_STEPS"
  for s in "${SKIP_ARRAY[@]}"; do
    SKIP_SET["$s"]=1
  done
fi

# =============================================================================
# HELPER FUNCTIONS / FUNGSI PEMBANTU
# =============================================================================

# ── Logging Functions / Fungsi Logging ──────────────────────────────────────
info()    { echo -e "  ${BLUE}ℹ ${NC}$*"; }
success() { echo -e "  ${GREEN}✔ ${NC}$*"; CREATED_RESOURCES+=("$*"); }
warn()    { echo -e "  ${YELLOW}⚠ ${NC}$*"; SKIPPED_RESOURCES+=("$*"); }
error()   { echo -e "  ${RED}✖ ${NC}$*"; FAILED_RESOURCES+=("$*"); }
step_header() {
  local num="$1"
  local title="$2"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  STEP ${num}: ${title}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ── Progress Spinner / Indikator Progres ───────────────────────────────────
show_spinner() {
  local pid=$1
  local message="$2"
  local spin='-\|/'
  local i=0

  while kill -0 "$pid" 2>/dev/null; do
    i=$(( (i+1) %4 ))
    printf "\r  ${CYAN}${spin:$i:1}${NC} ${message}..."
    sleep 0.1
  done
  printf "\r  ${GREEN}✔${NC} ${message}    \n"
}

run_bg() {
  local desc="$1"
  shift
  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} $*"
    return 0
  fi
  "$@" &
  local pid=$!
  show_spinner "$pid" "$desc"
  wait "$pid"
  return $?
}

# ── Command Runner with Error Check / Jalankan Perintah dengan Cek Error ───
run_cmd() {
  local desc="${1:-}"
  shift
  local cmd="$*"

  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} ${cmd}"
    return 0
  fi

  info "Running: ${cmd}"
  if eval "$cmd" 2>&1; then
    return 0
  else
    local rc=$?
    error "Command failed (exit ${rc}): ${cmd}"
    return $rc
  fi
}

# Tolerant run — tidak crash jika resource sudah ada
run_cmd_tol() {
  local desc="${1:-}"
  shift
  local cmd="$*"

  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} ${cmd}"
    return 0
  fi

  info "Running: ${cmd}"
  # shellcheck disable=SC2086
  if eval $cmd 2>&1; then
    return 0
  else
    local rc=$?
    warn "Command returned ${rc} (may already exist / mungkin sudah ada): ${cmd}"
    return 0  # Don't fail / Jangan gagal
  fi
}

# ── Confirmation Prompt / Prompt Konfirmasi ─────────────────────────────────
confirm() {
  local msg="$1"
  local default="${2:-n}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} Would prompt: ${msg}"
    return 0
  fi

  if [ "$SKIP_CONFIRM" = true ]; then
    echo -e "  ${DIM}(auto-confirmed with --yes)${NC}"
    return 0
  fi

  echo ""
  echo -e "  ${YELLOW}─── ⚡ CONFIRMATION REQUIRED / KONFIRMASI DIPERLUKAN ───${NC}"
  echo -e "  ${YELLOW}${msg}${NC}"

  if [ "$default" = "y" ]; then
    read -p "  Continue? [Y/n]: " -n 1 -r
  else
    read -p "  Continue? [y/N]: " -n 1 -r
  fi
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z "$REPLY" && "$default" == "y" ]]; then
    return 0
  else
    echo -e "  ${DIM}Step skipped by user / Langkah dilewati oleh pengguna${NC}"
    return 1
  fi
}

# ── Interactive Input / Input Interaktif ───────────────────────────────────
ask_input() {
  local prompt="$1"
  local var_name="$2"
  local default_val="${3:-}"
  local is_secret="${4:-false}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} Would ask: ${prompt}"
    eval "$var_name='${default_val}'"
    return 0
  fi

  echo ""
  local display_default=""
  if [ -n "$default_val" ]; then
    display_default=" [${default_val}]"
  fi

  if [ "$is_secret" = true ]; then
    read -sp "  ${prompt}${display_default}: " input_val
    echo ""
  else
    read -p "  ${prompt}${display_default}: " input_val
  fi

  eval "$var_name='${input_val:-$default_val}'"
}

# ── Step Gate / Gerbang Langkah ─────────────────────────────────────────────
# Returns 0 if the step should run, 1 if it should be skipped
should_run_step() {
  local step_num="$1"

  # Check explicit --step N / Cek --step N eksplisit
  if [ -n "$RUN_STEP" ] && [ "$RUN_STEP" != "$step_num" ]; then
    return 1
  fi

  # Check --from-step / Cek --from-step
  if [ -n "$FROM_STEP" ] && [ "$step_num" -lt "$FROM_STEP" ]; then
    return 1
  fi

  # Check --to-step / Cek --to-step
  if [ -n "$TO_STEP" ] && [ "$step_num" -gt "$TO_STEP" ]; then
    return 1
  fi

  # Check skip set / Cek set langkah yang dilewati
  if [[ -n "${SKIP_SET[$step_num]:-}" ]]; then
    warn "Step ${step_num} explicitly skipped via --skip-steps"
    return 1
  fi

  return 0
}

# ── Resource Exists Check / Cek Ketersediaan Resource ───────────────────────
resource_exists() {
  local type="$1"
  local name="$2"
  local region="${3:-$REGION}"

  case "$type" in
    project)
      gcloud projects describe "$name" --format='value(projectId)' 2>/dev/null && return 0
      ;;
    sql_instance)
      gcloud sql instances describe "$name" --format='value(state)' 2>/dev/null && return 0
      ;;
    bucket)
      gsutil ls "gs://${name}/" >/dev/null 2>&1 && return 0
      ;;
    redis)
      gcloud redis instances describe "$name" --region="$region" --format='value(state)' 2>/dev/null && return 0
      ;;
    secret)
      gcloud secrets describe "$name" --format='value(name)' 2>/dev/null && return 0
      ;;
    vpc_connector)
      gcloud compute networks vpc-access connectors describe "$name" --region="$region" --format='value(name)' 2>/dev/null && return 0
      ;;
    cloud_run_service)
      gcloud run services describe "$name" --region="$region" --format='value(status.url)' 2>/dev/null && return 0
      ;;
    artifact_repo)
      gcloud artifacts repositories describe "$name" --location="$region" --format='value.name)' 2>/dev/null && return 0
      ;;
    service_account)
      gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" --format='value(email)' 2>/dev/null && return 0
      ;;
    vpc_network)
      gcloud compute networks describe "$name" --format='value(name)' 2>/dev/null && return 0
      ;;
    *)
      warn "Unknown resource type: $type"
      return 1
      ;;
  esac
  return 1
}

# ── Elapsed Time / Waktu Berjalan ──────────────────────────────────────────
elapsed_time() {
  local now=$(date +%s)
  local elapsed=$((now - SCRIPT_START_TIME))
  local mins=$((elapsed / 60))
  local secs=$((elapsed % 60))
  echo "${mins}m ${secs}s"
}

# =============================================================================
# BANNER / BANNER
# =============================================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${BOLD}${CYAN}║           🚀 SELEVENT — GCP Cloud Run Deployment Script              ║${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Configuration / Konfigurasi:${NC}"
echo -e "    Project ID:       ${BOLD}${PROJECT_ID}${NC}"
echo -e "    Region:           ${BOLD}${REGION}${NC} (Jakarta)"
echo -e "    Zone:             ${BOLD}${ZONE}${NC}"
echo -e "    DB Instance:      ${BOLD}${DB_INSTANCE_NAME}${NC} (PostgreSQL 18)"
echo -e "    DB Tier:          ${BOLD}${DB_TIER}${NC}"
echo -e "    Redis:            ${BOLD}${REDIS_TIER}${NC}, ${REDIS_MEMORY}GB"
echo -e "    VPC Connector:    ${BOLD}${VPC_CONNECTOR_NAME}${NC}"
echo -e "    Service Name:     ${BOLD}${SERVICE_NAME}${NC}"
echo -e "    Artifact Repo:    ${BOLD}${ARTIFACT_REPO}${NC}"
echo -e "    Dry Run:          ${BOLD}${DRY_RUN}${NC}"
if [ -n "$RUN_STEP" ]; then echo -e "    Run Step:         ${BOLD}${RUN_STEP}${NC}"; fi
if [ -n "$FROM_STEP" ]; then echo -e "    From Step:        ${BOLD}${FROM_STEP}${NC}"; fi
if [ -n "$TO_STEP" ]; then echo -e "    To Step:           ${BOLD}${TO_STEP}${NC}"; fi
if [ -n "$SKIP_STEPS" ]; then echo -e "    Skip Steps:       ${BOLD}${SKIP_STEPS}${NC}"; fi
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}━━━ 🔍 DRY-RUN MODE — No changes will be made / MODE DRY-RUN — Tidak ada perubahan ━━━${NC}"
  echo ""
fi

# =============================================================================
# STEP 1: PREREQUISITES CHECK / CEK PRASYARAT
# =============================================================================
if should_run_step 1; then
  step_header 1 "Prerequisites Check / Cek Prasyarat"

  echo -e "  ${DIM}Checking gcloud CLI, authentication, project, and billing...${NC}"
  echo -e "  ${DIM}Memeriksa gcloud CLI, autentikasi, project, dan billing...${NC}"
  echo ""

  # ── 1.1 Check gcloud CLI / Cek gcloud CLI ────────────────────────────────
  if command -v gcloud &> /dev/null; then
    local_gcloud_version=$(gcloud --version 2>/dev/null | head -1)
    success "gcloud CLI installed: ${local_gcloud_version}"
  else
    error "gcloud CLI NOT found / gcloud CLI TIDAK ditemukan!"
    echo -e "    Install from: https://cloud.google.com/sdk/docs/install"
    echo -e "    Install dari: https://cloud.google.com/sdk/docs/install"
    exit 1
  fi

  # ── 1.2 Check Docker / Cek Docker ────────────────────────────────────────
  if command -v docker &> /dev/null; then
    local_docker_version=$(docker --version 2>/dev/null)
    success "Docker installed: ${local_docker_version}"
  else
    warn "Docker NOT found — required for Step 9 (build). Install: https://docs.docker.com/get-docker/"
    warn "Docker TIDAK ditemukan — diperlukan untuk Step 9 (build)."
  fi

  # ── 1.3 Check authentication / Cek autentikasi ──────────────────────────
  echo ""
  info "Checking gcloud authentication / Memeriksa autentikasi gcloud..."

  local_auth_account=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1)
  if [ -n "$local_auth_account" ]; then
    success "Authenticated as: ${local_auth_account}"
  else
    warn "Not authenticated. Running 'gcloud auth login'..."
    if [ "$DRY_RUN" != true ]; then
      gcloud auth login --quiet || {
        error "Authentication failed / Autentikasi gagal!"
        exit 1
      }
      success "Authentication successful / Autentikasi berhasil"
    fi
  fi

  # ── 1.4 Check Application Default Credentials / Cek ADC ──────────────────
  info "Checking Application Default Credentials / Memeriksa ADC..."
  if gcloud auth application-default print-access-token &>/dev/null; then
    success "Application Default Credentials configured"
  else
    warn "ADC not configured. Running 'gcloud auth application-default login'..."
    if [ "$DRY_RUN" != true ]; then
      gcloud auth application-default login --quiet || {
        warn "ADC setup failed — some commands may not work"
      }
    fi
  fi

  # ── 1.5 Check project exists / Cek project ada ───────────────────────────
  echo ""
  info "Checking project existence / Memeriksa keberadaan project..."

  local_project_exists=$(gcloud projects describe "$PROJECT_ID" --format='value(projectId)' 2>/dev/null || echo "")

  if [ -n "$local_project_exists" ]; then
    success "Project '${PROJECT_ID}' exists / Project sudah ada"
    gcloud config set project "$PROJECT_ID" 2>/dev/null || true
  else
    warn "Project '${PROJECT_ID}' does NOT exist / Project TIDAK ada"
    echo -e "    ${DIM}Will be created in Step 2 / Akan dibuat di Step 2${NC}"
  fi

  # ── 1.6 Check billing / Cek billing ──────────────────────────────────────
  echo ""
  info "Checking billing status / Memeriksa status billing..."

  local_billing=$(gcloud beta billing projects describe "$PROJECT_ID" \
    --format='value(billingEnabled)' 2>/dev/null || echo "unknown")

  if [ "$local_billing" = "true" ]; then
    success "Billing is enabled / Billing sudah aktif"
  elif [ "$local_billing" = "false" ]; then
    error "Billing is NOT enabled for project '${PROJECT_ID}'!"
    echo -e "    Enable billing at: https://console.cloud.google.com/billing"
    echo -e "    Aktifkan billing di: https://console.cloud.google.com/billing"
    echo -e "    ${DIM}Note: If project doesn't exist yet, billing check will pass after creation in Step 2${NC}"
    echo -e "    ${DIM}Catatan: Jika project belum ada, cek billing akan lewat setelah dibuat di Step 2${NC}"

    if ! confirm "Billing not enabled. Continue anyway? / Billing tidak aktif. Lanjutkan?" "n"; then
      exit 1
    fi
  else
    warn "Could not verify billing (project may not exist yet) / Tidak bisa verifikasi billing"
    echo -e "    ${DIM}Billing will be verified after project creation / Billing akan diverifikasi setelah pembuatan project${NC}"
  fi

  # ── 1.7 Check gsutil / Cek gsutil ────────────────────────────────────────
  if command -v gsutil &> /dev/null; then
    success "gsutil available"
  else
    warn "gsutil not found — some Cloud Storage operations may fail"
  fi

  # ── 1.8 Check required tools / Cek tools yang diperlukan ─────────────────
  for tool in openssl curl; do
    if command -v "$tool" &>/dev/null; then
      success "${tool} available"
    else
      warn "${tool} not found — some features may be limited"
    fi
  done

  echo ""
  success "Step 1 complete: All prerequisites checked / Semua prasyarat dicek"
else
  echo -e "\n  ${DIM}⏭ Step 1: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 2: PROJECT SETUP / SETUP PROJECT
# =============================================================================
if should_run_step 2; then
  step_header 2 "Project Setup / Setup Project GCP"

  # ── 2.1 Create or select project / Buat atau pilih project ────────────────
  if resource_exists project "$PROJECT_ID"; then
    success "Project '${PROJECT_ID}' already exists / Project sudah ada"
    gcloud config set project "$PROJECT_ID"
  else
    confirm "Create new GCP project: ${PROJECT_ID}? / Buat project GCP baru?" "y"

    run_cmd "Creating project / Membuat project" \
      "gcloud projects create ${PROJECT_ID} --name='SeleEvent Production' --quiet"

    success "Project '${PROJECT_ID}' created! / Project berhasil dibuat!"

    echo ""
    warn "IMPORTANT: You must enable billing for this project / PENTING: Anda harus aktifkan billing"
    echo -e "    🔗 https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
    echo ""
    echo -e "    ${DIM}After enabling billing, re-run this script / Setelah mengaktifkan billing, jalankan ulang script ini${NC}"

    if ! confirm "Have you enabled billing? / Apakah billing sudah diaktifkan?" "n"; then
      echo -e "  ${DIM}Please enable billing and re-run / Silakan aktifkan billing dan jalankan ulang${NC}"
      exit 0
    fi
  fi

  # ── 2.2 Set default project & region / Set project & region default ──────
  run_cmd "Setting default project / Mengatur project default" \
    "gcloud config set project ${PROJECT_ID}"
  run_cmd "Setting default region / Mengatur region default" \
    "gcloud config set compute/region ${REGION}"
  run_cmd "Setting default zone / Mengatur zone default" \
    "gcloud config set compute/zone ${ZONE}"

  # ── 2.3 Verify billing again / Verifikasi billing lagi ───────────────────
  info "Verifying billing status / Memverifikasi status billing..."
  local_billing=$(gcloud beta billing projects describe "$PROJECT_ID" \
    --format='value(billingEnabled)' 2>/dev/null || echo "false")

  if [ "$local_billing" = "true" ]; then
    success "Billing verified / Billing terverifikasi"
  else
    error "Billing still not enabled! Cannot proceed / Billing masih tidak aktif!"
    echo -e "    🔗 https://console.cloud.google.com/billing"
    exit 1
  fi

  echo ""
  success "Step 2 complete: Project '${PROJECT_ID}' is ready / Project siap"
else
  echo -e "\n  ${DIM}⏭ Step 2: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 3: ENABLE APIS / AKTIFKAN API
# =============================================================================
if should_run_step 3; then
  step_header 3 "Enable Required APIs / Aktifkan API yang Diperlukan"

  confirm "Enable all required GCP APIs? / Aktifkan semua API GCP yang diperlukan?" "y"

  # All required APIs for SeleEvent / Semua API yang diperlukan
  APIS=(
    "run.googleapis.com"              # Cloud Run
    "sqladmin.googleapis.com"         # Cloud SQL Admin
    "storage.googleapis.com"          # Cloud Storage
    "redis.googleapis.com"            # Memorystore Redis
    "secretmanager.googleapis.com"    # Secret Manager
    "cloudbuild.googleapis.com"       # Cloud Build
    "artifactregistry.googleapis.com" # Artifact Registry
    "logging.googleapis.com"          # Cloud Logging
    "monitoring.googleapis.com"       # Cloud Monitoring
    "vpcaccess.googleapis.com"        # VPC Access
    "compute.googleapis.com"          # Compute Engine (for VPC networking)
    "servicenetworking.googleapis.com" # Service Networking (for Cloud SQL private IP)
    "iam.googleapis.com"              # IAM
    "dns.googleapis.com"              # Cloud DNS
    "cloudtrace.googleapis.com"       # Cloud Trace
  )

  echo ""
  info "Enabling ${#APIS[@]} APIs... / Mengaktifkan ${#APIS[@]} API..."

  for api in "${APIS[@]}"; do
    local_api_name=$(echo "$api" | cut -d'.' -f1)
    run_cmd_tol "Enabling ${local_api_name}..." \
      "gcloud services enable ${api} --project=${PROJECT_ID} --quiet"
  done

  echo ""
  success "Step 3 complete: All APIs enabled / Semua API diaktifkan"
else
  echo -e "\n  ${DIM}⏭ Step 3: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 4: CLOUD SQL POSTGRESQL
# =============================================================================
if should_run_step 4; then
  step_header 4 "Cloud SQL PostgreSQL Setup / Setup Cloud SQL PostgreSQL"

  confirm "Create Cloud SQL PostgreSQL instance? (~$80-150/month) / Buat instance Cloud SQL?" "y"

  # ── 4.1 Create VPC Network (prerequisite for private IP) ─────────────────
  # VPC harus dibuat sebelum Cloud SQL jika pakai private IP
  echo ""
  info "Setting up VPC networking for Cloud SQL private IP..."

  if resource_exists vpc_network "$VPC_NETWORK_NAME"; then
    success "VPC network '${VPC_NETWORK_NAME}' already exists / VPC sudah ada"
  else
    run_cmd_tol "Creating VPC network / Membuat VPC" \
      "gcloud compute networks create ${VPC_NETWORK_NAME} --subnet-mode=custom --quiet"
    success "VPC network created / VPC berhasil dibuat"
  fi

  # ── 4.2 Setup VPC peering for Cloud SQL private IP / Setup peering VPC ──
  info "Setting up Service Networking peering for private IP..."

  run_cmd_tol "Reserving IP range for peering / Menyediakan range IP" \
    "gcloud compute addresses create google-managed-services-${PROJECT_ID} \
      --global \
      --purpose=VPC_PEERING \
      --prefix-length=16 \
      --network=${VPC_NETWORK_NAME} \
      --quiet"

  run_cmd_tol "Creating VPC peering / Membuat VPC peering" \
    "gcloud services vpc-peerings connect \
      --service=servicenetworking.googleapis.com \
      --ranges=google-managed-services-${PROJECT_ID} \
      --network=${VPC_NETWORK_NAME} \
      --quiet"

  # ── 4.3 Get database password / Dapatkan password database ───────────────
  echo ""
  if [ -z "$DB_PASSWORD" ]; then
    echo -e "  ${YELLOW}Enter database password for '${DB_USER}' (special chars OK)${NC}"
    read -rsp "  Password: " DB_PASSWORD
    echo ""
    # Export to be visible in subshell
    declare -g DB_PASSWORD="$DB_PASSWORD"
    true
  fi

  if [ -z "$DB_PASSWORD" ]; then
    error "Database password is required / Password database wajib diisi!"
    exit 1
  fi

  # ── 4.4 Create Cloud SQL instance / Buat instance Cloud SQL ──────────────
  echo ""
  info "Creating Cloud SQL PostgreSQL 18 instance..."

  if resource_exists sql_instance "$DB_INSTANCE_NAME"; then
    warn "Cloud SQL instance '${DB_INSTANCE_NAME}' already exists — skipping creation"
    warn "Instance Cloud SQL sudah ada — lewati pembuatan"
  else
    run_cmd "Creating Cloud SQL instance (this takes 5-10 minutes)..." \
      "gcloud sql instances create ${DB_INSTANCE_NAME} \
        --database-version=POSTGRES_18 \
        --tier=${DB_TIER} \
        --region=${REGION} \
        --availability-type=REGIONAL \
        --storage-type=SSD \
        --storage-size=20GB \
        --storage-auto-increase \
        --backup-start-time=02:00 \
        --enable-point-in-time-recovery \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=03 \
        --database-flags=max_connections=200,log_min_duration_statement=1000 \
        --network=${VPC_NETWORK_NAME} \
        --no-assign-ip \
        --quiet"

    # Wait for instance to be ready / Tunggu instance siap
    info "Waiting for Cloud SQL instance to become ready... / Menunggu instance siap..."
    info "(This typically takes 5-10 minutes / Ini biasanya memakan waktu 5-10 menit)"

    for i in $(seq 1 60); do
      local_db_state=$(gcloud sql instances describe "$DB_INSTANCE_NAME" \
        --format='value(state)' 2>/dev/null || echo "PENDING")
      if [ "$local_db_state" = "RUNNABLE" ]; then
        success "Cloud SQL instance is ready! / Instance siap!"
        break
      fi
      printf "\r  ${CYAN}⏳ Waiting... state=%s (%d/60)${NC}  " "$local_db_state" "$i"
      sleep 10
    done
    echo ""

    # Verify final state / Verifikasi state akhir
    local_db_state=$(gcloud sql instances describe "$DB_INSTANCE_NAME" \
      --format='value(state)' 2>/dev/null || echo "UNKNOWN")
    if [ "$local_db_state" != "RUNNABLE" ]; then
      error "Cloud SQL instance not ready (state: ${local_db_state}). Check console."
      error "Instance Cloud SQL tidak siap. Periksa console."
      exit 1
    fi
  fi

  # ── 4.5 Create database / Buat database ──────────────────────────────────
  info "Setting up database '${DB_NAME}'..."
  run_cmd_tol "Creating database / Membuat database" \
    "gcloud sql databases create ${DB_NAME} --instance=${DB_INSTANCE_NAME} --quiet"

  # ── 4.6 Create user / Buat user ──────────────────────────────────────────
  info "Setting up database user '${DB_USER}'..."
  run_cmd_tol "Creating database user / Membuat user database" \
    "gcloud sql users create ${DB_USER} \
      --instance=${DB_INSTANCE_NAME} \
      --password='${DB_PASSWORD}' \
      --quiet"

  # ── 4.7 Connection Pooling (PgBouncer) — SKIP for PG18 ENTERPRISE_PLUS
  # NOTE: PgBouncer pool instances don't support db-custom tiers on PG18 ENTERPRISE_PLUS
  # NOTE: Pool koneksi PgBouncer tidak mendukung db-custom tier pada PG18 ENTERPRISE_PLUS
  # Direct connection to PostgreSQL 18 is sufficient for most workloads
  echo ""
  warn "PgBouncer connection pool: SKIPPED (PG18 ENTERPRISE_PLUS doesn't support pool with db-custom)"
  info "Direct PostgreSQL connection will be used (port 5432)"
  info "Koneksi langsung PostgreSQL akan digunakan (port 5432)"
  info "Tip: Use Prisma connection pooling with pgBouncer in your application instead"
  info "Tip: Gunakan pooling Prisma dengan pgBouncer di aplikasi sebagai gantinya"

  # ── 4.8 Display connection info / Tampilkan info koneksi ─────────────────
  echo ""
  local_conn_name="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
  info "Cloud SQL Connection Details / Detail Koneksi Cloud SQL:"
  echo -e "    Connection Name:  ${BOLD}${local_conn_name}${NC}"
  echo -e "    Database:         ${BOLD}${DB_NAME}${NC}"
  echo -e "    User:             ${BOLD}${DB_USER}${NC}"
  echo -e "    Host (Private):   ${BOLD}$(gcloud sql instances describe ${DB_INSTANCE_NAME} --format='value(ipAddresses[0].ipAddress)' 2>/dev/null || echo 'N/A')${NC}"
  echo -e "    Direct Port:      ${BOLD}5432${NC}"

  success "Step 4 complete: Cloud SQL PostgreSQL ready / Cloud SQL siap"
else
  echo -e "\n  ${DIM}⏭ Step 4: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 5: CLOUD STORAGE
# =============================================================================
if should_run_step 5; then
  step_header 5 "Cloud Storage Setup / Setup Cloud Storage"

  confirm "Create Cloud Storage buckets? / Buat bucket Cloud Storage?" "y"

  # Bucket definitions: "name:access:location" / Definisi bucket
  BUCKETS=(
    "selevent-assets:standard"
    "selevent-qrcodes:standard"
    "selevent-withdrawal-proof:nearline"
    "selevent-avatars:standard"
  )

  echo ""
  info "Creating ${#BUCKETS[@]} Cloud Storage buckets... / Membuat ${#BUCKETS[@]} bucket..."

  for bucket_info in "${BUCKETS[@]}"; do
    IFS=':' read -r bucket_name storage_class <<< "$bucket_info"

    echo ""
    info "Processing bucket: ${bucket_name} (storage class: ${storage_class})..."

    if resource_exists bucket "$bucket_name"; then
      warn "Bucket 'gs://${bucket_name}' already exists / Bucket sudah ada"
    else
      run_cmd_tol "Creating bucket gs://${bucket_name}" \
        "gsutil mb -p ${PROJECT_ID} -l ${REGION} -c ${storage_class} gs://${bucket_name}"
      success "Bucket created: gs://${bucket_name}"
    fi

    # Set uniform bucket-level access (recommended) / Set akses uniform
    run_cmd_tol "Setting uniform access on gs://${bucket_name}" \
      "gsutil uniformbucketlevelaccess set on gs://${bucket_name}"
  done

  # ── 5.2 Set CORS Configuration / Atur Konfigurasi CORS ───────────────────
  echo ""
  info "Setting CORS policies... / Mengatur kebijakan CORS..."

  cat > /tmp/selevent-cors.json << 'CORS_EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Cache-Control",
      "Content-Length",
      "Content-Disposition",
      "X-Goog-Storage-Class",
      "Access-Control-Allow-Origin"
    ],
    "maxAgeSeconds": 3600
  }
]
CORS_EOF

  for bucket_name in selevent-assets selevent-qrcodes selevent-avatars; do
    run_cmd_tol "Setting CORS on gs://${bucket_name}" \
      "gsutil cors set /tmp/selevent-cors.json gs://${bucket_name}"
  done

  # ── 5.3 Set Lifecycle Policies / Atur Kebijakan Lifecycle ───────────────
  echo ""
  info "Setting lifecycle policies... / Mengatur kebijakan lifecycle..."

  # QR Codes: auto-delete after 90 days (GDPR compliance / kepatuhan GDPR)
  cat > /tmp/selevent-lifecycle-qr.json << 'LIFECYCLE_QR_EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 30, "matchesPrefix": ["tickets/"]}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
LIFECYCLE_QR_EOF

  # Withdrawal proof: keep for 1 year, then archive
  cat > /tmp/selevent-lifecycle-proof.json << 'LIFECYCLE_PROOF_EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 180}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 365}
      }
    ]
  }
}
LIFECYCLE_PROOF_EOF

  run_cmd_tol "Setting lifecycle on gs://selevent-qrcodes (90-day auto-delete)" \
    "gsutil lifecycle set /tmp/selevent-lifecycle-qr.json gs://selevent-qrcodes"

  run_cmd_tol "Setting lifecycle on gs://selevent-withdrawal-proof" \
    "gsutil lifecycle set /tmp/selevent-lifecycle-proof.json gs://selevent-withdrawal-proof"

  # Cleanup temp files / Bersihkan file sementara
  rm -f /tmp/selevent-cors.json /tmp/selevent-lifecycle-qr.json /tmp/selevent-lifecycle-proof.json

  echo ""
  success "Step 5 complete: All Cloud Storage buckets configured / Semua bucket dikonfigurasi"
else
  echo -e "\n  ${DIM}⏭ Step 5: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 6: MEMORYSTICK REDIS
# =============================================================================
if should_run_step 6; then
  step_header 6 "Memorystore Redis Setup / Setup Memorystore Redis"

  confirm "Create Memorystore Redis instance? (~$25-40/month for 1GB BASIC) / Buat instance Redis?" "y"

  echo ""
  info "Creating Redis instance: ${REDIS_NAME} (${REDIS_MEMORY}GB, ${REDIS_TIER})..."

  if resource_exists redis "$REDIS_NAME"; then
    warn "Redis instance '${REDIS_NAME}' already exists / Instance Redis sudah ada"
  else
    run_cmd "Creating Memorystore Redis (this takes 5-10 minutes)..." \
      "gcloud redis instances create ${REDIS_NAME} \
        --size=${REDIS_MEMORY} \
        --region=${REGION} \
        --network=${VPC_NETWORK_NAME} \
        --tier=${REDIS_TIER} \
        --redis-version=redis_7_0 \
        --quiet"

    # Wait for Redis to be ready / Tunggu Redis siap
    info "Waiting for Redis instance to become ready... / Menunggu Redis siap..."

    for i in $(seq 1 60); do
      local_redis_state=$(gcloud redis instances describe "$REDIS_NAME" \
        --region="$REGION" --format='value(state)' 2>/dev/null || echo "PENDING")
      if [ "$local_redis_state" = "READY" ]; then
        success "Redis instance is ready! / Instance Redis siap!"
        break
      fi
      printf "\r  ${CYAN}⏳ Waiting... state=%s (%d/60)${NC}  " "$local_redis_state" "$i"
      sleep 10
    done
    echo ""

    local_redis_state=$(gcloud redis instances describe "$REDIS_NAME" \
      --region="$REGION" --format='value(state)' 2>/dev/null || echo "UNKNOWN")
    if [ "$local_redis_state" != "READY" ]; then
      error "Redis instance not ready (state: ${local_redis_state})"
      exit 1
    fi
  fi

  # Display Redis connection info / Tampilkan info koneksi Redis
  local_redis_host=$(gcloud redis instances describe "$REDIS_NAME" \
    --region="$REGION" --format='value(host)' 2>/dev/null || echo "N/A")
  local_redis_port=$(gcloud redis instances describe "$REDIS_NAME" \
    --region="$REGION" --format='value(port)' 2>/dev/null || echo "6379")

  echo ""
  info "Redis Connection Details / Detail Koneksi Redis:"
  echo -e "    Host:   ${BOLD}${local_redis_host}${NC}"
  echo -e "    Port:   ${BOLD}${local_redis_port}${NC}"
  echo -e "    Redis URL: ${BOLD}redis://${local_redis_host}:${local_redis_port}/0${NC}"

  success "Step 6 complete: Memorystore Redis ready / Redis siap"
else
  echo -e "\n  ${DIM}⏭ Step 6: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 7: SECRET MANAGER
# =============================================================================
if should_run_step 7; then
  step_header 7 "Secret Manager Setup / Setup Secret Manager"

  confirm "Configure secrets in Secret Manager? / Konfigurasi secrets?" "y"

  # ── Generate secrets if not provided / Generate secrets jika belum ada ───
  if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || echo "CHANGE_ME_JWT_SECRET_$(date +%s)")
  fi
  if [ -z "$NEXTAUTH_SECRET" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 48 2>/dev/null || echo "CHANGE_ME_NEXTAUTH_SECRET_$(date +%s)")
  fi

  # Build DATABASE_URL
  local_db_host=$(gcloud sql instances describe "$DB_INSTANCE_NAME" \
    --format='value(ipAddresses[0].ipAddress)' 2>/dev/null || echo "/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}")
  local_database_url="postgresql://${DB_USER}:${DB_PASSWORD}@${local_db_host}:5432/${DB_NAME}?sslmode=require"

  # Build REDIS_URL
  local_redis_host=$(gcloud redis instances describe "$REDIS_NAME" \
    --region="$REGION" --format='value(host)' 2>/dev/null || echo "REDIS_HOST")
  local_redis_url="redis://${local_redis_host}:6379/0"

  # ── Interactive prompts for sensitive values / Prompt untuk nilai sensitif ─
  echo ""
  info "Configuring secrets. Some values will be auto-generated."
  info "Mengkonfigurasi secrets. Beberapa nilai akan di-generate otomatis."
  echo ""

  ask_input "DOKU Client ID (MCH-xxx) / ID Klien DOKU" DOKU_CLIENT_ID ""
  ask_input "DOKU Shared Key / Kunci Bersama DOKU" DOKU_SHARED_KEY ""
  ask_input "Path to DOKU Private Key file (or Enter to skip) / Path file kunci privat DOKU" DOKU_PRIVATE_KEY_FILE ""

  # ── Secret definitions / Definisi secrets ────────────────────────────────
  declare -A SECRETS
  SECRETS["DATABASE_URL"]="${local_database_url}"
  SECRETS["REDIS_URL"]="${local_redis_url}"
  SECRETS["JWT_SECRET"]="${JWT_SECRET}"
  SECRETS["NEXTAUTH_SECRET"]="${NEXTAUTH_SECRET}"

  if [ -n "$DOKU_CLIENT_ID" ]; then
    SECRETS["DOKU_CLIENT_ID"]="${DOKU_CLIENT_ID}"
  fi
  if [ -n "$DOKU_SHARED_KEY" ]; then
    SECRETS["DOKU_SHARED_KEY"]="${DOKU_SHARED_KEY}"
  fi

  # ── Create or update secrets / Buat atau update secrets ──────────────────
  echo ""
  info "Creating/updating ${#SECRETS[@]} secrets... / Membuat/memperbarui secrets..."

  for secret_name in "${!SECRETS[@]}"; do
    local_secret_val="${SECRETS[$secret_name]}"

    if [ -z "$local_secret_val" ]; then
      warn "Skipping empty secret: ${secret_name} / Melewatkan secret kosong"
      continue
    fi

    if resource_exists secret "$secret_name"; then
      info "Updating secret: ${secret_name}"
      echo -n "$local_secret_val" | gcloud secrets versions add "$secret_name" \
        --data-file=- --quiet 2>/dev/null && \
        success "Secret '${secret_name}' updated / Secret diperbarui" || \
        warn "Failed to update secret: ${secret_name}"
    else
      echo -n "$local_secret_val" | gcloud secrets create "$secret_name" \
        --data-file=- --quiet 2>/dev/null && \
        success "Secret '${secret_name}' created / Secret dibuat" || \
        warn "Failed to create secret: ${secret_name}"
    fi
  done

  # ── DOKU Private Key (file-based secret) / Kunci Privat DOKU ─────────────
  if [ -n "$DOKU_PRIVATE_KEY_FILE" ] && [ -f "$DOKU_PRIVATE_KEY_FILE" ]; then
    echo ""
    info "Importing DOKU private key from file... / Mengimpor kunci privat DOKU..."

    if resource_exists secret "DOKU_PRIVATE_KEY"; then
      cat "$DOKU_PRIVATE_KEY_FILE" | gcloud secrets versions add DOKU_PRIVATE_KEY \
        --data-file=- --quiet 2>/dev/null && \
        success "DOKU_PRIVATE_KEY updated / Kunci privat diperbarui" || \
        warn "Failed to update DOKU_PRIVATE_KEY"
    else
      cat "$DOKU_PRIVATE_KEY_FILE" | gcloud secrets create DOKU_PRIVATE_KEY \
        --data-file=- --quiet 2>/dev/null && \
        success "DOKU_PRIVATE_KEY created / Kunci privat dibuat" || \
        warn "Failed to create DOKU_PRIVATE_KEY"
    fi
  else
    echo ""
    warn "No DOKU private key file provided / File kunci privat DOKU tidak disediakan"
    info "You can add it later: echo -n 'KEY' | gcloud secrets create DOKU_PRIVATE_KEY --data-file=-"
  fi

  echo ""
  success "Step 7 complete: All secrets configured / Semua secrets dikonfigurasi"
else
  echo -e "\n  ${DIM}⏭ Step 7: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 8: VPC CONNECTOR
# =============================================================================
if should_run_step 8; then
  step_header 8 "VPC Connector Setup / Setup VPC Connector"

  confirm "Create VPC Serverless Connector? (~$7-15/month) / Buat VPC Connector?" "y"

  echo ""
  info "Creating VPC connector: ${VPC_CONNECTOR_NAME}..."
  info "Using range: ${VPC_CONNECTOR_RANGE} (outside 10.0.0.0/8 to avoid peering conflict)"

  if resource_exists vpc_connector "$VPC_CONNECTOR_NAME"; then
    warn "VPC connector '${VPC_CONNECTOR_NAME}' already exists / VPC connector sudah ada"

    # Show current config / Tampilkan konfigurasi saat ini
    info "Current connector configuration / Konfigurasi connector saat ini:"
    gcloud compute networks vpc-access connectors describe "$VPC_CONNECTOR_NAME" \
      --region="$REGION" --format='table(ipCidrRange,minInstances,maxInstances,state)' 2>/dev/null || true
  else
    # Try to create VPC connector
    # NOTE: If this fails with internal error, delete any partial connector first:
    #   gcloud compute networks vpc-access connectors delete ${VPC_CONNECTOR_NAME} --region=${REGION} --quiet
    run_cmd "Creating VPC connector (this takes 2-5 minutes)..." \
      "gcloud compute networks vpc-access connectors create ${VPC_CONNECTOR_NAME} \
        --region=${REGION} \
        --network=${VPC_NETWORK_NAME} \
        --range=${VPC_CONNECTOR_RANGE} \
        --min-instances=2 \
        --max-instances=10 \
        --machine-type=e2-micro \
        --quiet"

    # Wait for connector to be ready / Tunggu connector siap
    info "Waiting for VPC connector to become ready... / Menunggu VPC connector siap..."

    for i in $(seq 1 30); do
      local_conn_state=$(gcloud compute networks vpc-access connectors describe "$VPC_CONNECTOR_NAME" \
        --region="$REGION" --format='value(state)' 2>/dev/null || echo "PENDING")
      if [ "$local_conn_state" = "READY" ]; then
        success "VPC connector is ready! / VPC connector siap!"
        break
      fi
      printf "\r  ${CYAN}⏳ Waiting... state=%s (%d/30)${NC}  " "$local_conn_state" "$i"
      sleep 10
    done
    echo ""

    local_conn_state=$(gcloud compute networks vpc-access connectors describe "$VPC_CONNECTOR_NAME" \
      --region="$REGION" --format='value(state)' 2>/dev/null || echo "UNKNOWN")
    if [ "$local_conn_state" != "READY" ]; then
      error "VPC connector not ready (state: ${local_conn_state})"
      exit 1
    fi
  fi

  echo ""
  info "VPC Connector Details / Detail VPC Connector:"
  echo -e "    Name:    ${BOLD}${VPC_CONNECTOR_NAME}${NC}"
  echo -e "    Region:  ${BOLD}${REGION}${NC}"
  echo -e "    Range:   ${BOLD}${VPC_CONNECTOR_RANGE}${NC}"
  echo -e "    Network: ${BOLD}${VPC_NETWORK_NAME}${NC}"
  echo ""
  info "This connector allows Cloud Run to access:"
  info "Connector ini memungkinkan Cloud Run mengakses:"
  echo -e "    → Cloud SQL (private IP)"
  echo -e "    → Memorystore Redis (private IP)"

  success "Step 8 complete: VPC connector ready / VPC connector siap"
else
  echo -e "\n  ${DIM}⏭ Step 8: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 9: DOCKER BUILD & ARTIFACT REGISTRY
# =============================================================================
if should_run_step 9; then
  step_header 9 "Docker Build & Artifact Registry / Build Docker & Registry"

  confirm "Build Docker images and push to Artifact Registry? / Build dan push Docker?" "y"

  # ── 9.1 Check Docker is available / Cek Docker tersedia ──────────────────
  if ! command -v docker &> /dev/null; then
    error "Docker is not installed! Required for this step."
    error "Docker tidak terinstall! Diperlukan untuk langkah ini."
    exit 1
  fi

  # ── 9.2 Create Artifact Registry repository / Buat repository ────────────
  echo ""
  info "Setting up Artifact Registry... / Mengatur Artifact Registry..."

  if resource_exists artifact_repo "$ARTIFACT_REPO"; then
    success "Artifact Registry '${ARTIFACT_REPO}' already exists / Repository sudah ada"
  else
    run_cmd_tol "Creating Artifact Registry repository / Membuat repository" \
      "gcloud artifacts repositories create ${ARTIFACT_REPO} \
        --repository-format=docker \
        --location=${REGION} \
        --description='SeleEvent Docker Images' \
        --quiet"
    success "Artifact Registry created / Repository berhasil dibuat"
  fi

  # ── 9.3 Configure Docker auth / Konfigurasi autentikasi Docker ──────────
  run_cmd "Configuring Docker authentication / Mengkonfigurasi autentikasi Docker" \
    "gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet"

  # ── 9.4 Build images / Build image Docker ────────────────────────────────
  local_tag=$(git rev-parse --short HEAD 2>/dev/null || echo "manual-$(date +%Y%m%d-%H%M%S)")
  local_ar_path="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"

  echo ""
  info "Building Docker images with tag: ${local_tag}..."

  # Detect which Dockerfiles exist / Deteksi Dockerfile yang ada
  local_build_frontend=false
  local_build_backend=false

  if [ -f "Dockerfile.frontend" ]; then
    local_build_frontend=true
    info "Found Dockerfile.frontend — will build frontend"
  fi
  if [ -f "backend/Dockerfile" ]; then
    local_build_backend=true
    info "Found backend/Dockerfile — will build backend"
  fi

  # Ask for build-time variables / Tanya variabel build-time
  echo ""
  ask_input "Backend API URL (for frontend build) / URL API Backend" BACKEND_URL ""
  ask_input "Google OAuth Client ID / ID Klien OAuth Google" GOOGLE_CLIENT_ID ""
  ask_input "DOKU Client ID (for NEXT_PUBLIC) / ID Klien DOKU" DOKU_CLIENT_ID_BUILD "${DOKU_CLIENT_ID}"

  # ── Build Frontend / Build Frontend ──────────────────────────────────────
  if [ "$local_build_frontend" = true ]; then
    echo ""
    info "Building frontend Docker image... / Membangun image frontend..."

    local_frontend_tag="${local_ar_path}/selevent-web:${local_tag}"
    local_frontend_latest="${local_ar_path}/selevent-web:latest"

    run_cmd "docker build frontend" \
      "docker build \
        -f Dockerfile.frontend \
        -t ${local_frontend_tag} \
        -t ${local_frontend_latest} \
        --build-arg=NEXT_PUBLIC_API_URL=${BACKEND_URL} \
        --build-arg=NEXT_PUBLIC_DOKU_CLIENT_ID=${DOKU_CLIENT_ID_BUILD} \
        --build-arg=NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
        ."

    run_cmd "Pushing frontend image: ${local_tag}" \
      "docker push ${local_frontend_tag}"
    run_cmd "Pushing frontend image: latest" \
      "docker push ${local_frontend_latest}"

    success "Frontend image pushed to ${local_ar_path}/selevent-web"
  else
    warn "Dockerfile.frontend not found — skipping frontend build"
  fi

  # ── Build Backend / Build Backend ────────────────────────────────────────
  if [ "$local_build_backend" = true ]; then
    echo ""
    info "Building backend Docker image... / Membangun image backend..."

    local_backend_tag="${local_ar_path}/selevent-api:${local_tag}"
    local_backend_latest="${local_ar_path}/selevent-api:latest"

    run_cmd "docker build backend" \
      "docker build \
        -f backend/Dockerfile \
        -t ${local_backend_tag} \
        -t ${local_backend_latest} \
        --build-arg=VERSION=${local_tag} \
        ."

    run_cmd "Pushing backend image: ${local_tag}" \
      "docker push ${local_backend_tag}"
    run_cmd "Pushing backend image: latest" \
      "docker push ${local_backend_latest}"

    success "Backend image pushed to ${local_ar_path}/selevent-api"
  else
    warn "backend/Dockerfile not found — skipping backend build"
  fi

  echo ""
  info "Artifact Registry URLs / URL Artifact Registry:"
  echo -e "    Registry:  ${BOLD}${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}${NC}"
  echo -e "    Frontend:  ${BOLD}${local_ar_path}/selevent-web:${local_tag}${NC}"
  echo -e "    Backend:   ${BOLD}${local_ar_path}/selevent-api:${local_tag}${NC}"

  success "Step 9 complete: Docker images built & pushed / Image Docker dibangun & di-push"
else
  echo -e "\n  ${DIM}⏭ Step 9: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 10: CLOUD RUN DEPLOY
# =============================================================================
if should_run_step 10; then
  step_header 10 "Cloud Run Deployment / Deployment Cloud Run"

  confirm "Deploy to Cloud Run with full configuration? / Deploy ke Cloud Run?" "y"

  # ── 10.1 Setup Service Account / Setup Akun Layanan ──────────────────────
  echo ""
  info "Setting up IAM Service Account... / Mengatur Akun Layanan IAM..."

  if resource_exists service_account "$SA_NAME"; then
    success "Service account '${SA_NAME}' already exists / Akun layanan sudah ada"
  else
    run_cmd_tol "Creating service account / Membuat akun layanan" \
      "gcloud iam service-accounts create ${SA_NAME} \
        --display-name='SeleEvent Cloud Run Service Account' \
        --quiet"
  fi

  local_sa_email="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

  # Grant required roles / Berikan role yang diperlukan
  ROLES=(
    "roles/cloudsql.client"
    "roles/cloudsql.instanceUser"
    "roles/secretmanager.secretAccessor"
    "roles/storage.objectAdmin"
    "roles/logging.logWriter"
    "roles/monitoring.metricWriter"
    "roles/errorreporting.writer"
  )

  info "Granting ${#ROLES[@]} IAM roles to service account... / Memberikan ${#ROLES[@]} role..."

  for role in "${ROLES[@]}"; do
    run_cmd_tol "Granting role ${role}" \
      "gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member='serviceAccount:${local_sa_email}' \
        --role='${role}' \
        --quiet 2>/dev/null"
  done

  # ── 10.2 Determine image tags / Tentukan tag image ──────────────────────
  local_tag=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
  local_ar_path="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"
  local_cloudsql_conn="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"

  # ── 10.3 Build secrets mapping / Bangun mapping secrets ──────────────────
  local_secrets_map=""
  local_secret_list=("DATABASE_URL" "REDIS_URL" "JWT_SECRET" "NEXTAUTH_SECRET")

  if resource_exists secret "DOKU_CLIENT_ID"; then
    local_secret_list+=("DOKU_CLIENT_ID")
  fi
  if resource_exists secret "DOKU_SHARED_KEY"; then
    local_secret_list+=("DOKU_SHARED_KEY")
  fi
  if resource_exists secret "DOKU_PRIVATE_KEY"; then
    local_secret_list+=("DOKU_PRIVATE_KEY")
  fi

  # Build --set-secrets flag / Bangun flag --set-secrets
  local_secrets_parts=()
  for sec in "${local_secret_list[@]}"; do
    local_secrets_parts+=("${sec}=${sec}:latest")
  done
  local_secrets_map=$(IFS=','; echo "${local_secrets_parts[*]}")

  # ── 10.4 Build environment variables / Bangun variabel lingkungan ────────
  local_env_vars="NODE_ENV=production,REGION=${REGION},PROJECT_ID=${PROJECT_ID}"

  # ── 10.5 Deploy Backend / Deploy Backend ─────────────────────────────────
  echo ""
  info "Deploying backend to Cloud Run... / Deploy backend ke Cloud Run..."

  local_backend_image="${local_ar_path}/selevent-api:${local_tag}"

  # Check if image exists in registry / Cek apakah image ada di registry
  if [ "$DRY_RUN" != true ]; then
    if gcloud artifacts docker images describe "$local_backend_image" 2>/dev/null; then
      success "Backend image found in registry / Image backend ditemukan di registry"
    else
      warn "Backend image '${local_tag}' not found in registry, trying 'latest'"
      local_backend_image="${local_ar_path}/selevent-api:latest"
      if ! gcloud artifacts docker images describe "$local_backend_image" 2>/dev/null; then
        error "No backend image found! Run Step 9 first."
        error "Image backend tidak ditemukan! Jalankan Step 9 terlebih dahulu."
        exit 1
      fi
    fi
  fi

  local_cloudsql_flag=""
  if resource_exists sql_instance "$DB_INSTANCE_NAME"; then
    local_cloudsql_flag="--add-cloudsql-instances=${local_cloudsql_conn}"
    info "Cloud SQL connection: ${local_cloudsql_conn}"
  else
    warn "Cloud SQL instance not found — deploying without Cloud SQL connector"
    warn "Instance Cloud SQL tidak ditemukan — deploy tanpa connector Cloud SQL"
  fi

  run_cmd "Deploying selevent-api to Cloud Run..." \
    "gcloud run deploy selevent-api \
      --image=${local_backend_image} \
      --region=${REGION} \
      --platform=managed \
      --cpu=2 \
      --memory=4Gi \
      --min-instances=2 \
      --max-instances=100 \
      --concurrency=200 \
      --timeout=60 \
      --port=8080 \
      --no-cpu-throttling \
      --vpc-connector=${VPC_CONNECTOR_NAME} \
      ${local_cloudsql_flag} \
      --set-env-vars='${local_env_vars}' \
      --set-secrets='${local_secrets_map}' \
      --service-account=${local_sa_email} \
      --allow-unauthenticated \
      --quiet"

  # ── 10.6 Deploy Frontend / Deploy Frontend ───────────────────────────────
  echo ""
  info "Deploying frontend to Cloud Run... / Deploy frontend ke Cloud Run..."

  local_frontend_image="${local_ar_path}/selevent-web:${local_tag}"

  # Check if image exists in registry / Cek apakah image ada di registry
  if [ "$DRY_RUN" != true ]; then
    if gcloud artifacts docker images describe "$local_frontend_image" 2>/dev/null; then
      success "Frontend image found in registry / Image frontend ditemukan di registry"
    else
      warn "Frontend image '${local_tag}' not found in registry, trying 'latest'"
      local_frontend_image="${local_ar_path}/selevent-web:latest"
      if ! gcloud artifacts docker images describe "$local_frontend_image" 2>/dev/null; then
        warn "No frontend image found — skipping frontend deployment"
        warn "Image frontend tidak ditemukan — lewati deployment frontend"
      fi
    fi
  fi

  if [ "$DRY_RUN" = true ] || gcloud artifacts docker images describe "$local_frontend_image" &>/dev/null; then
    # Frontend secrets (subset) / Secrets frontend (subset)
    local_frontend_secrets=""
    if resource_exists secret "DOKU_SHARED_KEY"; then
      local_frontend_secrets="DOKU_SHARED_KEY=DOKU_SHARED_KEY:latest"
    fi

    local_frontend_env="NODE_ENV=production"

    run_cmd "Deploying selevent-web to Cloud Run..." \
      "gcloud run deploy selevent-web \
        --image=${local_frontend_image} \
        --region=${REGION} \
        --platform=managed \
        --cpu=1 \
        --memory=512Mi \
        --min-instances=1 \
        --max-instances=100 \
        --concurrency=80 \
        --timeout=300 \
        --port=3000 \
        --vpc-connector=${VPC_CONNECTOR_NAME} \
        --set-env-vars='${local_frontend_env}' \
        --set-secrets='${local_frontend_secrets}' \
        --service-account=${local_sa_email} \
        --allow-unauthenticated \
        --quiet"
  fi

  # ── 10.7 Display service URLs / Tampilkan URL layanan ───────────────────
  echo ""
  info "Cloud Run Service URLs / URL Layanan Cloud Run:"
  echo ""

  local_api_url=$(gcloud run services describe selevent-api \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "N/A")
  local_web_url=$(gcloud run services describe selevent-web \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "N/A")

  echo -e "    Backend API:  ${BOLD}${CYAN}${local_api_url}${NC}"
  echo -e "    Frontend:     ${BOLD}${CYAN}${local_web_url}${NC}"

  success "Step 10 complete: Cloud Run deployment finished / Deployment Cloud Run selesai"
else
  echo -e "\n  ${DIM}⏭ Step 10: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 11: CUSTOM DOMAIN
# =============================================================================
if should_run_step 11; then
  step_header 11 "Custom Domain Setup / Setup Domain Kustom"

  ask_input "Enter your custom domain (or Enter to skip) / Masukkan domain kustom" DOMAIN_NAME ""

  if [ -z "$DOMAIN_NAME" ]; then
    warn "No domain provided — skipping custom domain setup"
    warn "Tidak ada domain — lewati setup domain kustom"
    success "Step 11 skipped: Using default run.app URLs / Menggunakan URL run.app default"
  else
    confirm "Setup custom domain: ${DOMAIN_NAME}? / Setup domain kustom?" "y"

    # ── 11.1 Map domain to frontend / Map domain ke frontend ────────────────
    echo ""
    info "Creating domain mapping for frontend... / Membuat domain mapping untuk frontend..."

    run_cmd_tol "Mapping domain to selevent-web" \
      "gcloud beta run domain-mappings create \
        --service=selevent-web \
        --domain=${DOMAIN_NAME} \
        --region=${REGION} \
        --quiet"

    # ── 11.2 Map API subdomain to backend / Map subdomain API ke backend ────
    local_api_domain="api.${DOMAIN_NAME}"
    info "Creating domain mapping for backend (${local_api_domain})..."

    run_cmd_tol "Mapping domain to selevent-api" \
      "gcloud beta run domain-mappings create \
        --service=selevent-api \
        --domain=${local_api_domain} \
        --region=${REGION} \
        --quiet"

    # ── 11.3 Display DNS instructions / Tampilkan instruksi DNS ────────────
    echo ""
    echo -e "  ${BOLD}━━━ DNS Configuration Required / Konfigurasi DNS Diperlukan ━━━${NC}"
    echo ""
    echo -e "  ${YELLOW}Add the following records to your DNS provider:${NC}"
    echo -e "  ${YELLOW}Tambahkan record berikut ke provider DNS Anda:${NC}"
    echo ""

    # Get the DNS records from domain mapping / Dapatkan record DNS dari mapping
    local_dns_a=$(gcloud beta run domain-mappings describe \
      --service=selevent-web --domain="$DOMAIN_NAME" --region="$REGION" \
      --format='value(status.resourceRecords[0].rrdata)' 2>/dev/null || echo "RETRIEVE_FROM_CONSOLE")
    local_dns_cname=$(gcloud beta run domain-mappings describe \
      --service=selevent-web --domain="$DOMAIN_NAME" --region="$REGION" \
      --format='value(status.resourceRecords[1].rrdata)' 2>/dev/null || echo "RETRIEVE_FROM_CONSOLE")

    echo -e "  ${BOLD}Record untuk ${DOMAIN_NAME} (Frontend):${NC}"
    echo -e "    Type:  ${BOLD}A${NC}"
    echo -e "    Name:  ${BOLD}@${NC}  (or ${DOMAIN_NAME})"
    echo -e "    Value: ${BOLD}${local_dns_a}${NC}"
    echo ""
    echo -e "    Type:  ${BOLD}CNAME${NC}"
    echo -e "    Name:  ${BOLD}www${NC}"
    echo -e "    Value: ${BOLD}${local_dns_cname}${NC}"
    echo ""
    echo -e "  ${BOLD}Record untuk ${local_api_domain} (Backend API):${NC}"
    echo -e "    Type:  ${BOLD}CNAME${NC}"
    echo -e "    Name:  ${BOLD}api${NC}"
    echo -e "    Value: ${BOLD}${local_dns_cname}${NC}"
    echo ""

    echo -e "  ${DIM}Note: SSL certificate will be automatically provisioned by Google${NC}"
    echo -e "  ${DIM}Catatan: Sertifikat SSL akan otomatis di-provision oleh Google${NC}"
    echo -e "  ${DIM}Note: DNS propagation may take up to 48 hours (usually 5-15 minutes)${NC}"
    echo -e "  ${DIM}Catatan: Propagasi DNS bisa memakan waktu hingga 48 jam (biasanya 5-15 menit)${NC}"

    echo ""
    info "Verify domain mapping status:"
    info "Verifikasi status domain mapping:"
    echo "    gcloud beta run domain-mappings list --region=${REGION}"

    success "Step 11 complete: Custom domain configured / Domain kustom dikonfigurasi"
  fi
else
  echo -e "\n  ${DIM}⏭ Step 11: Skipped / Dilewati${NC}"
fi

# =============================================================================
# STEP 12: MONITORING & UPTIME CHECK
# =============================================================================
if should_run_step 12; then
  step_header 12 "Monitoring & Uptime Check / Monitoring & Cek Uptime"

  confirm "Setup monitoring and uptime checks? / Setup monitoring dan uptime check?" "y"

  # ── 12.1 Get service URL / Dapatkan URL layanan ──────────────────────────
  local_monitor_url=$(gcloud run services describe selevent-web \
    --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")

  if [ -z "$local_monitor_url" ]; then
    warn "No Cloud Run service found — cannot setup monitoring"
    warn "Layanan Cloud Run tidak ditemukan — tidak bisa setup monitoring"
    success "Step 12 skipped"
  else
    # ── 12.2 Create Uptime Check / Buat Uptime Check ──────────────────────
    echo ""
    info "Creating uptime check for ${local_monitor_url}..."

    local_uptime_name="selevent-uptime-$(date +%Y%m%d)"

    run_cmd_tol "Creating uptime check / Membuat uptime check" \
      "gcloud monitoring uptime-check-configs create ${local_uptime_name} \
        --display-name='SeleEvent Web Uptime' \
        --resource-type=uptime-url \
        --hostname=${local_monitor_url} \
        --path=/ \
        --check-interval=60s \
        --timeout=10s \
        --project=${PROJECT_ID} \
        --quiet"

    # ── 12.3 Create Alert Policy / Buat Kebijakan Alert ───────────────────
    echo ""
    info "Creating alert policy for uptime..."

    # Ask for notification email / Tanya email notifikasi
    ask_input "Notification email for alerts (or Enter to skip) / Email notifikasi" NOTIFICATION_EMAIL ""

    if [ -n "$NOTIFICATION_EMAIL" ]; then
      # Create notification channel / Buat channel notifikasi
      run_cmd_tol "Creating notification channel / Membuat channel notifikasi" \
        "gcloud beta monitoring channels create \
          --display-name='SeleEvent Alerts' \
          --type=email \
          --channel-labels=email_address=${NOTIFICATION_EMAIL} \
          --quiet 2>/dev/null"

      # Get channel ID / Dapatkan ID channel
      local_channel_id=$(gcloud beta monitoring channels list \
        --filter="displayName='SeleEvent Alerts'" \
        --format='value(name)' 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "")

      if [ -n "$local_channel_id" ]; then
        info "Notification channel ID: ${local_channel_id}"
      fi

      # Note: Creating full alert policies via gcloud is complex
      # Best done via Console: https://console.cloud.google.com/monitoring/alerting
      echo ""
      warn "For advanced alerting configuration, use the Cloud Console:"
      warn "Untuk konfigurasi alerting lanjutan, gunakan Cloud Console:"
      echo -e "    🔗 https://console.cloud.google.com/monitoring/alerting?project=${PROJECT_ID}"
    fi

    # ── 12.4 Enable Cloud Run metrics logging / Aktifkan logging metrik ────
    echo ""
    info "Cloud Run automatically sends metrics to Cloud Monitoring."
    info "Cloud Run otomatis mengirim metrik ke Cloud Monitoring."
    echo ""
    info "Available metrics / Metrik yang tersedia:"
    echo -e "    • Request count (by status code) / Jumlah request (per kode status)"
    echo -e "    • Request latency (percentiles) / Latensi request (persentil)"
    echo -e "    • Container memory usage / Penggunaan memori container"
    echo -e "    • Container CPU usage / Penggunaan CPU container"
    echo -e "    • Instance count / Jumlah instance"
    echo ""

    # ── 12.5 Setup logging sink (optional) / Setup logging sink (opsional) ─
    info "Creating log-based metric for 5xx errors..."
    info "Membuat metrik berbasis log untuk error 5xx..."

    run_cmd_tol "Creating error log metric / Membuat metrik log error" \
      "gcloud logging metrics create selevent-5xx-errors \
        --description='Count of 5xx errors from Cloud Run' \
        --filter='resource.type=\"cloud_run_revision\" AND severity>=ERROR' \
        --project=${PROJECT_ID} \
        --quiet"

    success "Step 12 complete: Monitoring configured / Monitoring dikonfigurasi"
  fi
else
  echo -e "\n  ${DIM}⏭ Step 12: Skipped / Dilewati${NC}"
fi

# =============================================================================
# FINAL SUMMARY / RINGKASAN AKHIR
# =============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                              ║${NC}"
echo -e "${BOLD}${GREEN}║           🎉 SELEVENT — GCP Deployment Complete!                        ║${NC}"
echo -e "${GREEN}║                                                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

local_elapsed=$(elapsed_time)
echo -e "  ${BOLD}Total Time / Waktu Total:${NC}  ${local_elapsed}"
echo ""

# ── Resources Created / Resource yang Dibuat ──────────────────────────────
echo -e "  ${BOLD}${CYAN}━━━ Resources Summary / Ringkasan Resource ━━━${NC}"
echo ""

echo -e "  ${BOLD}Infrastructure / Infrastruktur:${NC}"
echo -e "    Project:        ${BOLD}${PROJECT_ID}${NC}"
echo -e "    Region:         ${BOLD}${REGION}${NC}"
echo -e "    VPC Network:    ${BOLD}${VPC_NETWORK_NAME}${NC}"
echo -e "    VPC Connector:  ${BOLD}${VPC_CONNECTOR_NAME}${NC}"
echo ""

if resource_exists sql_instance "$DB_INSTANCE_NAME"; then
  echo -e "  ${BOLD}Database:${NC}"
  echo -e "    Cloud SQL:     ${BOLD}${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}${NC} (PostgreSQL 16)"
  echo -e "    Database:      ${BOLD}${DB_NAME}${NC}"
  echo -e "    User:          ${BOLD}${DB_USER}${NC}"
  echo ""
fi

if resource_exists redis "$REDIS_NAME"; then
  echo -e "  ${BOLD}Cache:${NC}"
  echo -e "    Redis:         ${BOLD}${REDIS_NAME}${NC} (${REDIS_TIER}, ${REDIS_MEMORY}GB)"
  local_redis_host=$(gcloud redis instances describe "$REDIS_NAME" \
    --region="$REGION" --format='value(host)' 2>/dev/null || echo "N/A")
  echo -e "    Redis Host:    ${BOLD}${local_redis_host}${NC}"
  echo ""
fi

echo -e "  ${BOLD}Storage:${NC}"
for bucket_name in selevent-assets selevent-qrcodes selevent-withdrawal-proof selevent-avatars; do
  if resource_exists bucket "$bucket_name"; then
    echo -e "    ✔ gs://${bucket_name}"
  fi
done
echo ""

echo -e "  ${BOLD}Secrets:${NC}"
for secret_name in DATABASE_URL REDIS_URL JWT_SECRET NEXTAUTH_SECRET DOKU_CLIENT_ID DOKU_SHARED_KEY DOKU_PRIVATE_KEY; do
  if resource_exists secret "$secret_name"; then
    echo -e "    ✔ ${secret_name}"
  fi
done
echo ""

echo -e "  ${BOLD}Services / Layanan:${NC}"
local_api_url=$(gcloud run services describe selevent-api \
  --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "Not deployed")
local_web_url=$(gcloud run services describe selevent-web \
  --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "Not deployed")

echo -e "    Backend API:  ${BOLD}${CYAN}${local_api_url}${NC}"
echo -e "    Frontend:     ${BOLD}${CYAN}${local_web_url}${NC}"
echo ""

echo -e "  ${BOLD}Artifact Registry:${NC}"
echo -e "    Repository:   ${BOLD}${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}${NC}"
echo ""

# ── Next Steps / Langkah Selanjutnya ──────────────────────────────────────
echo -e "  ${BOLD}${YELLOW}━━━ Next Steps / Langkah Selanjutnya ━━━${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} Verify deployment / Verifikasi deployment:"
echo "     curl -f ${local_web_url}"
echo "     curl -f ${local_api_url}/health"
echo ""
echo -e "  ${YELLOW}2.${NC} Run database migrations / Jalankan migrasi database:"
echo "     gcloud run jobs execute seed-data --region=${REGION} --wait"
echo ""
echo -e "  ${YELLOW}3.${NC} Configure DOKU webhook URL / Konfigurasi URL webhook DOKU:"
echo "     ${local_api_url}/api/doku/notification"
echo ""
echo -e "  ${YELLOW}4.${NC} Setup custom domain DNS records / Setup record DNS domain kustom"
echo ""
echo -e "  ${YELLOW}5.${NC} Test payment flow end-to-end / Test alur pembayaran"
echo ""
echo -e "  ${YELLOW}6.${NC} Setup monitoring alerts / Setup alert monitoring:"
echo "     https://console.cloud.google.com/monitoring?project=${PROJECT_ID}"
echo ""

# ── Useful Commands / Perintah Berguna ────────────────────────────────────
echo -e "  ${BOLD}${DIM}━━━ Useful Commands / Perintah Berguna ━━━${NC}"
echo ""
echo -e "  ${DIM}# View logs / Lihat log:${NC}"
echo "  gcloud run services logs read selevent-api --region=${REGION} --limit=50"
echo "  gcloud run services logs read selevent-web --region=${REGION} --limit=50"
echo ""
echo -e "  ${DIM}# Check service status / Cek status layanan:${NC}"
echo "  gcloud run services describe selevent-api --region=${REGION}"
echo "  gcloud run services describe selevent-web --region=${REGION}"
echo ""
echo -e "  ${DIM}# Connect to database / Koneksi ke database:${NC}"
echo "  gcloud sql connect ${DB_INSTANCE_NAME} --user=${DB_USER} --database=${DB_NAME}"
echo ""
echo -e "  ${DIM}# Rollback / Kembalikan:${NC}"
echo "  gcloud run revisions list --service=selevent-api --region=${REGION}"
echo "  gcloud run services update-traffic selevent-api --to-revisions=REVISION=100 --region=${REGION}"
echo ""
echo -e "  ${DIM}# Redeploy specific step / Redeploy step tertentu:${NC}"
echo "  ./deploy-gcp.sh --step 9    # Rebuild Docker images"
echo "  ./deploy-gcp.sh --step 10   # Redeploy Cloud Run"
echo ""
echo -e "  ${DIM}# Cost monitoring / Monitoring biaya:${NC}"
echo "  https://console.cloud.google.com/billing?project=${PROJECT_ID}"
echo ""

echo -e "  ${GREEN}Deployment complete at $(date '+%Y-%m-%d %H:%M:%S %Z') / Deployment selesai${NC}"
echo ""
