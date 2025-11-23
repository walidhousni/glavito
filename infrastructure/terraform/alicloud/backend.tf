terraform {
  backend "oss" {
    # Configure via environment variables or terraform init -backend-config
    # Required: bucket, prefix, key, region
    # Optional: encrypt, acl, access_key, secret_key
    # Example:
    # bucket = "glavito-terraform-state"
    # prefix  = "glavito-infra"
    # key     = "terraform.tfstate"
    # region  = "me-east-1"
    # encrypt = true
    # acl     = "private"
  }
}

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = ">= 1.231.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.13.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.31.0"
    }
  }
}

