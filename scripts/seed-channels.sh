#!/bin/bash
set -euo pipefail

# Seed WhatsApp and Instagram channels after Meta credentials are configured
# Usage: 
#   1. Get a JWT token by logging into admin dashboard
#   2. Run: bash scripts/seed-channels.sh <JWT_TOKEN> <TENANT_ID>

if [ $# -lt 2 ]; then
  echo "Usage: $0 <JWT_TOKEN> <TENANT_ID>"
  echo ""
  echo "To get JWT_TOKEN:"
  echo "  1. Log into admin dashboard: https://adjust-longitude-integrating-very.trycloudflare.com/"
  echo "  2. Open browser DevTools → Application → Local Storage"
  echo "  3. Find 'auth-storage' → Copy 'accessToken' value"
  echo ""
  echo "To get TENANT_ID:"
  echo "  1. Check your database: SELECT id FROM tenants LIMIT 1;"
  echo "  2. Or check API response after login"
  exit 1
fi

JWT_TOKEN="$1"
TENANT_ID="$2"
API_BASE="http://localhost:3001/api"

# Load env to get IDs
if [ -f .env.development ]; then
  export $(grep -v '^#' .env.development | xargs)
else
  echo "⚠️  .env.development not found, using provided values"
fi

echo "🌱 Seeding WhatsApp and Instagram Channels..."
echo ""

# Create WhatsApp Channel
echo "📱 Creating WhatsApp Channel..."
WA_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -X POST "${API_BASE}/channels" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"name\": \"WhatsApp Dev\",
    \"type\": \"whatsapp\",
    \"config\": {
      \"phoneNumberId\": \"${WHATSAPP_PHONE_NUMBER_ID:-}\",
      \"wabaId\": \"${WHATSAPP_BUSINESS_ACCOUNT_ID:-}\"
    },
    \"isActive\": true
  }" || echo -e "\n500")

HTTP_CODE=$(echo "$WA_RESPONSE" | tail -n1)
WA_BODY=$(echo "$WA_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  WA_CHANNEL_ID=$(echo "$WA_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
  if [ -n "$WA_CHANNEL_ID" ]; then
    echo "  ✅ WhatsApp Channel created: ${WA_CHANNEL_ID}"
    echo "  📝 Channel ID: ${WA_CHANNEL_ID}"
  else
    echo "  ✅ WhatsApp Channel created (check response for ID)"
    echo "$WA_BODY" | jq '.' 2>/dev/null || echo "$WA_BODY"
  fi
else
  echo "  ❌ Failed to create WhatsApp Channel (HTTP ${HTTP_CODE})"
  echo "$WA_BODY" | jq '.' 2>/dev/null || echo "$WA_BODY"
fi

echo ""

# Create Instagram Channel
echo "📸 Creating Instagram Channel..."
IG_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -X POST "${API_BASE}/channels" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"name\": \"Instagram Dev\",
    \"type\": \"instagram\",
    \"config\": {
      \"pageId\": \"${INSTAGRAM_PAGE_ID:-}\"
    },
    \"isActive\": true
  }" || echo -e "\n500")

HTTP_CODE=$(echo "$IG_RESPONSE" | tail -n1)
IG_BODY=$(echo "$IG_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  IG_CHANNEL_ID=$(echo "$IG_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
  if [ -n "$IG_CHANNEL_ID" ]; then
    echo "  ✅ Instagram Channel created: ${IG_CHANNEL_ID}"
    echo "  📝 Channel ID: ${IG_CHANNEL_ID}"
  else
    echo "  ✅ Instagram Channel created (check response for ID)"
    echo "$IG_BODY" | jq '.' 2>/dev/null || echo "$IG_BODY"
  fi
else
  echo "  ❌ Failed to create Instagram Channel (HTTP ${HTTP_CODE})"
  echo "$IG_BODY" | jq '.' 2>/dev/null || echo "$IG_BODY"
fi

echo ""
echo "✅ Channel seeding complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Test outbound WhatsApp: Create conversation with WhatsApp channel ID"
echo "  2. Test outbound Instagram: Create conversation with Instagram channel ID"
echo "  3. Test inbound: Send real messages to your WA/IG accounts"
echo "  4. Check unified inbox: GET /api/v1/conversations/advanced/unified-inbox"

