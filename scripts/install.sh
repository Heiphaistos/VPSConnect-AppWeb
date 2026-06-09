#!/bin/bash
# VPSConnect Install Script
# Run as root on a fresh Debian/Ubuntu VPS

set -euo pipefail

echo "=== VPSConnect Installer ==="

# 1. Install Docker if missing
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

# 2. Install Caddy
if ! command -v caddy &>/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

# 3. Setup project
mkdir -p /opt/vpsconnect
cp -r . /opt/vpsconnect/
cp .env.example /opt/vpsconnect/.env
echo ">> Edit /opt/vpsconnect/.env before continuing!"

# 4. Copy Caddyfile
cp Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy

# 5. Setup cron for log cleanup (every 2 days at 3am)
CRON_LINE="0 3 */2 * * /opt/vpsconnect/scripts/cleanup-logs.sh >> /var/log/vpsconnect-cleanup.log 2>&1"
(crontab -l 2>/dev/null | grep -v cleanup-logs; echo "$CRON_LINE") | crontab -
chmod +x /opt/vpsconnect/scripts/cleanup-logs.sh

echo "=== Done. Run: cd /opt/vpsconnect && docker compose up -d ==="
