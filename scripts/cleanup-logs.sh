#!/bin/bash
# VPSConnect Log Cleanup — runs every 2 days via cron
# Cron entry: 0 3 */2 * * /opt/vpsconnect/scripts/cleanup-logs.sh >> /var/log/vpsconnect-cleanup.log 2>&1

set -euo pipefail

LOG_PREFIX="[$(date -Iseconds)] [INFO]"
ERR_PREFIX="[$(date -Iseconds)] [ERROR]"

# 1. Flush PM2 logs (truncate, not delete — PM2 recreates on restart)
if command -v pm2 &>/dev/null; then
  pm2 flush 2>/dev/null && echo "$LOG_PREFIX PM2 logs flushed" || echo "$ERR_PREFIX pm2 flush failed"
fi

# 2. Truncate PM2 log files over 50MB
find /root/.pm2/logs -name "*.log" -size +50M -exec truncate -s 0 {} \; 2>/dev/null && \
  echo "$LOG_PREFIX Large PM2 log files truncated" || true

# 3. Prune Docker container logs (dangling/stopped containers)
docker container prune -f --filter "until=48h" 2>/dev/null && \
  echo "$LOG_PREFIX Docker container prune done" || true

# 4. Remove old Docker volumes not attached to any container
docker volume prune -f 2>/dev/null && \
  echo "$LOG_PREFIX Docker volume prune done" || true

# 5. Clean system journal older than 2 days
if command -v journalctl &>/dev/null; then
  journalctl --vacuum-time=2d 2>/dev/null && \
    echo "$LOG_PREFIX Journald vacuum done" || true
fi

echo "$LOG_PREFIX Cleanup complete"
