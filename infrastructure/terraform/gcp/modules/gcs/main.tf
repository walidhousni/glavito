resource "google_storage_bucket" "bucket" {
  name          = "${var.project_id}-${var.bucket_name}"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "bucket_name" {
  description = "Bucket name suffix"
  type        = string
  default     = "assets"
}

output "bucket_name" {
  value = google_storage_bucket.bucket.name
}
