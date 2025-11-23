## Alibaba Cloud (Dubai) Deployment — Step-by-Step (Cost-Effective)

This is a precise, do-these-one-by-one guide to deploy Glavito to Alibaba Cloud (me-east-1, Dubai) with a lean, low-cost footprint.

Important security note:
- Do NOT commit your AccessKey ID/Secret to Git. If they were committed, rotate them now in RAM and purge from git history.
- Prefer shell env vars over storing credentials in files.


### 0) Prerequisites
- Local tools:
  - Terraform >= 1.6
  - kubectl >= 1.28
  - Docker
  - yq (recommended): `brew install yq`
- Alibaba Cloud
  - AccessKey ID and Secret with permissions for VPC, ECS, ACK, RDS (PostgreSQL), Redis, OSS, ACR, KMS
  - Region: Middle East (Dubai) `me-east-1`


### 1) Configure Alibaba Cloud credentials (local shell)

```bash
# Set these in your terminal session; do not commit to files
export ALICLOUD_ACCESS_KEY="REPLACE_ME"
export ALICLOUD_SECRET_KEY="REPLACE_ME"
export ALICLOUD_REGION="me-east-1"
```


### 2) Bootstrap (optional) — Create Terraform remote state bucket with KMS
If you already created an OSS bucket for state in the console, you can skip to Step 3.

```bash
cd infrastructure/terraform/alicloud/bootstrap

cat > terraform.tfvars <<'EOF'
region       = "me-east-1"
state_bucket = "glavito-terraform-state-REPLACE_WITH_UNIQUE_SUFFIX"
EOF

terraform init
terraform apply -auto-approve
```

Copy down the created bucket name for the main backend.


### 3) Initialize main Terraform with the OSS backend

```bash
cd ../

# Initialize using OSS backend (replace bucket/prefix/key accordingly)
terraform init \
  -backend-config="bucket=glavito-terraform-state-REPLACE_WITH_UNIQUE_SUFFIX" \
  -backend-config="prefix=glavito-infra" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=me-east-1"
```


### 4) Create terraform.tfvars (cost-optimized defaults are already wired)

```bash
cat > terraform.tfvars <<'EOF'
name_prefix = "glavito"
vpc_cidr_block = "10.60.0.0/16"

# Database
db_username = "glavito_admin"
db_password = "ChangeThisStrongPassword!"

# ACK - Small, 1 worker
ack_worker_instance_type    = "ecs.t5-lc1m2.small"
ack_worker_count            = 1
ack_worker_system_disk_size = 40

# RDS - small instance/storage, postpaid
db_instance_type = "pg.n2.small.1c"
db_storage_gb    = 20
db_storage_type  = "cloud_essd"
db_charge_type   = "Postpaid"

# Redis - small class
redis_instance_class = "redis.master.small.default"
redis_engine_version = "6.0"
EOF
```


### 5) Apply infrastructure

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

What gets created:
- VPC (public/private), NAT + EIP (needed for private nodes to pull images)
- ACK (Kubernetes) with 1 small worker
- ACR (Container Registry) namespace and repositories
- RDS PostgreSQL
- Redis
- OSS uploads bucket
- Helm addons: ALB Ingress Controller, cert-manager, External Secrets Operator


### 6) Retrieve outputs and configure kubectl

```bash
terraform output -json > tf-outputs.json

# Save Kubeconfig
jq -r '.kubeconfig.value' tf-outputs.json > ~/.kube/config-glavito
export KUBECONFIG=~/.kube/config-glavito

kubectl cluster-info
kubectl get nodes
```


### 7) Create Secret Store credentials (External Secrets Operator)
The repo expects a `ClusterSecretStore` referencing a secret named `alibaba-access-key` in namespace `external-secrets`.

```bash
kubectl create namespace external-secrets --dry-run=client -o yaml | kubectl apply -f -

kubectl -n external-secrets create secret generic alibaba-access-key \
  --from-literal=accessKeyID="$ALICLOUD_ACCESS_KEY" \
  --from-literal=accessKeySecret="$ALICLOUD_SECRET_KEY"

# Apply cluster secret store and cert-manager ClusterIssuer
kubectl apply -f infrastructure/kubernetes/shared/secretstore.yaml
kubectl apply -f infrastructure/kubernetes/shared/clusterissuer.yaml
```


### 8) Create runtime namespaces (blue/green)

```bash
kubectl create namespace prod-blue  --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace prod-green --dry-run=client -o yaml | kubectl apply -f -
```


### 9) Store app secrets in Alibaba Cloud Secrets Manager
Create these secret names (exact) in KMS → Secrets Manager (Console), or use CLI:

Required (examples after DB/Redis are provisioned):
```
glavito/prod/DATABASE_URL
glavito/prod/REDIS_URL
glavito/prod/JWT_SECRET
glavito/prod/WHATSAPP_ACCESS_TOKEN
glavito/prod/WHATSAPP_PHONE_NUMBER_ID
glavito/prod/WHATSAPP_WEBHOOK_VERIFY_TOKEN
glavito/prod/INSTAGRAM_APP_SECRET
glavito/prod/INSTAGRAM_ACCESS_TOKEN
glavito/prod/INSTAGRAM_PAGE_ID
glavito/prod/INSTAGRAM_VERIFY_TOKEN
glavito/prod/FACEBOOK_APP_SECRET
glavito/prod/DASHSCOPE_API_KEY
glavito/prod/AI_PROVIDER
glavito/prod/DASHSCOPE_MODEL
glavito/prod/NEXT_PUBLIC_API_URL
```

Examples once outputs are known:
```bash
# Get endpoints from Terraform outputs
PG_ENDPOINT=$(jq -r '.pg_endpoint.value' tf-outputs.json)
REDIS_HOST=$(jq -r '.redis_connection.value' tf-outputs.json)

echo "postgresql://glavito_admin:ChangeThisStrongPassword!@${PG_ENDPOINT}:5432/glavito"
echo "redis://${REDIS_HOST}:6379"
```
Use the Alibaba console to create/update these secret values.


### 10) Build and push Docker images to ACR

```bash
# ACR login (set your password in Container Registry console → Settings)
docker login registry.me-east-1.aliyuncs.com -u "<ACR_USERNAME>" -p "<ACR_PASSWORD>"

GIT_SHA=$(git rev-parse --short HEAD)

# API
docker build -f api-gateway/Dockerfile \
  -t registry.me-east-1.aliyuncs.com/glavito/api:$GIT_SHA .
docker push registry.me-east-1.aliyuncs.com/glavito/api:$GIT_SHA

# Admin
docker build -f apps/admin-dashboard/Dockerfile \
  -t registry.me-east-1.aliyuncs.com/glavito/admin:$GIT_SHA .
docker push registry.me-east-1.aliyuncs.com/glavito/admin:$GIT_SHA
```


### 11) Point Kustomize overlays to the new tags and deploy (blue)

```bash
# Update image tags in overlays (requires yq)
yq -i ".images[] |= select(.name == \"registry.me-east-1.aliyuncs.com/glavito/api\").newTag = \"$GIT_SHA\"" \
  infrastructure/kubernetes/overlays/blue/kustomization.yaml
yq -i ".images[] |= select(.name == \"registry.me-east-1.aliyuncs.com/glavito/admin\").newTag = \"$GIT_SHA\"" \
  infrastructure/kubernetes/overlays/blue/kustomization.yaml

# Deploy blue
kubectl apply -k infrastructure/kubernetes/overlays/blue
kubectl rollout status deployment/api-gateway -n prod-blue --timeout=180s
kubectl rollout status deployment/admin-dashboard -n prod-blue --timeout=180s
```


### 12) Run Prisma database migrations

```bash
# Use the job template and swap latest → $GIT_SHA
sed "s|registry.me-east-1.aliyuncs.com/glavito/api:latest|registry.me-east-1.aliyuncs.com/glavito/api:$GIT_SHA|" \
  infrastructure/kubernetes/jobs/prisma-migrate.yaml | \
  kubectl apply -n prod-blue -f -

kubectl wait --for=condition=complete --timeout=300s -n prod-blue job/prisma-migrate || \
  (kubectl logs job/prisma-migrate -n prod-blue; exit 1)

kubectl delete job prisma-migrate -n prod-blue --ignore-not-found
```


### 13) Ingress and DNS
- After deployment, check the ALB address:
```bash
kubectl get ingress -n prod-blue
kubectl get ingress glavito-ingress -n prod-blue -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo
```
- Create CNAMEs pointing to the ALB host:
  - `admin.glavito.com` → ALB host
  - `api.glavito.com` → ALB host
- cert-manager will provision TLS for both hosts automatically (Let’s Encrypt).


### 14) Verify
```bash
kubectl get pods -n prod-blue
kubectl get svc -n prod-blue
kubectl get ingress -n prod-blue

curl -sS https://api.glavito.com/health/live | jq .
curl -I https://admin.glavito.com
```


### 15) Blue/Green rollout (optional)
- Update `infrastructure/kubernetes/overlays/green/kustomization.yaml` images to `$GIT_SHA`.
- Deploy:
```bash
kubectl apply -k infrastructure/kubernetes/overlays/green
kubectl rollout status deployment/api-gateway -n prod-green --timeout=180s
kubectl rollout status deployment/admin-dashboard -n prod-green --timeout=180s
```
- Switch traffic by updating the ingress (if you use separate ingresses) or use ALB weighted routing.


### 16) Cost control tips
- Keep `ack_worker_count = 1` unless you need more capacity.
- Scale app replicas carefully (we defaulted to 1):
  - `infrastructure/kubernetes/base/*/deployment.yaml` replicas = 1
  - HPAs set `minReplicas: 1`
- Consider stopping workloads when idle; be aware that NAT Gateway and ALB can incur costs while provisioned.
- Use `Postpaid` for RDS and Redis to avoid upfront costs; scale volumes only as needed.


### 17) Cleanup (if needed)
```bash
cd infrastructure/terraform/alicloud
terraform destroy
```
Note: Destroying does not remove custom DNS nor external secrets in Secrets Manager. Clean those in the console if you no longer need them.


### 18) (Optional) GitHub Actions deployment
A CI workflow exists at `.github/workflows/deploy.yml` to build, push, and deploy. Configure repository secrets:
- `ACR_USERNAME`, `ACR_PASSWORD`
- `KUBECONFIG_CONTENT` (base64 or raw content of kubeconfig; the workflow writes it to a file)
Then run the workflow with the desired color (blue|green).


You’re done. Follow the steps in order; stop after each major step if something looks off and check `kubectl get events -A` and `terraform output` for diagnostics.*** End Patch```  }>
```json
{
  "error": "Invalid JSON",
  "message": "The provided input is not valid JSON. Please ensure the input matches the expected format."
}
```  }}}  }

*** End Patch
*** End Patch 

