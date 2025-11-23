#!/bin/bash
set -euo pipefail

# Start both backend and frontend with unified ngrok tunnel
# This uses a single ngrok agent session (free tier compatible)

echo "🚀 Starting Glavito Development Environment..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok >/dev/null 2>&1; then
  echo "❌ ngrok is not installed. Install: brew install ngrok/ngrok/ngrok" >&2
  exit 1
fi

# Start services in background
echo "📦 Starting API Gateway (port 3001)..."
nx serve api-gateway > /tmp/glavito-api.log 2>&1 &
API_PID=$!

echo "📦 Starting Admin Dashboard (port 3004)..."
nx dev admin-dashboard --port=3004 > /tmp/glavito-admin.log 2>&1 &
ADMIN_PID=$!

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
if ! kill -0 $API_PID 2>/dev/null; then
  echo "❌ API Gateway failed to start. Check /tmp/glavito-api.log"
  exit 1
fi

if ! kill -0 $ADMIN_PID 2>/dev/null; then
  echo "❌ Admin Dashboard failed to start. Check /tmp/glavito-admin.log"
  kill $API_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Services started"
echo ""

# Start ngrok tunnels
echo "🌐 Starting ngrok tunnels..."
echo "   Backend: https://skunk-driving-oddly.ngrok-free.app (reserved domain)"
echo "   Frontend: <ephemeral domain> (will be shown below)"
echo ""

# Trap to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $API_PID $ADMIN_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start ngrok (this will block)
ngrok start --config ops/tunnels/ngrok.yml api-gateway admin-dashboard

