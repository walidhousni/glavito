resource "alicloud_oss_bucket" "uploads" {
  bucket = "${var.name_prefix}-uploads"

  acl = "private"

  versioning {
    status = "Enabled"
  }
}

output "bucket" {
  value = alicloud_oss_bucket.uploads.bucket
}

