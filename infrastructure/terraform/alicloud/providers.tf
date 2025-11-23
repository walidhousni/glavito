provider "alicloud" {
  region = var.region
}

variable "region" {
  type        = string
  default     = "me-east-1"
  description = "Alibaba Cloud region"
}

