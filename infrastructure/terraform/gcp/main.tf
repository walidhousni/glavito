module "vpc" {
  source      = "./modules/vpc"
  name_prefix = "glavito"
  region      = var.region
}

module "gke" {
  source       = "./modules/gke"
  project_id   = var.project_id
  cluster_name = var.cluster_name
  zone         = var.zone
  network_name = module.vpc.network_name
  subnet_name  = module.vpc.subnet_name
}

module "sql" {
  source        = "./modules/sql"
  instance_name = var.db_instance_name
  region        = var.region
  db_name       = var.db_name
  db_user       = var.db_user
  db_password   = var.db_password
}

module "gar" {
  source     = "./modules/gar"
  project_id = var.project_id
  region     = var.region
}

module "gcs" {
  source      = "./modules/gcs"
  project_id  = var.project_id
  region      = var.region
  bucket_name = "assets"
}

output "gke_endpoint" {
  value = module.gke.endpoint
}

output "sql_connection_name" {
  value = module.sql.connection_name
}

output "gar_repository_url" {
  value = module.gar.repository_url
}
