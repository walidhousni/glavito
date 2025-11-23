variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnets" {
  type = list(string)
}

variable "worker_instance_type" {
  description = "ECS instance type for worker nodes"
  type        = string
  default     = "ecs.t5-lc1m2.small"
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 1
}

variable "worker_system_disk_size" {
  description = "Worker node system disk size in GB"
  type        = number
  default     = 40
}
