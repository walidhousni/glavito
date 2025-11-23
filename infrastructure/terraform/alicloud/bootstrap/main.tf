terraform {
  required_version = ">= 1.6.0"
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = ">= 1.231.0"
    }
  }
}

provider "alicloud" {
  region = var.region
}

resource "alicloud_kms_key" "tf_state" {
  description            = "KMS key for Terraform state bucket SSE"
  pending_window_in_days = 7
  key_usage              = "ENCRYPT/DECRYPT"
  protection_level       = "SOFTWARE"
}

resource "alicloud_oss_bucket" "tf_state" {
  bucket = var.state_bucket

  server_side_encryption_rule {
    sse_algorithm     = "KMS"
    kms_master_key_id = alicloud_kms_key.tf_state.id
  }

  versioning {
    status = "Enabled"
  }
}

output "state_bucket_name" {
  value = alicloud_oss_bucket.tf_state.bucket
}

output "kms_key_id" {
  value = alicloud_kms_key.tf_state.id
}

