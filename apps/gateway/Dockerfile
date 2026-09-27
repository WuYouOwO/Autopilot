# Multi-stage Dockerfile for Autopilot Stateless Gateway
FROM caddy:2-alpine AS gateway

# Install curl and ca-certificates
RUN apk add --no-cache curl ca-certificates libc6-compat

# Copy Caddyfile and entrypoint script
COPY Caddyfile /etc/caddy/Caddyfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment defaults
ENV PORT=443
ENV AUTOPILOT_HUB_URL="http://localhost:8787"

# Expose single converged port
EXPOSE 443

ENTRYPOINT ["/entrypoint.sh"]
