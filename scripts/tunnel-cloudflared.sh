#!/bin/sh
set -euo pipefail

# Start a Cloudflare Tunnel for the API Gateway.
# If you don't have a managed tunnel, this will run an ephemeral tunnel.

CFG="ops/tunnels/cloudflared/config.yml"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install: brew install cloudflare/cloudflare/cloudflared" >&2
  exit 1
fi

if [ -f "$CFG" ] && [ -n "${CLOUDFLARE_TUNNEL_ID:-}" ]; then
  exec cloudflared tunnel --config "$CFG" run
else
  # Ephemeral: forwards a public URL to localhost:3001
  PORT=${PORT:-3001}
  exec cloudflared tunnel --url "http://localhost:${PORT}"
fi

