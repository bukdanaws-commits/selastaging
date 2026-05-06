# SELEEVENT — Cloud Shell Deployment Guide

## Panduan Lengkap Deploy ke GCP Cloud Run dari Google Cloud Shell

**Sheila On 7 "Melompat Lebih Tinggi" Tour 2025**
5 Cities × 12,000 tickets = 60,000 total, 5% platform fee

---

## 🎯 Quick Start (Tercepat — Seed Database Saja)

Jika backend & frontend sudah berjalan di Cloud Run dan hanya perlu update data tiket:

### Langkah 1: Buka Google Cloud Shell

```
https://shell.cloud.google.com
```

### Langkah 2: Login & Set Project

```bash
gcloud auth login
gcloud config set project eventku-494416
```

### Langkah 3: Download & Jalankan Quick Seed

```bash
# Download script dari project
# (Jika sudah clone repo, langsung jalankan)
cd ~/seleevent  # atau path project Anda
bash gcp/cloudshell-quick-seed.sh --yes
```

**Selesai!** Database akan terisi data 5 kota × 12,000 tiket.

---

## 📋 Metode Mendapatkan Kode di Cloud Shell

### Metode A: GitHub Clone (RECOMMENDED)

**Dari komputer lokal (project source):**

```bash
cd /path/to/my-project

# Jika belum ada git repo
git init
git add .
git commit -m "SeleEvent - Sheila On 7 Tour 2025"

# Buat repo di GitHub: https://github.com/new
# Kemudian push
git remote add origin https://github.com/USERNAME/seleevent.git
git branch -M main
git push -u origin main
```

**Dari Cloud Shell:**

```bash
# Clone repo
git clone https://github.com/USERNAME/seleevent.git ~/seleevent
cd ~/seleevent

# Jalankan full deploy
export GITHUB_REPO="USERNAME/seleevent"
bash gcp/cloudshell-full-deploy.sh --yes
```

### Metode B: Upload File ke Cloud Shell

1. Di Cloud Shell, klik **⋮** (More) → **Upload file**
2. Upload project sebagai `.tar.gz`:

```bash
# Dari komputer lokal:
cd /path/to/my-project
tar czf ../seleevent.tar.gz .
# Upload seleevent.tar.gz ke Cloud Shell

# Di Cloud Shell:
mkdir -p ~/seleevent
tar xzf ~/seleevent.tar.gz -C ~/seleevent
cd ~/seleevent
```

### Metode C: Cloud Storage Download

```bash
# Dari komputer lokal (jika gcloud tersedia):
tar czf seleevent.tar.gz .
gsutil cp seleevent.tar.gz gs://eventku-494416-source/

# Di Cloud Shell:
mkdir -p ~/seleevent && cd ~/seleevent
gsutil cp gs://eventku-494416-source/seleevent.tar.gz .
tar xzf seleevent.tar.gz
rm seleevent.tar.gz
```

### Metode D: Manual Paste Script

Untuk seed database saja, cukup paste script `cloudshell-quick-seed.sh` langsung ke Cloud Shell. Script ini self-contained (tidak perlu source code).

---

## 🚀 Full Deployment Workflow

### Prasyarat

1. **GCP Project**: `eventku-494416`
2. **Cloud SQL Instance**: `eventku` (region: `asia-southeast2`)
3. **Cloud Run Services**: `eventku-api` + `eventku-web`
4. **Secret Manager Secrets**:
   - `database-password`
   - `jwt-secret`
   - `refresh-jwt-secret`
   - `google-client-secret`
5. **Artifact Registry**: `docker` repo di `asia-southeast2`
6. **Service Account**: `eventku-sa@eventku-494416.iam.gserviceaccount.com`

### Step-by-Step

```bash
# 1. Buka Cloud Shell
#    https://shell.cloud.google.com

# 2. Login
gcloud auth login
gcloud config set project eventku-494416

# 3. Clone repo
git clone https://github.com/USERNAME/seleevent.git ~/seleevent
cd ~/seleevent

# 4. Jalankan full deploy (seed + build + deploy)
export GITHUB_REPO="USERNAME/seleevent"
bash gcp/cloudshell-full-deploy.sh --yes

# ATAU jalankan step-by-step:

# 4a. Seed database saja
bash gcp/cloudshell-quick-seed.sh --yes

# 4b. Seed via proxy (jika GCS import gagal)
bash gcp/seed-via-proxy.sh --yes

# 4c. Deploy backend saja
gcloud builds submit . \
  --config gcp/cloudbuild-backend.yaml \
  --substitutions="_REGION=asia-southeast2,_PROJECT_ID=eventku-494416,_INSTANCE_NAME=eventku" \
  --project=eventku-494416 \
  --timeout=1200s

# 4d. Deploy frontend saja
gcloud builds submit . \
  --config gcp/cloudbuild-frontend.yaml \
  --substitutions="_REGION=asia-southeast2,_PROJECT_ID=eventku-494416,_BACKEND_URL=https://eventku-api-staging-lkfw4e5kna-et.a.run.app" \
  --project=eventku-494416 \
  --timeout=1800s
```

---

## 🔧 Update & Redeploy

### Update Seed Data Saja

```bash
cd ~/seleevent
git pull origin main
python3 backend/database/generate_seed_sql.py
bash gcp/cloudshell-quick-seed.sh --yes
```

### Update Backend Code

```bash
cd ~/seleevent
git pull origin main
gcloud builds submit . \
  --config gcp/cloudbuild-backend.yaml \
  --substitutions="_REGION=asia-southeast2,_PROJECT_ID=eventku-494416,_INSTANCE_NAME=eventku" \
  --project=eventku-494416
```

### Update Frontend Code

```bash
cd ~/seleevent
git pull origin main
gcloud builds submit . \
  --config gcp/cloudbuild-frontend.yaml \
  --substitutions="_REGION=asia-southeast2,_PROJECT_ID=eventku-494416,_BACKEND_URL=https://eventku-api-staging-lkfw4e5kna-et.a.run.app" \
  --project=eventku-494416
```

---

## 🧪 Verifikasi

### Cek API Endpoints

```bash
API="https://eventku-api-staging-lkfw4e5kna-et.a.run.app"

# Semua kota
for CITY in bandung makassar medan jakarta balikpapan; do
  echo "=== $CITY ==="
  curl -s "$API/api/v1/events/sheila-on7-$CITY" | python3 -m json.tool | head -20
  echo ""
done
```

### Cek Cloud SQL

```bash
# Via proxy
cloud-sql-proxy eventku-494416:asia-southeast2:eventku --port=5433 &
sleep 3

PGPASSWORD=$(gcloud secrets versions access latest --secret=database-password) \
psql -h 127.0.0.1 -p 5433 -U eventku -d eventku -c \
  "SELECT e.city, COUNT(tt.id) as ticket_types, SUM(tt.quota) as total_quota, SUM(tt.sold) as total_sold FROM ticket_types tt JOIN events e ON tt.event_id = e.id GROUP BY e.city ORDER BY e.city;"

kill %1 2>/dev/null
```

### Cek Cloud Run

```bash
gcloud run services list --project=eventku-494416 --region=asia-southeast2
```

---

## 🌐 Staging URLs

| Service | URL |
|---------|-----|
| Frontend | https://eventku-web-staging-lkfw4e5kna-et.a.run.app |
| API | https://eventku-api-staging-lkfw4e5kna-et.a.run.app |
| Console | https://console.cloud.google.com/run?project=eventku-494416 |
| Cloud SQL | https://console.cloud.google.com/sql/instances/eventku?project=eventku-494416 |

---

## 📊 Data Summary

| Kota | Slug | Tanggal | Venue | Kuota |
|------|------|---------|-------|-------|
| Bandung | sheila-on7-bandung | 1 Jun 2025 | Baros Field | 12,000 |
| Makassar | sheila-on7-makassar | 8 Jun 2025 | Pantai Losari Arena | 12,000 |
| Medan | sheila-on7-medan | 15 Jun 2025 | Lapangan Merdeka | 12,000 |
| Jakarta | sheila-on7-jakarta | 22 Jun 2025 | GBK Madya Stadium | 12,000 |
| Balikpapan | sheila-on7-balikpapan | 29 Jun 2025 | Lapangan Merdeka BPN | 12,000 |

### Kategori Tiket per Event (9 kategori × 5 kota = 45 rows)

| Kategori | Kuota | Tier | Harga Jakarta |
|----------|-------|------|---------------|
| VVIP PIT | 170 | floor | Rp 3.500.000 |
| VIP ZONE | 280 | floor | Rp 2.800.000 |
| FESTIVAL | 1,700 | floor | Rp 2.200.000 |
| CAT 1 | 1,100 | tribun | Rp 1.750.000 |
| CAT 2 | 1,700 | tribun | Rp 1.400.000 |
| CAT 3 | 1,700 | tribun | Rp 1.100.000 |
| CAT 4 | 2,200 | tribun | Rp 850.000 |
| CAT 5 | 1,700 | tribun | Rp 550.000 |
| CAT 6 | 1,450 | tribun | Rp 350.000 |
| **Total** | **12,000** | | |

---

## ❓ Troubleshooting

### "Tiket belum tersedia" di Landing Page

1. Cek Cloud SQL punya data:
   ```bash
   cloud-sql-proxy eventku-494416:asia-southeast2:eventku --port=5433 &
   PGPASSWORD=$(gcloud secrets versions access latest --secret=database-password) \
   psql -h 127.0.0.1 -p 5433 -U eventku -d eventku -c "SELECT * FROM events;"
   ```

2. Cek backend API bisa akses Cloud SQL:
   ```bash
   curl -s https://eventku-api-staging-lkfw4e5kna-et.a.run.app/api/v1/events/sheila-on7-jakarta
   ```

3. Cek frontend NEXT_PUBLIC_API_URL:
   ```bash
   gcloud run services describe eventku-web --region=asia-southeast2 --project=eventku-494416
   ```

### Cloud SQL Import Gagal

Gunakan metode proxy:
```bash
bash gcp/seed-via-proxy.sh --yes
```

### Cloud Build Timeout

Naikkan timeout:
```bash
gcloud builds submit . --config gcp/cloudbuild-backend.yaml --timeout=2400s
```

### Google OAuth Error

Pastikan authorized origins di Google Cloud Console termasuk:
- `https://eventku-web-staging-lkfw4e5kna-et.a.run.app`
- `https://eventku-api-staging-lkfw4e5kna-et.a.run.app`
