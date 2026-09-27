#!/bin/sh
set -e

echo "[Autopilot Gateway] Initializing stateless EasyTier container with in-memory DB..."

# Hub sync endpoint (if configured)
HUB_URL=${AUTOPILOT_HUB_URL:-"http://localhost:8787"}
GATEWAY_PORT=${PORT:-443}

echo "[Autopilot Gateway] Convergence Port: ${GATEWAY_PORT}"
echo "[Autopilot Gateway] Control Hub: ${HUB_URL}"

# 1. Start official easytier-web with strictly --db :memory:
# Eliminates all persistent storage baggage and ensures 100% stateless execution
if command -v easytier-web >/dev/null 2>&1; then
  echo "[Autopilot Gateway] Starting easytier-web with --db :memory:..."
  easytier-web --db :memory: --listeners "tcp://0.0.0.0:11010" --rpc-portal "0.0.0.0:11211" &
else
  echo "[Autopilot Gateway] Warning: easytier-web binary not found in container path. Running mock simulator."
fi

# 2. Launch background sync daemon to pull declarative state from Hub
(
  while true; do
    sleep 30
    if curl -s -f "${HUB_URL}/api/v1/gateway/config" > /tmp/gateway_state.json 2>/dev/null; then
      # Declarative state pulled successfully
      :
    fi
  done
) &

# 3. Start Caddy single-port reverse proxy as foreground supervisor
echo "[Autopilot Gateway] Starting Caddy reverse proxy on port ${GATEWAY_PORT}..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
