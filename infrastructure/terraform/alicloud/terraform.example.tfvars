name_prefix     = "glavito"
vpc_cidr_block  = "10.60.0.0/16"
db_username     = "glavito_admin"
db_password     = "ChangeMe123!"

# Cost-optimized defaults (Dubai me-east-1)
ack_worker_instance_type   = "ecs.t5-lc1m2.small"
ack_worker_count           = 1
ack_worker_system_disk_size = 40

db_instance_type = "pg.n2.small.1c"
db_storage_gb    = 20
db_storage_type  = "cloud_essd"
db_charge_type   = "Postpaid"

redis_instance_class = "redis.master.small.default"
redis_engine_version = "6.0"

