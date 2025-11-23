# Alibaba Cloud Deployment Guide

This guide walks you through deploying the Glavito application to Alibaba Cloud using Terraform and Kubernetes.

## Prerequisites

1. **Alibaba Cloud Account**
   - Active Alibaba Cloud account
   - Access Key ID and Access Key Secret
   - Sufficient credits/quota for:
     - ACK (Alibaba Container Service for Kubernetes)
     - RDS PostgreSQL
     - Redis
     - OSS (Object Storage Service)
     - ACR (Alibaba Container Registry)
     - ALB (Application Load Balancer)

2. **Local Tools**
   - Terraform >= 1.6.0
   - kubectl >= 1.28
   - Docker
   - Alibaba Cloud CLI (`aliyun`) - optional but recommended
   - Git

3. **GitHub Secrets** (for CI/CD)
   - `ACR_USERNAME` - ACR registry username
   - `ACR_PASSWORD` - ACR registry password
   - `KUBECONFIG_CONTENT` - Base64 encoded kubeconfig

## Step 1: Bootstrap Terraform State Backend

Before deploying the main infrastructure, set up the remote state backend:

```bash
cd infrastructure/terraform/alicloud/bootstrap

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
region       = "me-east-1"
state_bucket = "glavito-terraform-state-$(date +%s)"
EOF

# Initialize and apply
terraform init
terraform plan
terraform apply

# Save outputs
terraform output -json > ../../state-backend-outputs.json
```

**Important:** Save the `state_bucket` name and `kms_key_id` - you'll need them for the main Terraform configuration.

## Step 2: Configure Terraform Backend

Update `infrastructure/terraform/alicloud/backend.tf`:

```hcl
terraform {
  backend "oss" {
    bucket         = "glavito-terraform-state-XXXXX"  # From bootstrap output
    prefix         = "glavito-infra"
    key            = "terraform.tfstate"
    region         = "me-east-1"
    encrypt        = true
    acl            = "private"
    # Access via environment variables or ~/.aliyun/config.json
  }
}
```

## Step 3: Configure Terraform Variables

Create `infrastructure/terraform/alicloud/terraform.tfvars`:

```hcl
name_prefix     = "glavito"
vpc_cidr_block  = "10.60.0.0/16"
db_username     = "glavito_admin"
db_password     = "YourSecurePassword123!"  # Change this!
region          = "me-east-1"
dashscope_api_key = "your-dashscope-api-key"  # Optional: for AI features
ai_provider     = "dashscope"
dashscope_model = "qwen-turbo"
```

## Step 4: Set Up Alibaba Cloud Credentials

### Option A: Environment Variables

```bash
export ALICLOUD_ACCESS_KEY="your-access-key-id"
export ALICLOUD_SECRET_KEY="your-access-key-secret"
export ALICLOUD_REGION="me-east-1"
```

### Option B: Configuration File

```bash
aliyun configure
# Follow prompts to set:
# - Access Key ID
# - Access Key Secret
# - Default Region: me-east-1
```

## Step 5: Initialize and Plan Infrastructure

```bash
cd infrastructure/terraform/alicloud

# Initialize Terraform
terraform init

# Review the plan
terraform plan -out=tfplan

# Apply (this will take 15-30 minutes)
terraform apply tfplan
```

**What gets created:**
- VPC with public/private subnets
- NAT Gateway for private subnet egress
- ACK (Kubernetes cluster) with 2 worker nodes
- ACR (Container Registry) namespace and repositories
- RDS PostgreSQL instance
- Redis instance
- OSS bucket for uploads
- Helm charts: ALB Ingress Controller, cert-manager, External Secrets Operator

## Step 6: Configure kubectl

```bash
# Get kubeconfig from Terraform output
terraform output -raw kubeconfig > ~/.kube/config-glavito

# Or merge with existing config
export KUBECONFIG=~/.kube/config-glavito:~/.kube/config
kubectl config view --flatten > ~/.kube/config-merged
mv ~/.kube/config-merged ~/.kube/config

# Verify connection
kubectl cluster-info
kubectl get nodes
```

## Step 7: Set Up External Secrets

### Create Alibaba Cloud Secret Store Credentials

```bash
# Create namespace for external-secrets
kubectl create namespace external-secrets

# Create secret with Alibaba Cloud credentials
kubectl create secret generic alibaba-access-key \
  --from-literal=accessKeyID='your-access-key-id' \
  --from-literal=accessKeySecret='your-access-key-secret' \
  -n external-secrets
```

### Update Secret Store Configuration

The `infrastructure/kubernetes/shared/secretstore.yaml` references this secret. Verify it matches your secret name.

## Step 8: Store Secrets in Alibaba Cloud Secrets Manager

You need to store these secrets in Alibaba Cloud Secrets Manager:

```bash
# Using Alibaba Cloud CLI
aliyun kms CreateSecret \
  --SecretName glavito/prod/DATABASE_URL \
  --SecretData "postgresql://glavito_admin:password@rds-endpoint:5432/glavito" \
  --VersionId "v1"

# Repeat for all secrets:
# - glavito/prod/REDIS_URL
# - glavito/prod/JWT_SECRET
# - glavito/prod/WHATSAPP_ACCESS_TOKEN
# - glavito/prod/WHATSAPP_PHONE_NUMBER_ID
# - glavito/prod/WHATSAPP_WEBHOOK_VERIFY_TOKEN
# - glavito/prod/INSTAGRAM_APP_SECRET
# - glavito/prod/INSTAGRAM_ACCESS_TOKEN
# - glavito/prod/INSTAGRAM_PAGE_ID
# - glavito/prod/INSTAGRAM_VERIFY_TOKEN
# - glavito/prod/FACEBOOK_APP_SECRET
# - glavito/prod/DASHSCOPE_API_KEY
# - glavito/prod/AI_PROVIDER
# - glavito/prod/DASHSCOPE_MODEL
# - glavito/prod/NEXT_PUBLIC_API_URL
```

**Or use the Alibaba Cloud Console:**
1. Go to Secrets Manager service
2. Create secrets with the paths listed above
3. Store the values securely

## Step 9: Build and Push Docker Images

### Option A: Manual Build and Push

```bash
# Login to ACR
docker login registry.me-east-1.aliyuncs.com \
  -u your-acr-username \
  -p your-acr-password

# Get registry namespace from Terraform
REGISTRY="registry.me-east-1.aliyuncs.com"
NAMESPACE="glavito"  # From ACR module output

# Build API Gateway
docker build -f api-gateway/Dockerfile \
  -t $REGISTRY/$NAMESPACE/api:latest \
  -t $REGISTRY/$NAMESPACE/api:$(git rev-parse --short HEAD) \
  .

# Build Admin Dashboard
docker build -f apps/admin-dashboard/Dockerfile \
  -t $REGISTRY/$NAMESPACE/admin:latest \
  -t $REGISTRY/$NAMESPACE/admin:$(git rev-parse --short HEAD) \
  .

# Push images
docker push $REGISTRY/$NAMESPACE/api:latest
docker push $REGISTRY/$NAMESPACE/api:$(git rev-parse --short HEAD)
docker push $REGISTRY/$NAMESPACE/admin:latest
docker push $REGISTRY/$NAMESPACE/admin:$(git rev-parse --short HEAD)
```

### Option B: Use GitHub Actions

The `.github/workflows/deploy.yml` workflow automates this. Ensure GitHub secrets are configured:

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add:
   - `ACR_USERNAME`
   - `ACR_PASSWORD`
   - `KUBECONFIG_CONTENT` (base64 encoded kubeconfig)

Then trigger deployment:
```bash
# Via GitHub UI: Actions → Deploy to Alibaba Cloud ACK → Run workflow
# Or via GitHub CLI:
gh workflow run deploy.yml -f color=blue
```

## Step 10: Deploy to Kubernetes

### Create Namespaces

```bash
kubectl create namespace prod-blue
kubectl create namespace prod-green
```

### Deploy Base Resources

```bash
cd infrastructure/kubernetes

# Deploy base resources
kubectl apply -k base/

# Wait for External Secrets to be ready
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=external-secrets \
  -n external-secrets \
  --timeout=300s
```

### Deploy Blue Environment

```bash
# Update image tags in kustomization.yaml if needed
cd overlays/blue

# Deploy
kubectl apply -k .

# Watch deployment
kubectl get pods -n prod-blue -w
```

### Deploy Green Environment (for blue-green deployments)

```bash
cd ../green
kubectl apply -k .
```

## Step 11: Run Database Migrations

```bash
# Get the latest image tag
IMAGE_TAG=$(git rev-parse --short HEAD)
REGISTRY="registry.me-east-1.aliyuncs.com"
NAMESPACE="glavito"

# Create migration job
kubectl create job prisma-migrate-$(date +%s) \
  --from=cronjob/prisma-migrate \
  -n prod-blue \
  --dry-run=client -o yaml | \
  sed "s|IMAGE_TO_REPLACE|$REGISTRY/$NAMESPACE/api:$IMAGE_TAG|" | \
  kubectl apply -f -

# Or use the job template
sed "s|IMAGE_TO_REPLACE|$REGISTRY/$NAMESPACE/api:$IMAGE_TAG|" \
  ../jobs/prisma-migrate.yaml | \
  kubectl apply -n prod-blue -f -

# Wait for completion
kubectl wait --for=condition=complete \
  --timeout=300s \
  job/prisma-migrate \
  -n prod-blue

# Check logs if needed
kubectl logs job/prisma-migrate -n prod-blue
```

## Step 12: Configure DNS and Ingress

### Get Ingress External IP

```bash
# Wait for ALB to be provisioned
kubectl get ingress -n prod-blue

# Get the ALB address
kubectl get ingress glavito-ingress -n prod-blue -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Configure DNS

Point your domains to the ALB address:

```
admin.glavito.com → ALB address
api.glavito.com → ALB address
```

**DNS Records:**
```
Type: CNAME
Name: admin
Value: <ALB-ADDRESS>
TTL: 300

Type: CNAME
Name: api
Value: <ALB-ADDRESS>
TTL: 300
```

### Verify SSL Certificates

cert-manager will automatically provision Let's Encrypt certificates:

```bash
# Check certificate status
kubectl get certificate -n prod-blue

# Check certificate details
kubectl describe certificate admin-glavito-tls -n prod-blue
```

## Step 13: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n prod-blue

# Check services
kubectl get svc -n prod-blue

# Check ingress
kubectl get ingress -n prod-blue

# Test API health
curl https://api.glavito.com/health/live

# Test admin dashboard
curl -I https://admin.glavito.com
```

## Step 14: Set Up Monitoring (Optional)

### Prometheus and Grafana

If you want to add monitoring:

```bash
# Deploy Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Default credentials: admin / prom-operator
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod logs
kubectl logs -n prod-blue deployment/api-gateway
kubectl logs -n prod-blue deployment/admin-dashboard

# Check pod events
kubectl describe pod -n prod-blue -l app=api-gateway
```

### External Secrets Not Working

```bash
# Check External Secrets Operator logs
kubectl logs -n external-secrets deployment/external-secrets

# Check secret store
kubectl describe secretstore alibaba-store

# Check external secrets
kubectl describe externalsecret api-gateway-secrets -n prod-blue
```

### Database Connection Issues

```bash
# Get RDS endpoint from Terraform
terraform output -json | jq '.pg_endpoint.value'

# Test connection from a pod
kubectl run -it --rm debug \
  --image=postgres:15-alpine \
  --restart=Never \
  -n prod-blue \
  -- psql $DATABASE_URL
```

### Image Pull Errors

```bash
# Verify ACR credentials
kubectl create secret docker-registry acr-secret \
  --docker-server=registry.me-east-1.aliyuncs.com \
  --docker-username=your-username \
  --docker-password=your-password \
  -n prod-blue

# Update deployment to use imagePullSecrets if needed
```

## Blue-Green Deployment Strategy

The setup supports blue-green deployments:

1. **Deploy to Green:**
   ```bash
   gh workflow run deploy.yml -f color=green
   ```

2. **Test Green Environment:**
   ```bash
   # Use a test domain or port-forward
   kubectl port-forward svc/admin-dashboard 3000:3000 -n prod-green
   ```

3. **Switch Traffic:**
   ```bash
   # Update ingress to point to green
   # Or use ALB weighted routing
   ```

4. **Monitor:**
   ```bash
   kubectl get pods -n prod-green -w
   kubectl logs -f deployment/api-gateway -n prod-green
   ```

5. **Rollback if Needed:**
   ```bash
   # Switch back to blue
   kubectl apply -k overlays/blue/
   ```

## Cost Optimization

- **RDS:** Use smaller instance types for dev/staging
- **ACK:** Enable cluster autoscaling, use spot instances for non-critical workloads
- **Redis:** Use smaller instance classes if possible
- **ALB:** Delete unused load balancers
- **OSS:** Enable lifecycle policies for old objects

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable RDS backup and encryption
- [ ] Configure Redis AUTH
- [ ] Use least-privilege IAM policies
- [ ] Enable VPC flow logs
- [ ] Configure WAF rules on ALB
- [ ] Enable DDoS protection
- [ ] Regular security updates
- [ ] Monitor access logs

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions is already configured)
2. Configure monitoring and alerting
3. Set up backup strategies for RDS
4. Configure auto-scaling policies
5. Set up disaster recovery procedures

## Support

For issues or questions:
- Check Terraform outputs: `terraform output`
- Review Kubernetes events: `kubectl get events -n prod-blue --sort-by='.lastTimestamp'`
- Check application logs: `kubectl logs -n prod-blue deployment/api-gateway`
