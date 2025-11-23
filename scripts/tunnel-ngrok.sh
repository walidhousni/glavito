#!/bin/sh
set -euo pipefail

# Start an ngrok tunnel for the API Gateway.
# If NGROK_DOMAIN is set (reserved domain), it will be used.
# Otherwise, an ephemeral domain will be created.

PORT=${PORT:-3001}

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok is not installed. Install: brew install ngrok/ngrok/ngrok" >&2
  exit 1
fi

if [ -n "${NGROK_DOMAIN:-}" ]; then
  exec ngrok http --host-header=rewrite --domain "$NGROK_DOMAIN" "$PORT"
else
  exec ngrok http --host-header=rewrite "$PORT"
fi

