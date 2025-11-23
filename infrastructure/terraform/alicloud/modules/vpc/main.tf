resource "alicloud_vpc" "this" {
  name       = "${var.name_prefix}-vpc"
  cidr_block = var.vpc_cidr_block
}

resource "alicloud_vswitch" "public_a" {
  vpc_id     = alicloud_vpc.this.id
  cidr_block = cidrsubnet(var.vpc_cidr_block, 4, 0)
  zone_id    = data.alicloud_zones.default.zones[0].id
}

resource "alicloud_vswitch" "private_a" {
  vpc_id     = alicloud_vpc.this.id
  cidr_block = cidrsubnet(var.vpc_cidr_block, 4, 1)
  zone_id    = data.alicloud_zones.default.zones[0].id
}

# NAT Gateway for private egress
resource "alicloud_eip_address" "nat" {
  address_name = "${var.name_prefix}-nat-eip"
}

resource "alicloud_nat_gateway" "this" {
  vpc_id           = alicloud_vpc.this.id
  specification    = "Small"
  nat_gateway_name = "${var.name_prefix}-nat"
  payment_type     = "PayAsYouGo"
}

resource "alicloud_eip_association" "nat" {
  allocation_id = alicloud_eip_address.nat.id
  instance_id   = alicloud_nat_gateway.this.id
}

resource "alicloud_snat_entry" "private_out" {
  snat_table_id     = alicloud_nat_gateway.this.snat_table_ids[0]
  source_vswitch_id = alicloud_vswitch.private_a.id
  snat_ip           = alicloud_eip_address.nat.ip_address
}

data "alicloud_zones" "default" {}

output "vpc_id" {
  value = alicloud_vpc.this.id
}

output "private_subnet_ids" {
  value = [alicloud_vswitch.private_a.id]
}

output "public_subnet_ids" {
  value = [alicloud_vswitch.public_a.id]
}

