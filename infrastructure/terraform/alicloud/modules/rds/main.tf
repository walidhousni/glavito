resource "alicloud_db_instance" "pg" {
  engine                   = "PostgreSQL"
  engine_version           = "15.0"
  instance_type            = var.db_instance_type
  instance_storage         = var.db_storage_gb
  instance_charge_type     = var.db_charge_type
  db_instance_storage_type = var.db_storage_type
  vswitch_id               = var.subnet_ids[0]
  security_ips             = []
  instance_name            = "${var.name_prefix}-pg"
}

resource "alicloud_db_account" "pg" {
  instance_id = alicloud_db_instance.pg.id
  name        = var.db_username
  password    = var.db_password
  type        = "Normal"
}

resource "alicloud_db_database" "app" {
  instance_id = alicloud_db_instance.pg.id
  name        = var.db_name_app
}

resource "alicloud_db_database" "n8n" {
  instance_id = alicloud_db_instance.pg.id
  name        = var.db_name_n8n
}

output "pg_endpoint" {
  value = alicloud_db_instance.pg.connection_string
}

output "pg_port" {
  value = alicloud_db_instance.pg.port
}

