# =============================================================================
#  EVENTKU — Terraform Outputs
#
#  After `terraform apply`, use these to get connection details:
#    terraform output -json
# =============================================================================

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

# ── Cloud SQL ────────────────────────────────────────────────────────────────

output "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.default.name
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name (for Cloud Run)"
  value       = google_sql_database_instance.default.connection_name
}

output "cloud_sql_public_ip" {
  description = "Cloud SQL public IP address"
  value       = google_sql_database_instance.default.public_ip_address
}

output "database_name" {
  description = "PostgreSQL database name"
  value       = var.db_name
}

output "database_user" {
  description = "PostgreSQL database user"
  value       = var.db_user
}

output "database_password" {
  description = "⚠️ PostgreSQL database password (SENSITIVE)"
  value       = random_password.db_password.result
  sensitive   = true
}

# ── Cloud Storage ────────────────────────────────────────────────────────────

output "storage_bucket_name" {
  description = "Cloud Storage bucket name"
  value       = google_storage_bucket.assets.name
}

output "storage_bucket_url" {
  description = "Cloud Storage bucket URL"
  value       = "gs://${google_storage_bucket.assets.name}"
}

# ── Secret Manager ───────────────────────────────────────────────────────────

output "secrets" {
  description = "Secret Manager secret names"
  value = {
    database_password = google_secret_manager_secret.database_password.secret_id
    jwt_secret        = google_secret_manager_secret.jwt_secret.secret_id
    refresh_jwt_secret = google_secret_manager_secret.refresh_jwt_secret.secret_id
  }
}

# ── Artifact Registry ────────────────────────────────────────────────────────

output "artifact_registry_url" {
  description = "Artifact Registry Docker repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/docker"
}

# ── Cloud Run ────────────────────────────────────────────────────────────────

output "api_service_url" {
  description = "Cloud Run API service URL"
  value       = google_cloud_run_v2_service.api.uri
}

output "api_service_name" {
  description = "Cloud Run API service name"
  value       = google_cloud_run_v2_service.api.name
}

# ── Service Account ──────────────────────────────────────────────────────────

output "service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.eventku.email
}

# ── Connection Summary ───────────────────────────────────────────────────────

output "db_connection_string" {
  description = "PostgreSQL connection string for psql"
  value       = "postgresql://${var.db_user}:<password>@${google_sql_database_instance.default.public_ip_address}:5432/${var.db_name}"
  sensitive   = true
}

output "cloud_run_connection_string" {
  description = "Cloud SQL connection string for Cloud Run (Unix socket)"
  value       = "/cloudsql/${google_sql_database_instance.default.connection_name}"
}
