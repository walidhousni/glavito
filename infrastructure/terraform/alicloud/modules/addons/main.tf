variable "name_prefix" { type = string }

# ALB Ingress Controller (Alibaba Cloud)
resource "helm_release" "alb_ingress" {
  name       = "alb-ingress-controller"
  repository = "https://kubernetes-sigs.github.io/alibaba-cloud-alb-ingress-controller"
  chart      = "alb-ingress-controller"
  namespace  = "kube-system"
  version    = "1.6.1"
  values     = []
}

# cert-manager
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  create_namespace = true
  version    = "v1.14.5"
  set {
    name  = "installCRDs"
    value = "true"
  }
}

# External Secrets Operator
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true
  version          = "0.9.13"
}

