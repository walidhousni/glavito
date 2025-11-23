#!/bin/bash
set -euo pipefail

# Kill all Glavito dev processes (API, Admin, ngrok)
# Usage: bash scripts/kill-dev.sh

echo "🛑 Stopping Glavito development processes..."

# Kill processes on dev ports
for port in 3001 3004; do
  PID=$(lsof -ti:$port 2>/dev/null || echo "")
  if [ -n "$PID" ]; then
    echo "  Killing process on port $port (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
  fi
done

# Kill ngrok processes
NGROK_PIDS=$(ps aux | grep "ngrok" | grep -v grep | awk '{print $2}' || echo "")
if [ -n "$NGROK_PIDS" ]; then
  echo "  Killing ngrok processes"
  echo "$NGROK_PIDS" | xargs kill -9 2>/dev/null || true
fi

# Kill node processes related to nx/next
NX_PIDS=$(ps aux | grep -E "(nx|next dev)" | grep -v grep | awk '{print $2}' || echo "")
if [ -n "$NX_PIDS" ]; then
  echo "  Killing nx/next processes"
  echo "$NX_PIDS" | xargs kill -9 2>/dev/null || true
fi

# Kill cloudflared if running
CLOUDFLARE_PIDS=$(ps aux | grep "cloudflared" | grep -v grep | awk '{print $2}' || echo "")
if [ -n "$CLOUDFLARE_PIDS" ]; then
  echo "  Killing cloudflared processes"
  echo "$CLOUDFLARE_PIDS" | xargs kill -9 2>/dev/null || true
fi

sleep 1

# Verify ports are free
if lsof -ti:3001,3004 2>/dev/null; then
  echo "  ⚠️  Some processes may still be running"
else
  echo "  ✅ All ports cleared"
fi

echo "✅ Cleanup complete!"

