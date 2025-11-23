variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

variable "redis_instance_class" {
  description = "Redis instance class (e.g., redis.master.small.default)"
  type        = string
  default     = "redis.master.small.default"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "6.0"
}

