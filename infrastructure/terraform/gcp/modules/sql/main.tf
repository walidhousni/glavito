resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.tier
    
    ip_configuration {
      ipv4_enabled = true # Public IP for easier access initially, can be restricted
      # authorized_networks can be added here
    }
  }

  deletion_protection  = false # For development/testing
}

resource "google_sql_database" "database" {
  name     = var.db_name
  instance = google_sql_database_instance.instance.name
}

resource "google_sql_user" "users" {
  name     = var.db_user
  instance = google_sql_database_instance.instance.name
  password = var.db_password
}

variable "instance_name" {
  description = "Name of the SQL instance"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "tier" {
  description = "Database tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_user" {
  description = "Database user"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

output "connection_name" {
  value = google_sql_database_instance.instance.connection_name
}

output "public_ip" {
  value = google_sql_database_instance.instance.public_ip_address
}
