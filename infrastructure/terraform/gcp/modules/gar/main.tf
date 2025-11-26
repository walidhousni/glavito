resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = var.repository_id
  description   = "Docker repository for Glavito"
  format        = "DOCKER"
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "repository_id" {
  description = "Repository ID"
  type        = string
  default     = "glavito-repo"
}

output "repository_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.name}"
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}
