variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "db_username" { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}
variable "db_name_app" { type = string }
variable "db_name_n8n" { type = string }

variable "db_instance_type" {
  description = "RDS PostgreSQL instance type (e.g., pg.n2.small.1c)"
  type        = string
  default     = "pg.n2.small.1c"
}

variable "db_storage_gb" {
  description = "RDS storage size in GB"
  type        = number
  default     = 20
}

variable "db_storage_type" {
  description = "RDS storage type (cloud_essd, cloud_essd2, etc.)"
  type        = string
  default     = "cloud_essd"
}

variable "db_charge_type" {
  description = "Billing model for RDS (Postpaid or Prepaid)"
  type        = string
  default     = "Postpaid"
}

