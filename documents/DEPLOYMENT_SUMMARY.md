# Alibaba Cloud Deployment Summary

## What Was Fixed

1. **Redis Module Error** ✅
   - Fixed `zone_id` being null by using data source to get available zones
   - Added `vpc_id` parameter (required for Redis in VPC)

2. **Backend Configuration** ✅
   - Added documentation comments in `backend.tf`
   - Shows how to configure OSS backend

## Infrastructure Overview

Your Terraform setup creates:

### Core Infrastructure
- **VPC** with public/private subnets
- **NAT Gateway** for private subnet internet access
- **ACK Cluster** (Kubernetes) with 2 worker nodes
- **RDS PostgreSQL** instance
- **Redis** instance
- **OSS Bucket** for file uploads
- **ACR** (Container Registry) with repositories

### Kubernetes Addons
- **ALB Ingress Controller** (Alibaba Cloud Load Balancer)
- **cert-manager** (SSL certificate management)
- **External Secrets Operator** (secret management)

## Key Files Structure

```
infrastructure/
├── terraform/alicloud/
│   ├── bootstrap/          # State backend setup
│   ├── modules/
│   │   ├── vpc/           # VPC and networking
│   │   ├── ack/           # Kubernetes cluster
│   │   ├── acr/           # Container registry
│   │   ├── rds/           # PostgreSQL database
│   │   ├── redis/         # Redis cache (FIXED)
│   │   ├── oss/           # Object storage
│   │   └── addons/        # Helm charts
│   ├── backend.tf         # State backend config (UPDATED)
│   ├── main.tf            # Main infrastructure
│   └── variables.tf       # Variables
└── kubernetes/
    ├── base/              # Base Kubernetes resources
    ├── overlays/
    │   ├── blue/          # Blue environment
    │   └── green/         # Green environment
    └── jobs/              # Migration jobs
```

## Deployment Flow

1. **Bootstrap** → Create state backend (OSS bucket)
2. **Terraform Apply** → Create all infrastructure (~20-30 min)
3. **Configure kubectl** → Connect to ACK cluster
4. **Store Secrets** → In Alibaba Cloud Secrets Manager
5. **Build & Push** → Docker images to ACR
6. **Deploy K8s** → Apply Kubernetes manifests
7. **Run Migrations** → Prisma migrations via Job
8. **Configure DNS** → Point domains to ALB
9. **Verify** → Test endpoints

## Important Notes

### Secrets Management
- Secrets are stored in **Alibaba Cloud Secrets Manager**
- External Secrets Operator syncs them to Kubernetes
- Secret paths follow pattern: `glavito/prod/SECRET_NAME`

### Image Pull Secrets
If ACR requires authentication, you may need to add:

```yaml
# In deployment.yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: acr-secret
```

Create the secret:
```bash
kubectl create secret docker-registry acr-secret \
  --docker-server=registry.me-east-1.aliyuncs.com \
  --docker-username=<ACR_USERNAME> \
  --docker-password=<ACR_PASSWORD> \
  -n prod-blue
```

### Database Connection
- RDS endpoint: Get from `terraform output pg_endpoint`
- Connection string format: `postgresql://user:pass@host:port/db`
- Security: RDS should be in private subnet, accessible from ACK

### Redis Connection
- Redis endpoint: Get from `terraform output redis_connection`
- Port: Get from `terraform output redis_port`
- Format: `redis://host:port` or `redis://:password@host:port`

## Cost Estimate (Monthly)

Based on me-east-1 region:

- **ACK Cluster**: ~$50-100 (2 nodes, ecs.g6.large)
- **RDS PostgreSQL**: ~$30-50 (pg.n2.medium.1c)
- **Redis**: ~$15-25 (redis.master.small.default)
- **NAT Gateway**: ~$20-30
- **ALB**: ~$10-20 + data transfer
- **OSS**: ~$5-10 (storage + requests)
- **Total**: ~$130-235/month (varies by usage)

## Next Steps

1. ✅ Review deployment guide: `documents/ALIBABA_CLOUD_DEPLOYMENT_GUIDE.md`
2. ✅ Use checklist: `documents/DEPLOYMENT_CHECKLIST.md`
3. Set up CI/CD (GitHub Actions workflow exists)
4. Configure monitoring (Prometheus/Grafana)
5. Set up backups for RDS
6. Configure auto-scaling policies

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Pods in ImagePullBackOff | Check ACR credentials, add imagePullSecrets |
| External Secrets not syncing | Verify secret store config and Alibaba credentials |
| Database connection refused | Check RDS security groups, verify subnet access |
| Ingress no IP | Wait 5-10 min for ALB provisioning |
| Terraform state error | Verify OSS bucket exists and credentials |

## Support Resources

- **Terraform Docs**: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs
- **ACK Docs**: https://www.alibabacloud.com/help/en/container-service-for-kubernetes
- **Alibaba Cloud Console**: https://ecs.console.aliyun.com/

