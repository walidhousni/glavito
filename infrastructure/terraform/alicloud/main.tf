module "vpc" {
  source = "./modules/vpc"

  name_prefix    = var.name_prefix
  vpc_cidr_block = var.vpc_cidr_block
}

module "ack" {
  source = "./modules/ack"

  name_prefix = var.name_prefix
  vpc_id      = module.vpc.vpc_id
  subnets     = module.vpc.private_subnet_ids
  worker_instance_type   = var.ack_worker_instance_type
  worker_count           = var.ack_worker_count
  worker_system_disk_size = var.ack_worker_system_disk_size
}

module "acr" {
  source      = "./modules/acr"
  name_prefix = var.name_prefix
}

module "rds" {
  source          = "./modules/rds"
  name_prefix     = var.name_prefix
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  db_username     = var.db_username
  db_password     = var.db_password
  db_name_app     = "glavito"
  db_name_n8n     = "n8n"
  db_instance_type = var.db_instance_type
  db_storage_gb    = var.db_storage_gb
  db_storage_type  = var.db_storage_type
  db_charge_type   = var.db_charge_type
}

module "redis" {
  source      = "./modules/redis"
  name_prefix = var.name_prefix
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  redis_instance_class = var.redis_instance_class
  redis_engine_version = var.redis_engine_version
}

module "oss" {
  source      = "./modules/oss"
  name_prefix = var.name_prefix
}

module "addons" {
  source = "./modules/addons"
  count  = var.addons_enabled ? 1 : 0
  name_prefix = var.name_prefix
}

output "kubeconfig" {
  value     = module.ack.kubeconfig
  sensitive = true
}

