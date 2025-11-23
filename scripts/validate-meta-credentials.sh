#!/bin/bash
set -euo pipefail

# Validate Meta (WhatsApp + Instagram) credentials by calling Graph API
# Usage: bash scripts/validate-meta-credentials.sh

echo "🔍 Validating Meta Credentials..."
echo ""

# Load .env.development
if [ -f .env.development ]; then
  export $(grep -v '^#' .env.development | xargs)
else
  echo "❌ .env.development not found" >&2
  exit 1
fi

# WhatsApp validation
echo "📱 WhatsApp Cloud API:"
if [ -z "${WHATSAPP_ACCESS_TOKEN:-}" ] || [ -z "${WHATSAPP_PHONE_NUMBER_ID:-}" ]; then
  echo "  ⚠️  WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set"
else
  RESPONSE=$(curl -s "https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number&access_token=${WHATSAPP_ACCESS_TOKEN}" || echo "ERROR")
  if echo "$RESPONSE" | grep -q "display_phone_number"; then
    PHONE=$(echo "$RESPONSE" | grep -o '"display_phone_number":"[^"]*"' | cut -d'"' -f4)
    echo "  ✅ Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}"
    echo "  ✅ Display Phone: ${PHONE}"
  elif echo "$RESPONSE" | grep -q "error"; then
    ERROR=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
    echo "  ❌ Error: ${ERROR}"
  else
    echo "  ❌ Invalid response: ${RESPONSE}"
  fi
fi

if [ -z "${WHATSAPP_BUSINESS_ACCOUNT_ID:-}" ]; then
  echo "  ⚠️  WHATSAPP_BUSINESS_ACCOUNT_ID not set"
else
  echo "  ✅ WABA ID: ${WHATSAPP_BUSINESS_ACCOUNT_ID}"
fi

if [ -z "${WHATSAPP_WEBHOOK_VERIFY_TOKEN:-}" ]; then
  echo "  ⚠️  WHATSAPP_WEBHOOK_VERIFY_TOKEN not set"
else
  echo "  ✅ Verify Token: ${WHATSAPP_WEBHOOK_VERIFY_TOKEN}"
fi

echo ""

# Instagram validation
echo "📸 Instagram Messaging:"
if [ -z "${INSTAGRAM_ACCESS_TOKEN:-}" ] || [ -z "${INSTAGRAM_PAGE_ID:-}" ]; then
  echo "  ⚠️  INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_PAGE_ID not set"
else
  RESPONSE=$(curl -s "https://graph.facebook.com/v18.0/${INSTAGRAM_PAGE_ID}?fields=name,instagram_business_accounts&access_token=${INSTAGRAM_ACCESS_TOKEN}" || echo "ERROR")
  if echo "$RESPONSE" | grep -q "name"; then
    NAME=$(echo "$RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    echo "  ✅ Page ID: ${INSTAGRAM_PAGE_ID}"
    echo "  ✅ Page Name: ${NAME}"
    if echo "$RESPONSE" | grep -q "instagram_business_accounts"; then
      echo "  ✅ Instagram Business Account linked"
    else
      echo "  ⚠️  No Instagram Business Account found (check Page linking)"
    fi
  elif echo "$RESPONSE" | grep -q "error"; then
    ERROR=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
    echo "  ❌ Error: ${ERROR}"
  else
    echo "  ❌ Invalid response: ${RESPONSE}"
  fi
fi

if [ -z "${INSTAGRAM_VERIFY_TOKEN:-}" ]; then
  echo "  ⚠️  INSTAGRAM_VERIFY_TOKEN not set"
else
  echo "  ✅ Verify Token: ${INSTAGRAM_VERIFY_TOKEN}"
fi

echo ""

# App Secret
if [ -z "${FACEBOOK_APP_SECRET:-}" ]; then
  echo "⚠️  FACEBOOK_APP_SECRET not set (webhook signature verification disabled)"
else
  echo "✅ FACEBOOK_APP_SECRET set"
fi

echo ""
echo "📋 Webhook URLs:"
echo "  WhatsApp: https://skunk-driving-oddly.ngrok-free.app/api/webhooks/whatsapp"
echo "  Instagram: https://skunk-driving-oddly.ngrok-free.app/api/webhooks/instagram"
echo ""
echo "✅ Validation complete!"

