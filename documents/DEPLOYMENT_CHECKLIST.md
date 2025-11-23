# Quick Deployment Checklist

## Pre-Deployment

- [ ] Alibaba Cloud account created and active
- [ ] Access Key ID and Secret obtained
- [ ] Terraform >= 1.6.0 installed
- [ ] kubectl >= 1.28 installed
- [ ] Docker installed
- [ ] Git repository cloned

## Step 1: Bootstrap State Backend (5 min)

```bash
cd infrastructure/terraform/alicloud/bootstrap
terraform init
terraform apply
# Save state_bucket name
```

## Step 2: Configure Backend (2 min)

- [ ] Update `backend.tf` with state bucket name
- [ ] Set Alibaba Cloud credentials (env vars or config file)

## Step 3: Configure Variables (3 min)

- [ ] Create `terraform.tfvars` with:
  - [ ] `name_prefix`
  - [ ] `vpc_cidr_block`
  - [ ] `db_username`
  - [ ] `db_password` (strong password!)
  - [ ] `region`

## Step 4: Deploy Infrastructure (20-30 min)

```bash
cd infrastructure/terraform/alicloud
terraform init
terraform plan
terraform apply
# Wait for completion (~20-30 minutes)
```

## Step 5: Configure kubectl (2 min)

- [ ] Get kubeconfig from Terraform output
- [ ] Configure kubectl to use it
- [ ] Verify: `kubectl get nodes`

## Step 6: Set Up Secrets (10 min)

- [ ] Create External Secrets namespace
- [ ] Create Alibaba Cloud access key secret
- [ ] Store all secrets in Alibaba Cloud Secrets Manager:
  - [ ] DATABASE_URL
  - [ ] REDIS_URL
  - [ ] JWT_SECRET
  - [ ] WhatsApp credentials
  - [ ] Instagram credentials
  - [ ] Facebook App Secret
  - [ ] DashScope API key (if using AI)

## Step 7: Build & Push Images (10 min)

- [ ] Login to ACR
- [ ] Build API image
- [ ] Build Admin Dashboard image
- [ ] Push both images

## Step 8: Deploy to Kubernetes (5 min)

- [ ] Create namespaces: `prod-blue`, `prod-green`
- [ ] Deploy base resources
- [ ] Deploy blue environment
- [ ] Verify pods are running

## Step 9: Run Migrations (2 min)

- [ ] Create Prisma migration job
- [ ] Wait for completion
- [ ] Verify logs

## Step 10: Configure DNS (5 min)

- [ ] Get ALB address from ingress
- [ ] Create CNAME records:
  - [ ] `admin.glavito.com` → ALB
  - [ ] `api.glavito.com` → ALB
- [ ] Wait for DNS propagation

## Step 11: Verify (5 min)

- [ ] Check all pods: `kubectl get pods -n prod-blue`
- [ ] Test API: `curl https://api.glavito.com/health/live`
- [ ] Test Admin: `curl -I https://admin.glavito.com`
- [ ] Check SSL certificates

## Total Time: ~60-75 minutes

## Common Issues & Quick Fixes

### Issue: Terraform state backend error
**Fix:** Ensure OSS bucket exists and credentials are correct

### Issue: Pods in ImagePullBackOff
**Fix:** Verify ACR credentials and image tags

### Issue: External Secrets not syncing
**Fix:** Check secret store configuration and Alibaba Cloud credentials

### Issue: Database connection refused
**Fix:** Verify RDS security groups allow ACK subnet access

### Issue: Ingress not getting IP
**Fix:** Wait for ALB provisioning (can take 5-10 minutes)

## Useful Commands

```bash
# Get Terraform outputs
terraform output

# Check pod status
kubectl get pods -n prod-blue -w

# View logs
kubectl logs -f deployment/api-gateway -n prod-blue

# Check ingress
kubectl get ingress -n prod-blue

# Check secrets
kubectl get externalsecret -n prod-blue

# Restart deployment
kubectl rollout restart deployment/api-gateway -n prod-blue

# Scale deployment
kubectl scale deployment/api-gateway --replicas=3 -n prod-blue
```

