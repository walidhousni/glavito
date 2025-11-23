variable "region" {
  description = "Alibaba Cloud region (e.g., me-east-1)"
  type        = string
  default     = "me-east-1"
}

variable "state_bucket" {
  description = "OSS bucket name for Terraform remote state"
  type        = string
}

