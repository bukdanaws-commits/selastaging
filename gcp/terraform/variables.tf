# =============================================================================
#  EVENTKU — Terraform Variables
#
#  Set these via terraform.tfvars or -var flags:
#    terraform apply -var="project_id=eventku-494416"
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, lowercase letters, digits, and hyphens. Must start with a letter and end with a letter or digit."
  }
}

variable "region" {
  description = "GCP Region for all resources"
  type        = string
  default     = "asia-southeast1"

  validation {
    condition     = contains(["asia-southeast1", "asia-east1", "asia-northeast1", "us-central1", "europe-west1"], var.region)
    error_message = "Region must be one of: asia-southeast1, asia-east1, asia-northeast1, us-central1, europe-west1"
  }
}

variable "zone" {
  description = "GCP Zone (derived from region)"
  type        = string
  default     = "asia-southeast1-a"
}

variable "instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "eventku-db"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,25}[a-z0-9]$", var.instance_name))
    error_message = "Instance name must be 3-27 lowercase alphanumeric characters with hyphens."
  }
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "eventku"
}

variable "db_user" {
  description = "PostgreSQL database user"
  type        = string
  default     = "eventku"
}
