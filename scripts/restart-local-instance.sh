#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -eq 0 ]; then
  echo "Run this script as a non-root operator user." >&2
  exit 1
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is not installed" >&2
    exit 1
  fi
}

require_command curl
require_command node
require_command sudo
require_command systemctl

SERVICE_NAME="${PAPERCLIP_SERVICE_NAME:-paperclip}"
CONFIG_FILE="${PAPERCLIP_CONFIG_FILE:-$HOME/.paperclip/instances/default/config.json}"
HEALTHCHECK_TIMEOUT_SEC="${PAPERCLIP_HEALTHCHECK_TIMEOUT_SEC:-30}"
ALLOW_LIVE_RUNS="${PAPERCLIP_RESTART_ALLOW_LIVE_RUNS:-0}"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Config file not found: $CONFIG_FILE" >&2
  exit 1
fi

readarray -t CONFIG_VALUES < <(node - "$CONFIG_FILE" <<'NODE'
const fs = require("node:fs");
const configPath = process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const port = String(config?.server?.port ?? 3100);
console.log(port);
NODE
)

SERVER_PORT="${CONFIG_VALUES[0]}"
HEALTHCHECK_URL="http://127.0.0.1:${SERVER_PORT}/api/health"
PRE_ACTIVE_TS="$(systemctl show "$SERVICE_NAME" -p ActiveEnterTimestamp --value || true)"
PRE_MAIN_PID="$(systemctl show "$SERVICE_NAME" -p ExecMainPID --value || true)"

echo "Preflight:"
echo "- service: $SERVICE_NAME"
echo "- config: $CONFIG_FILE"
echo "- healthcheck: $HEALTHCHECK_URL"
echo "- previous active timestamp: ${PRE_ACTIVE_TS:-unknown}"
echo "- previous main pid: ${PRE_MAIN_PID:-unknown}"

if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then
  echo "- current healthcheck: ok"
else
  echo "- current healthcheck: failed (continuing; restart may still be intentional)"
fi

if [ -n "${PAPERCLIP_API_URL:-}" ] && [ -n "${PAPERCLIP_API_KEY:-}" ] && [ -n "${PAPERCLIP_COMPANY_ID:-}" ]; then
  LIVE_RUNS="$(curl -fsS \
    -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
    "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/live-runs")"
  if [ "$LIVE_RUNS" != "[]" ] && [ "$ALLOW_LIVE_RUNS" != "1" ]; then
    echo "Refusing to restart while live runs exist." >&2
    echo "$LIVE_RUNS" >&2
    echo "If you have explicitly decided the interruption is safe, rerun with PAPERCLIP_RESTART_ALLOW_LIVE_RUNS=1." >&2
    exit 2
  fi
  echo "- live-runs preflight: ok"
else
  echo "- live-runs preflight: skipped (set PAPERCLIP_API_URL, PAPERCLIP_API_KEY, and PAPERCLIP_COMPANY_ID to enable it)"
fi

echo "Restarting $SERVICE_NAME..."
sudo -n /bin/systemctl restart "$SERVICE_NAME"

for _ in $(seq 1 "$HEALTHCHECK_TIMEOUT_SEC"); do
  if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then
    POST_ACTIVE_TS="$(systemctl show "$SERVICE_NAME" -p ActiveEnterTimestamp --value || true)"
    POST_MAIN_PID="$(systemctl show "$SERVICE_NAME" -p ExecMainPID --value || true)"
    echo "Healthcheck passed."
    echo "- new active timestamp: ${POST_ACTIVE_TS:-unknown}"
    echo "- new main pid: ${POST_MAIN_PID:-unknown}"
    systemctl show "$SERVICE_NAME" -p ActiveState -p ActiveEnterTimestamp -p ExecMainPID
    exit 0
  fi
  sleep 1
done

echo "Healthcheck failed after restart." >&2
systemctl status "$SERVICE_NAME" >&2 || true
echo "Inspect /home/paperclip/.paperclip/instances/default/logs/server.log for details." >&2
exit 1
