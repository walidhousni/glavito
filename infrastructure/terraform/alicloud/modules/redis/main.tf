data "alicloud_zones" "available" {
  available_resource_creation = "KVStore"
}

resource "alicloud_kvstore_instance" "redis" {
  instance_class = var.redis_instance_class
  instance_type  = "Redis"
  engine_version = var.redis_engine_version
  zone_id        = data.alicloud_zones.available.zones[0].id
  vswitch_id     = var.subnet_ids[0]
  vpc_id         = var.vpc_id
  payment_type   = "PostPaid"

  tags = {
    Name = "${var.name_prefix}-redis"
  }
}

output "redis_connection" {
  value = alicloud_kvstore_instance.redis.connection_domain
}

output "redis_port" {
  value = alicloud_kvstore_instance.redis.port
}

