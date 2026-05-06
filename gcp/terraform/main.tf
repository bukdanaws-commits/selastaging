# =============================================================================
#  EVENTKU — Terraform IaC for GCP Infrastructure
#
#  Resources provisioned:
#    - Cloud SQL PostgreSQL 16 (regional HA)
#    - Cloud Storage bucket (static assets)
#    - Secret Manager secrets (DB password, JWT secrets)
#    - Artifact Registry (Docker images)
#    - Service Account + IAM roles
#    - Cloud Run v2 API service
#
#  Usage:
#    cd gcp/terraform
#    cp terraform.tfvars.example terraform.tfvars   # edit values
#    terraform init
#    terraform plan
#    terraform apply
#
#  Destroy:
#    terraform destroy
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Uncomment to store state in Cloud Storage for team collaboration:
  # backend "gcs" {
  #   bucket = "eventku-terraform-state"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─── Random Passwords ────────────────────────────────────────────────────────
# These are generated once and stored in state. For production, consider
# using an external secret manager or Vault.

resource "random_password" "db_password" {
  length           = 24
  special          = false
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "random_password" "refresh_jwt_secret" {
  length  = 48
  special = false
}

# ─── Cloud SQL PostgreSQL ────────────────────────────────────────────────────

resource "google_sql_database_instance" "default" {
  name             = var.instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    # Machine type: 2 vCPU, 3840 MB RAM
    tier = "db-custom-2-4096"

    disk_type      = "SSD"
    disk_size      = 20
    disk_autoresize = true
    disk_autoresize_limit = 100

    availability_type = "REGIONAL"

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    # Maintenance window (Sunday 03:00 UTC)
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3
      update_track = "stable"
    }

    # Database flags
    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
    database_flags {
      name  = "log_connections"
      value = "on"
    }
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = false

  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}

resource "google_sql_database" "default" {
  name     = var.db_name
  instance = google_sql_database_instance.default.name
}

resource "google_sql_user" "default" {
  name     = var.db_user
  instance = google_sql_database_instance.default.name
  password = random_password.db_password.result
}

# ─── Cloud Storage ───────────────────────────────────────────────────────────

resource "google_storage_bucket" "assets" {
  name          = "${var.project_id}-assets"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  versioning {
    enabled = false
  }

  autoclass {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin", "Content-Length"]
    max_age_seconds = 3600
  }

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
}

# Storage folders (placeholder objects)
resource "google_storage_bucket_object" "qr_codes_keep" {
  name   = "qr-codes/.keep"
  content = ""
  bucket = google_storage_bucket.assets.name
}

resource "google_storage_bucket_object" "event_images_keep" {
  name   = "event-images/.keep"
  content = ""
  bucket = google_storage_bucket.assets.name
}

resource "google_storage_bucket_object" "exports_keep" {
  name   = "exports/.keep"
  content = ""
  bucket = google_storage_bucket.assets.name
}

# Public read access for assets
resource "google_storage_bucket_iam_member" "assets_public_read" {
  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ─── Secret Manager ──────────────────────────────────────────────────────────

resource "google_secret_manager_secret" "database_password" {
  secret_id = "database-password"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "database_password" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "google_secret_manager_secret" "refresh_jwt_secret" {
  secret_id = "refresh-jwt-secret"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "refresh_jwt_secret" {
  secret      = google_secret_manager_secret.refresh_jwt_secret.id
  secret_data = random_password.refresh_jwt_secret.result
}

# ─── Artifact Registry ───────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "docker" {
  repository_id = "docker"
  format        = "DOCKER"
  location      = var.region
  description   = "EVENTKU Docker images"

  cleanup_policy_dry_run = false

  docker_config {
    immutable_tags = false
  }
}

# ─── Service Account ─────────────────────────────────────────────────────────

resource "google_service_account" "eventku" {
  account_id   = "eventku-sa"
  display_name = "EVENTKU Cloud Run Service Account"
  description  = "Service account for EVENTKU Cloud Run services with access to Cloud SQL, Secret Manager, and Cloud Storage"
}

resource "google_project_iam_member" "eventku_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectViewer",
    "roles/storage.objectCreator",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/errorreporting.writer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.eventku.email}"
}

# Grant SA access to each secret
resource "google_secret_manager_secret_iam_member" "sa_secret_access" {
  for_each = toset([
    google_secret_manager_secret.database_password.secret_id,
    google_secret_manager_secret.jwt_secret.secret_id,
    google_secret_manager_secret.refresh_jwt_secret.secret_id,
  ])

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.eventku.email}"
}

# ─── Cloud Run Backend (API) ────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "api" {
  name     = "eventku-api"
  location = var.region

  template {
    service_account = google_service_account.eventku.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/docker/eventku-api:latest"

      ports {
        container_port = 8080
      }

      # Environment variables
      env {
        name  = "APP_ENV"
        value = "production"
      }
      env {
        name  = "DB_DRIVER"
        value = "postgres"
      }
      env {
        name  = "DB_NAME"
        value = var.db_name
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }
      env {
        name  = "DB_PORT"
        value = "5432"
      }
      env {
        name  = "DB_HOST"
        value = "/cloudsql/${var.project_id}:${var.region}:${var.instance_name}"
      }

      # Secrets from Secret Manager (mounted as env vars)
      env {
        name = "DB_PASSWORD"
        value_from {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_from {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REFRESH_JWT_SECRET"
        value_from {
          secret_key_ref {
            secret  = google_secret_manager_secret.refresh_jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      # Resource limits
      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      # Startup probe
      startup_probe {
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 6
        http_get {
          path = "/health"
        }
      }

      # Liveness probe
      liveness_probe {
        timeout_seconds   = 3
        period_seconds    = 30
        failure_threshold = 3
        http_get {
          path = "/health"
        }
      }
    }

    # Cloud SQL connection
    vpc_access {
      connectors = []
      egress     = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    timeout = "30s"
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  # Allow unauthenticated access
  ingress = "INGRESS_TRAFFIC_ALL"

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Public invoker IAM for the API
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  service  = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─── Cloud Build Service Account Permissions ─────────────────────────────────
# Cloud Build needs permissions to deploy to Cloud Run, push to Artifact Registry, etc.

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_project_iam_member" "cloudbuild_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/cloudsql.client",
    "roles/artifactregistry.writer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}
