resource "alicloud_cr_namespace" "ns" {
  name               = var.name_prefix
  auto_create        = true
  default_visibility = "PRIVATE"
}

resource "alicloud_cr_repository" "api" {
  namespace     = alicloud_cr_namespace.ns.name
  name          = "api"
  summary       = "Glavito API Gateway"
  repo_type     = "PRIVATE"
  detail        = "NestJS API gateway image repository"
  instance_id   = null
}

resource "alicloud_cr_repository" "admin" {
  namespace     = alicloud_cr_namespace.ns.name
  name          = "admin"
  summary       = "Glavito Admin Dashboard"
  repo_type     = "PRIVATE"
  detail        = "Next.js admin dashboard image repository"
  instance_id   = null
}

output "namespace" {
  value = alicloud_cr_namespace.ns.name
}

