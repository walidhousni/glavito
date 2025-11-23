resource "alicloud_cs_managed_kubernetes" "this" {
  name_prefix                 = "${var.name_prefix}-ack"
  version                     = "1.28.9-aliyun.1"
  cluster_network_type        = "flannel"
  worker_vswitch_ids          = var.subnets
  worker_instance_types       = [var.worker_instance_type]
  worker_number               = var.worker_count
  deletion_protection         = false
  install_cloud_monitor       = true
  slb_internet_enabled        = true
  proxy_mode                  = "ipvs"
}

resource "alicloud_cs_kubernetes_node_pool" "default" {
  cluster_id              = alicloud_cs_managed_kubernetes.this.id
  name                    = "${var.name_prefix}-pool"
  vswitch_ids             = var.subnets
  instance_types          = [var.worker_instance_type]
  desired_size            = var.worker_count
  key_name                = null
  system_disk_category    = "cloud_essd"
  system_disk_size        = var.worker_system_disk_size
  image_type              = "ContainerOS"
}

data "alicloud_cs_kubernetes_clusters" "current" {
  name_regex = alicloud_cs_managed_kubernetes.this.name
}

output "kubeconfig" {
  value     = alicloud_cs_managed_kubernetes.this.kube_config
  sensitive = true
}

