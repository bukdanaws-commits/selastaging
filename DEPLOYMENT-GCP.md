# 🚀 Panduan Deployment SELEVENT ke GCP Cloud Run
# Step-by-Step Lengkap — Dari Nol Sampai Production

---

## 📋 Prasyarat

Sebelum mulai, pastikan kamu sudah punya:

1. **Akun Google Cloud Platform (GCP)**
   - Daftar di https://console.cloud.google.com
   - Butuh kartu kredit untuk billing (akan di-charge minimal, bisa pakai free trial $300)

2. **Google Cloud CLI (gcloud)**
   - Install: https://cloud.google.com/sdk/docs/install
   - Atau pakai **Cloud Shell** di console (gratis, sudah include gcloud)

3. **Akun GitHub**
   - Source code ada di: `https://github.com/bukdanaws-commits/selamockc`
   - Branch: `doku` (branch aktif development)

4. **Akun DOKU (Sandbox atau Production)**
   - Sandbox: https://sandbox.doku.com
   - Production: https://dashboard.doku.com

---

## 🏗️ Arsitektur Target

```
User (Browser)
    │
    ▼
┌─────────────────────┐
│   Cloud CDN         │ ← Cache static assets + gambar
│   (Global Edge)     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Cloud Load Balancer│ ← SSL, routing
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌──────────────┐
│  CDN   │  │  Cloud Run   │ ← Next.js Frontend (port 3000)
│ Static │  │  selevent-web│ ← Auto-scale 0-100 instances
└────────┘  └──────┬───────┘
                    │
              ┌─────┴─────┐
              ▼           ▼
        ┌──────────┐ ┌──────────────┐
        │Cloud SQL │ │ Cloud Run    │
        │PostgreSQL│ │ selevent-api │ ← Go Backend (port 8080)
        │(HA, 4vCPU)│ │ Auto-scale   │
        └──────────┘ └──────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌──────┐ ┌──────────┐
│  GCS   │ │Redis │ │  Secret  │
│(Assets)│ │(Cache)│ │ Manager  │
└────────┘ └──────┘ └──────────┘
```

---

## 📝 STEP 1: Setup Google Cloud Project

### 1.1 Buat Project Baru

```bash
# Login ke GCP
gcloud auth login

# Buat project baru
gcloud projects create selevent-prod --name="Selevent Production"

# Set project aktif
gcloud config set project selevent-prod

# Enable billing (harus dilakukan di console)
# Buka: https://console.cloud.google.com/billing
# Link billing account ke project selevent-prod
```

### 1.2 Set Region

```bash
# Region Jakarta (terdekat untuk Indonesia)
gcloud config set compute/region asia-southeast2
gcloud config set compute/zone asia-southeast2-a
```

---

## 📝 STEP 2: Enable Required APIs

```bash
# Enable semua API yang dibutuhkan
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  vpcaccess.googleapis.com \
  cloudscheduler.googleapis.com \
  iam.googleapis.com \
  servicenetworking.googleapis.com \
  redis.googleapis.com
```

> ⏱️ Proses ini memakan waktu 2-5 menit.

---

## 📝 STEP 3: Setup Cloud SQL (PostgreSQL)

### 3.1 Buat Instance

```bash
# Buat Cloud SQL instance (PostgreSQL 16)
gcloud sql instances create selevent-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-4-16384 \
  --region=asia-southeast2 \
  --availability-type=regional \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03 \
  --database-flags=max_connections=200 \
  --no-assign-ip
```

| Parameter | Nilai | Keterangan |
|-----------|-------|-----------|
| `tier` | `db-custom-4-16384` | 4 vCPU, 16GB RAM |
| `availability-type` | `regional` | High Availability |
| `storage-size` | `20GB` | SSD, auto-increase |
| `max_connections` | `200` | PostgreSQL max connections |

### 3.2 Buat Database & User

```bash
# Tunggu instance ready (2-5 menit)
# Cek status:
gcloud sql instances describe selevent-db --format='value(state)'

# Buat database
gcloud sql databases create eventku --instance=selevent-db

# Buat user
gcloud sql users create eventku \
  --instance=selevent-db \
  --password=GANTI_INI_PASSWORD_KUAT_2024

# Simpan password di Secret Manager (langkah 5)
```

### 3.3 Setup Private IP / VPC Connector

```bash
# Cloud Run perlu akses ke Cloud SQL
# Buat Serverless VPC Connector
gcloud compute networks vpc-access connectors create selevent-connector \
  --region=asia-southeast2 \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10

# Atau gunakan Private IP (lebih recommended untuk production):
# Buat VPC network
gcloud compute networks create selevent-vpc \
  --subnet-mode=custom

# Buat private service connection (untuk Cloud SQL Private IP)
gcloud services enable servicenetworking.googleapis.com
gcloud compute addresses create google-managed-services \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=selevent-vpc

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services \
  --network=selevent-vpc

# Update Cloud SQL untuk pakai Private IP
gcloud sql instances patch selevent-db \
  --network=selevent-vpc \
  --no-assign-ip
```

---

## 📝 STEP 4: Setup Cloud Storage (GCS)

### 4.1 Buat Buckets

```bash
# Bucket untuk event assets (images, banners)
gsutil mb -l asia-southeast2 gs://selevent-assets

# Bucket untuk QR codes
gsutil mb -l asia-southeast2 gs://selevent-qrcodes

# Bucket untuk bukti transfer withdrawal
gsutil mb -l asia-southeast2 gs://selevent-withdrawal-proof

# Bucket untuk user avatars
gsutil mb -l asia-southeast2 gs://selevent-avatars

# Set lifecycle (hapus QR code setelah 90 hari)
cat > qr-lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF
gsutil lifecycle set qr-lifecycle.json gs://selevent-qrcodes

# Set CORS policy untuk bucket assets
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Cache-Control"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set cors.json gs://selevent-assets
gsutil cors set cors.json gs://selevent-qrcodes
```

### 4.2 Set Public Access (untuk images)

```bash
# Buat bucket assets public-readable
gsutil iam ch allUsers:objectViewer gs://selevent-assets
gsutil iam ch allUsers:objectViewer gs://selevent-qrcodes
gsutil iam ch allUsers:objectViewer gs://selevent-avatars

# JANGAN buat withdrawal bucket public!
```

---

## 📝 STEP 5: Setup Secret Manager

### 5.1 Simpan Semua Secrets

```bash
# ── Database Password ─────────────────────────────────────────
echo -n "GANTI_INI_PASSWORD_KUAT_2024" | \
  gcloud secrets create database-password --data-file=-

# ── DOKU Credentials ──────────────────────────────────────────
echo -n "your_doku_client_secret" | \
  gcloud secrets create doku-client-secret --data-file=-

echo -n "your_doku_shared_key" | \
  gcloud secrets create doku-shared-key --data-file=-

# DOKU RSA Private Key (bukan path, tapi konten PEM-nya)
cat keys/doku-private.pem | \
  gcloud secrets create doku-private-key --data-file=-

# ── JWT Secrets ────────────────────────────────────────────────
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create refresh-jwt-secret --data-file=-

# ── Google OAuth ──────────────────────────────────────────────
echo -n "your_google_client_secret" | \
  gcloud secrets create google-client-secret --data-file=-
```

### 5.2 Verifikasi Secrets

```bash
# List semua secrets
gcloud secrets list

# Test akses secret
gcloud secrets versions access latest --secret=database-password
```

---

## 📝 STEP 6: Setup Artifact Registry

### 6.1 Buat Repository

```bash
# Buat Docker repository
gcloud artifacts repositories create eventku \
  --repository-format=docker \
  --location=asia-southeast2 \
  --description="Selevent Docker Images"

# Verifikasi
gcloud artifacts repositories list
```

### 6.2 Configure Docker Auth

```bash
# Authorize Docker untuk push ke Artifact Registry
gcloud auth configure-docker asia-southeast2-docker.pkg.dev
```

---

## 📝 STEP 7: Setup IAM Service Account

### 7.1 Buat Service Account

```bash
# Buat service account untuk Cloud Run
gcloud iam service-accounts create selevent-sa \
  --display-name="Selevent Cloud Run Service Account"
```

### 7.2 Berikan IAM Roles

```bash
PROJECT_ID=$(gcloud config get-value project)

# Cloud SQL Client
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:selevent-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Secret Manager Secret Accessor
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:selevent-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Storage Object Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:selevent-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Cloud Run Invoker (untuk service-to-service)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:selevent-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Logging & Monitoring
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:selevent-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:selevent-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"
```

---

## 📝 STEP 8: Build & Push Docker Images

### 8.1 Clone Repository

```bash
# Clone branch doku
cd ~
git clone -b doku https://github.com/bukdanaws-commits/selamockc.git selevent
cd selevent
```

### 8.2 Build Frontend Image

```bash
# Build Docker image
PROJECT_ID=$(gcloud config get-value project)
REGION=asia-southeast2
TAG=$(git rev-parse --short HEAD)

docker build \
  -f Dockerfile.frontend \
  -t $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-web:$TAG \
  -t $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-web:latest \
  --build-arg=NEXT_PUBLIC_API_URL=https://selevent-api-xxxxx.a.run.app \
  --build-arg=NEXT_PUBLIC_USE_MOCK=false \
  --build-arg=NEXT_PUBLIC_DOKU_ENVIRONMENT=production \
  --build-arg=NEXT_PUBLIC_DOKU_CLIENT_ID=MCH-XXXX-YOUR_REAL_ID \
  --build-arg=NEXT_PUBLIC_DOKU_API_BASE_URL=https://api.doku.com \
  --build-arg=NEXT_PUBLIC_DOKU_CHECKOUT_URL=https://checkout.doku.com \
  --build-arg=NEXT_PUBLIC_DOKU_NOTIFICATION_URL=https://yourdomain.com/api/doku/notification \
  --build-arg=NEXT_PUBLIC_DOKU_FINISH_URL=https://yourdomain.com/payment/success \
  --build-arg=NEXT_PUBLIC_DOKU_ERROR_URL=https://yourdomain.com/payment/failed \
  --build-arg=NEXT_PUBLIC_DOKU_UNPAYMENT_URL=https://yourdomain.com/payment/pending \
  --build-arg=NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_real_google_client_id \
  .

# Push ke Artifact Registry
docker push $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-web:$TAG
docker push $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-web:latest
```

### 8.3 Build Backend Image

```bash
docker build \
  -f backend/Dockerfile \
  -t $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-api:$TAG \
  -t $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-api:latest \
  --build-arg=VERSION=$TAG \
  .

docker push $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-api:$TAG
docker push $REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-api:latest
```

---

## 📝 STEP 9: Deploy ke Cloud Run

### 9.1 Deploy Backend API

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=asia-southeast2
TAG=$(git rev-parse --short HEAD)

gcloud run deploy selevent-api \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-api:$TAG \
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
  --add-cloudsql-instances=$PROJECT_ID:asia-southeast2:selevent-db \
  --set-env-vars="\
APP_ENV=production,\
DB_DRIVER=postgres,\
DB_HOST=/cloudsql/$PROJECT_ID:asia-southeast2:selevent-db,\
DB_NAME=eventku,\
DB_USER=eventku,\
DB_PORT=5432,\
DB_SSLMODE=require,\
GOOGLE_CLIENT_ID=your_real_google_client_id,\
DOKU_ENVIRONMENT=production,\
DOKU_API_BASE_URL=https://api.doku.com" \
  --set-secrets="\
DB_PASSWORD=database-password:latest,\
JWT_SECRET=jwt-secret:latest,\
REFRESH_JWT_SECRET=refresh-jwt-secret:latest,\
GOOGLE_CLIENT_SECRET=google-client-secret:latest,\
DOKU_CLIENT_SECRET=doku-client-secret:latest,\
DOKU_SHARED_KEY=doku-shared-key:latest,\
DOKU_PRIVATE_KEY=doku-private-key:latest" \
  --service-account=selevent-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated

# Simpan URL backend
BACKEND_URL=$(gcloud run services describe selevent-api --region=$REGION --format='value(status.url)')
echo "Backend URL: $BACKEND_URL"
```

### 9.2 Deploy Frontend Web

```bash
# Gunakan BACKEND_URL dari step sebelumnya
gcloud run deploy selevent-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/eventku/selevent-web:$TAG \
  --region=$REGION \
  --platform=managed \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=1 \
  --max-instances=100 \
  --concurrency=80 \
  --timeout=300 \
  --port=3000 \
  --set-env-vars="\
NODE_ENV=production,\
NEXT_PUBLIC_API_URL=$BACKEND_URL,\
NEXT_PUBLIC_USE_MOCK=false,\
NEXT_PUBLIC_DOKU_ENVIRONMENT=production,\
NEXT_PUBLIC_DOKU_API_BASE_URL=https://api.doku.com,\
NEXT_PUBLIC_DOKU_CHECKOUT_URL=https://checkout.doku.com,\
NEXT_PUBLIC_DOKU_CLIENT_ID=MCH-XXXX-YOUR_REAL_ID,\
NEXT_PUBLIC_DOKU_NOTIFICATION_URL=https://yourdomain.com/api/doku/notification,\
NEXT_PUBLIC_DOKU_FINISH_URL=https://yourdomain.com/payment/success,\
NEXT_PUBLIC_DOKU_ERROR_URL=https://yourdomain.com/payment/failed,\
NEXT_PUBLIC_DOKU_UNPAYMENT_URL=https://yourdomain.com/payment/pending,\
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_real_google_client_id,\
NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=5,\
NEXT_PUBLIC_SETTLEMENT_DAYS=7" \
  --set-secrets="\
DOKU_CLIENT_SECRET=doku-client-secret:latest,\
DOKU_SHARED_KEY=doku-shared-key:latest,\
DOKU_PRIVATE_KEY=doku-private-key:latest" \
  --service-account=selevent-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated

# Simpan URL frontend
FRONTEND_URL=$(gcloud run services describe selevent-web --region=$REGION --format='value(status.url)')
echo "Frontend URL: $FRONTEND_URL"
```

> ⚠️ **PENTING**: `NEXT_PUBLIC_*` env vars dibutuhkan di BUILD TIME (baked ke dalam Next.js build).
> Untuk Cloud Run, kita set di deploy sebagai env vars — tapi Next.js membacanya di build time juga.
> Solusi: Set sebagai build-arg di Docker build (Step 8) ATAU rebuild image setiap kali env vars berubah.

---

## 📝 STEP 10: Setup Custom Domain (Opsional tapi Recommended)

### 10.1 Mapping Domain ke Cloud Run

```bash
# Pastikan domain sudah di-delegate DNS ke GCP
# (NS records di registrar domain → Google Cloud DNS)

# Buat managed zone (jika belum ada)
gcloud dns managed-zones create selevent-zone \
  --dns-name="selamockc.com." \
  --description="Selevent DNS Zone"

# Tambahkan record untuk frontend
gcloud dns record-sets create "selamockc.com." \
  --zone="selevent-zone" \
  --type="A" \
  --ttl="300" \
  --routing-policy-type="WRR" \
  --routing-policy-data="0.9=$FRONTEND_URL;0.1=backup"

# Tambahkan record untuk API
gcloud dns record-sets create "api.selamockc.com." \
  --zone="selevent-zone" \
  --type="A" \
  --ttl="300" \
  --routing-policy-type="WRR" \
  --routing-policy-data="0.9=$BACKEND_URL;0.1=backup"

# Map domain ke Cloud Run service
gcloud run domain-mappings create \
  --service=selevent-web \
  --region=asia-southeast2 \
  --domain=selamockc.com

gcloud run domain-mappings create \
  --service=selevent-api \
  --region=asia-southeast2 \
  --domain=api.selamockc.com
```

### 10.2 Update DOKU Webhook URL

```bash
# Setelah domain aktif, update notification URL di DOKU Dashboard
# https://dashboard.doku.com → Integration → Webhook
# URL: https://selamockc.com/api/doku/notification

# Update Cloud Run env vars
gcloud run services update selevent-web \
  --region=asia-southeast2 \
  --update-env-vars="\
NEXT_PUBLIC_DOKU_NOTIFICATION_URL=https://selamockc.com/api/doku/notification,\
NEXT_PUBLIC_DOKU_FINISH_URL=https://selamockc.com/payment/success,\
NEXT_PUBLIC_DOKU_ERROR_URL=https://selamockc.com/payment/failed,\
NEXT_PUBLIC_DOKU_UNPAYMENT_URL=https://selamockc.com/payment/pending"
```

---

## 📝 STEP 11: Setup Cloud Build (CI/CD Otomatis)

### 11.1 Setup Build Trigger

```bash
PROJECT_ID=$(gcloud config get-value project)

# Buat Cloud Build trigger dari GitHub
gcloud builds triggers create github \
  --name="selevent-deploy" \
  --repo-owner="bukdanaws-commits" \
  --repo-name="selamockc" \
  --branch-pattern="^doku$" \
  --build-config="gcp/cloudbuild-frontend.yaml" \
  --region=asia-southeast2

# Atau manual trigger:
# gcloud builds submit --config gcp/cloudbuild-frontend.yaml \
#   --substitutions=_BACKEND_URL=$BACKEND_URL
```

---

## 📝 STEP 12: Database Migration & Seeding

### 12.1 Run Migration

```bash
# Via Cloud SQL Proxy (local)
cloud_sql_proxy -instances=$PROJECT_ID:asia-southeast2:selevent-db=tcp:5432

# Di terminal lain:
psql -h 127.0.0.1 -U eventku -d eventku -f backend/database/schema.sql
psql -h 127.0.0.1 -U eventku -d eventku -f backend/database/seed-data.sql

# Atau via Cloud Build / Cloud Shell
gcloud sql import sql selevent-db \
  gs://selevent-assets/schema.sql \
  --database=eventku \
  --user=eventku
```

### 12.2 Seed Data

```bash
# Seed data (optional — untuk fresh install)
gcloud sql import sql selevent-db \
  gs://selevent-assets/seed-data.sql \
  --database=eventku \
  --user=eventku
```

---

## 📝 STEP 13: Monitoring & Logging

### 13.1 Setup Dashboard

```bash
# Buat custom dashboard
# Buka: Cloud Console → Monitoring → Dashboards → Create Dashboard

# Key metrics untuk monitoring:
# 1. Cloud Run Request Count
# 2. Cloud Run Latency (p50, p95, p99)
# 3. Cloud Run Memory Usage
# 4. Cloud SQL CPU Utilization
# 5. Cloud SQL Connections
# 6. Error Rate (4xx, 5xx)
```

### 13.2 Setup Alerting

```bash
# Buat alert policy untuk:
# 1. Cloud Run error rate > 5%
# 2. Cloud SQL CPU > 80%
# 3. Cloud SQL memory > 80%
# 4. Response latency p99 > 5s

# Buka: Cloud Console → Monitoring → Alerting → Create Policy
```

### 13.3 Setup Error Reporting

```bash
# Otomatis dari Cloud Run — buka:
# Cloud Console → Error Reporting
```

---

## 📝 STEP 14: Setup Memorystore Redis (Opsional untuk Phase 2)

```bash
# Hanya diperlukan saat traffic sudah tinggi (>10K concurrent)
# Skip untuk MVP, gunakan Cloud Run default caching

# Buat Redis instance
gcloud redis instances create selevent-cache \
  --size=1 \
  --region=asia-southeast2 \
  --tier=STANDARD_HA \
  --redis-version=redis_7_0

# Update Cloud Run untuk koneksi ke Redis
gcloud run services update selevent-api \
  --region=asia-southeast2 \
  --set-env-vars="REDIS_HOST=10.0.0.1,REDIS_PORT=6379" \
  --vpc-connector=selevent-connector
```

---

## ✅ Verification Checklist

Setelah semua setup, verifikasi:

```bash
# 1. Cek Cloud Run services
gcloud run services list --region=asia-southeast2

# 2. Cek Cloud SQL
gcloud sql instances describe selevent-db --format='value(state)'
# Should show: RUNNABLE

# 3. Cek GCS buckets
gsutil ls

# 4. Cek secrets
gcloud secrets list

# 5. Test frontend (buka di browser)
FRONTEND_URL=$(gcloud run services describe selevent-web --region=asia-southeast2 --format='value(status.url)')
echo "Open: $FRONTEND_URL"

# 6. Test backend health
BACKEND_URL=$(gcloud run services describe selevent-api --region=asia-southeast2 --format='value(status.url)')
curl $BACKEND_URL/health

# 7. Test DOKU webhook endpoint
curl -X POST $FRONTEND_URL/api/doku/notification \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 🔄 Update / Redeploy

### Redeploy setelah code change:

```bash
cd ~/selevent
git pull origin doku
TAG=$(git rev-parse --short HEAD)

# Build & push frontend
docker build -f Dockerfile.frontend \
  -t asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/eventku/selevent-web:$TAG \
  --build-arg=NEXT_PUBLIC_API_URL=$BACKEND_URL \
  --build-arg=NEXT_PUBLIC_USE_MOCK=false .
docker push asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/eventku/selevent-web:$TAG

# Deploy
gcloud run deploy selevent-web \
  --image=asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/eventku/selevent-web:$TAG \
  --region=asia-southeast2

# Build & push backend
docker build -f backend/Dockerfile \
  -t asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/eventku/selevent-api:$TAG .
docker push asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/eventku/selevent-api:$TAG

gcloud run deploy selevent-api \
  --image=asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/eventku/selevent-api:$TAG \
  --region=asia-southeast2
```

### Update secret:

```bash
# Update secret value
echo -n "new_value" | gcloud secrets versions add database-password --data-file=-

# Cloud Run otomatis membaca latest version saat restart
# Restart service untuk apply:
gcloud run services update selevent-api --region=asia-southeast2 --no-traffic
gcloud run services update selevent-api --region=asia-southeast2 --to-latest
```

---

## 📊 Estimasi Biaya Bulanan

| Komponen | Spesifikasi | Estimasi |
|----------|-------------|----------|
| Cloud Run (Frontend) | 1-100 instances, avg 5 concurrent | $20-50/bln |
| Cloud Run (Backend) | 1-10 instances, avg 5 concurrent | $15-30/bln |
| Cloud SQL PostgreSQL | 4 vCPU, 16GB RAM, HA | $150-200/bln |
| Cloud Storage | ~50GB total | $5-10/bln |
| Secret Manager | 7 secrets | $1-2/bln |
| Cloud Build | ~10 builds/bln | $2-5/bln |
| Cloud Logging | Standard tier | $0-5/bln |
| Cloud Monitoring | Basic metrics | $0-5/bln |
| **TOTAL** | | **$195-310/bln** |

> 💡 Dengan GCP Free Trial ($300 credit), bisa run gratis selama ~1 bulan.

---

## 🆘 Troubleshooting

### Cloud Run cold start lambat
```bash
# Set min-instances agar tidak cold start
gcloud run services update selevent-web \
  --region=asia-southeast2 \
  --min-instances=1
```

### Cloud SQL connection timeout
```bash
# Pastikan VPC connector sudah dibuat dan terhubung
gcloud compute networks vpc-access connectors describe selevent-connector \
  --region=asia-southeast2

# Pastikan Cloud Run service punya --add-cloudsql-instances
gcloud run services describe selevent-api --region=asia-southeast2 \
  --format='value(spec.template.spec.containers[0].env)'
```

### DOKU webhook tidak diterima
```bash
# Cek service URL
gcloud run services describe selevent-web --region=asia-southeast2 \
  --format='value(status.url)'

# Pastikan allow-unauthenticated = true
gcloud run services get-iam-policy selevent-web --region=asia-southeast2

# Test manual:
curl -X POST YOUR_URL/api/doku/notification \
  -H "Content-Type: application/json" \
  -d '{"transaction":{"id":"TEST"}}'
```

### Memory limit exceeded
```bash
# Tingkatkan memory
gcloud run services update selevent-web \
  --region=asia-southeast2 \
  --memory=1Gi
```

### Lihat logs real-time
```bash
# Cloud Run logs
gcloud run services logs tail selevent-web --region=asia-southeast2
gcloud run services logs tail selevent-api --region=asia-southeast2

# Cloud SQL logs
gcloud logging read "resource.type=cloudsql_database" --limit=50
```

---

## 📚 Referensi

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [DOKU SNAP API](https://docs.doku.com)
- [Next.js on Cloud Run](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
