#!/usr/bin/env bash
set -euo pipefail
API="http://localhost:3001/api"
EMAIL="dev$(date +%s)@example.com"
PASS="SecurePass123A!"

json_register() {
  jq -n --arg email "$EMAIL" --arg pass "$PASS" --arg fn "Dev" --arg ln "User" '{email:$email,password:$pass,firstName:$fn,lastName:$ln}'
}

json_login() {
  jq -n --arg email "$EMAIL" --arg pass "$PASS" '{email:$email,password:$pass}'
}

register() {
  json_register | curl -sS -X POST "$API/auth/register" -H "Content-Type: application/json" -d @-
}

login() {
  json_login | curl -sS -X POST "$API/auth/login" -H "Content-Type: application/json" -d @-
}

create_call() {
  local token="$1"
  jq -n '{type:"video"}' | curl -sS -X POST "$API/calls" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d @-
}

get_roles() {
  local token="$1"
  curl -sS -X GET "$API/tenants/me/roles" -H "Authorization: Bearer $token"
}

patch_roles() {
  local token="$1"; shift
  local adminPermsJson="$1"; shift
  local agentPermsJson="$1"; shift
  jq -n --argjson admin "$adminPermsJson" --argjson agent "$agentPermsJson" '{admin:{permissions:$admin},agent:{permissions:$agent}}' \
    | curl -sS -X PATCH "$API/tenants/me/roles" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d @-
}

REGRESP=$(register)
ACCESS=$(echo "$REGRESP" | jq -r ".data.accessToken // empty")
REFRESH=$(echo "$REGRESP" | jq -r ".data.refreshToken // empty")
TENANT_ID=$(echo "$REGRESP" | jq -r ".data.tenant.id // empty")
ROLE=$(echo "$REGRESP" | jq -r ".data.user.role // empty")

if [ -z "$ACCESS" ] || [ "$ACCESS" = "null" ]; then
  LOGINRESP=$(login)
  ACCESS=$(echo "$LOGINRESP" | jq -r ".data.accessToken // empty")
  REFRESH=$(echo "$LOGINRESP" | jq -r ".data.refreshToken // empty")
  TENANT_ID=$(echo "$LOGINRESP" | jq -r ".data.tenant.id // empty")
  ROLE=$(echo "$LOGINRESP" | jq -r ".data.user.role // empty")
fi

if [ -z "$ACCESS" ] || [ "$ACCESS" = "null" ]; then
  echo "Failed to acquire access token" >&2
  echo "Register resp:" >&2
  echo "$REGRESP" | jq -C '.' >&2 || echo "$REGRESP" >&2
  exit 1
fi

echo "User: $EMAIL  Role: ${ROLE:-unknown}  Tenant: ${TENANT_ID:-unknown}"

CALLRESP=$(create_call "$ACCESS")
CALL_ID=$(echo "$CALLRESP" | jq -r '.data.id // empty')
STATUS_CODE=$(echo "$CALLRESP" | jq -r '.statusCode // empty')

if [ -z "$CALL_ID" ] || [ "$CALL_ID" = "null" ]; then
  echo "Initial call create failed. statusCode=$STATUS_CODE"
  echo "$CALLRESP" | jq -C '.' || true
  ROLESJSON=$(get_roles "$ACCESS")
  echo "Roles before update:"; echo "$ROLESJSON" | jq -C '.data' || true
  ADMIN_PERMS=$(echo "$ROLESJSON" | jq -c '[.data.admin.permissions[]?] + ["calls.start","calls.read","calls.end"] | unique')
  AGENT_PERMS=$(echo "$ROLESJSON" | jq -c '[.data.agent.permissions[]?] + ["calls.read"] | unique')
  PATCHRESP=$(patch_roles "$ACCESS" "$ADMIN_PERMS" "$AGENT_PERMS")
  echo "Roles patch resp:"; echo "$PATCHRESP" | jq -C '.' || true
  CALLRESP=$(create_call "$ACCESS")
  CALL_ID=$(echo "$CALLRESP" | jq -r '.data.id // empty')
  STATUS_CODE=$(echo "$CALLRESP" | jq -r '.statusCode // empty')
fi

if [ -z "$CALL_ID" ] || [ "$CALL_ID" = "null" ]; then
  echo "Call creation failed after roles patch. statusCode=$STATUS_CODE"
  echo "$CALLRESP" | jq -C '.' || true
fi

cat <<EOF
---
EMAIL=$EMAIL
PASS=$PASS
ACCESS_TOKEN=$ACCESS
REFRESH_TOKEN=$REFRESH
TENANT_ID=$TENANT_ID
CALL_ID=${CALL_ID:-}
---
EOF