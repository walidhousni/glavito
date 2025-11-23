variable "name_prefix" {
  type        = string
  default     = "glavito"
  description = "Prefix for resource names"
}

variable "vpc_cidr_block" {
  type        = string
  default     = "10.60.0.0/16"
  description = "CIDR for the VPC"
}

variable "db_username" {
  type        = string
  description = "PostgreSQL admin username"
}

variable "db_password" {
  type        = string
  description = "PostgreSQL admin password"
  sensitive   = true
}

variable "dashscope_api_key" {
  type        = string
  description = "Alibaba Cloud DashScope API key for LLM services"
  sensitive   = true
}

variable "ai_provider" {
  type        = string
  default     = "dashscope"
  description = "AI provider to use (dashscope, openai, anthropic, or both)"
}

variable "dashscope_model" {
  type        = string
  default     = "qwen-turbo"
  description = "DashScope model to use for triage (qwen-turbo, qwen2.5-72b-instruct, etc)"
}

variable "addons_enabled" {
  description = "Enable Helm addons (ALB Ingress, cert-manager, External Secrets) - requires kubeconfig configured separately"
  type        = bool
  default     = false
}

# Cost-optimization parameters
variable "ack_worker_instance_type" {
  description = "ECS instance type for ACK worker nodes"
  type        = string
  default     = "ecs.t5-lc1m2.small"
}

variable "ack_worker_count" {
  description = "Number of ACK worker nodes"
  type        = number
  default     = 1
}

variable "ack_worker_system_disk_size" {
  description = "ACK worker node system disk size (GB)"
  type        = number
  default     = 40
}

variable "db_instance_type" {
  description = "RDS instance type (e.g., pg.n2.small.1c)"
  type        = string
  default     = "pg.n2.small.1c"
}

variable "db_storage_gb" {
  description = "RDS storage size in GB"
  type        = number
  default     = 20
}

variable "db_storage_type" {
  description = "RDS storage type"
  type        = string
  default     = "cloud_essd"
}

variable "db_charge_type" {
  description = "RDS charge type (Postpaid or Prepaid)"
  type        = string
  default     = "Postpaid"
}

variable "redis_instance_class" {
  description = "Redis instance class"
  type        = string
  default     = "redis.master.small.default"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "6.0"
}

