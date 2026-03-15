#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -eq 0 ]; then
  echo "Run this script as a non-root deploy user." >&2
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${PAPERCLIP_SERVICE_NAME:-paperclip}"
CONFIG_FILE="${PAPERCLIP_CONFIG_FILE:-$HOME/.paperclip/instances/default/config.json}"
EXPECTED_BRANCH="${PAPERCLIP_DEPLOY_BRANCH:-claricont-prod}"
BACKUP_RETENTION_DAYS="${PAPERCLIP_BACKUP_RETENTION_DAYS:-30}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is not installed" >&2
    exit 1
  fi
}

timestamp() {
  date +"%Y%m%d-%H%M%S"
}

require_command git
require_command pnpm
require_command node
require_command curl
require_command sudo

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Config file not found: $CONFIG_FILE" >&2
  exit 1
fi

readarray -t CONFIG_VALUES < <(node - "$CONFIG_FILE" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const configPath = process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const instanceDir = path.dirname(configPath);
const dbMode = config?.database?.mode ?? "embedded-postgres";
const dbPort = String(config?.database?.embeddedPostgresPort ?? 54329);
const serverPort = String(config?.server?.port ?? 3100);
const backupDir = path.join(instanceDir, "data", "backups");

console.log(dbMode);
console.log(dbPort);
console.log(serverPort);
console.log(backupDir);
NODE
)

DB_MODE="${CONFIG_VALUES[0]}"
DB_PORT="${CONFIG_VALUES[1]}"
SERVER_PORT="${CONFIG_VALUES[2]}"
BACKUP_DIR="${CONFIG_VALUES[3]}"

if [ "$DB_MODE" != "embedded-postgres" ]; then
  echo "This deploy script currently supports only embedded-postgres mode." >&2
  exit 1
fi

cd "$APP_DIR"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ "$BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "Refusing to deploy branch '$BRANCH'. Expected '$EXPECTED_BRANCH'." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/paperclip-$(timestamp).sql"

echo "[1/7] Backing up embedded PostgreSQL to $BACKUP_FILE..."
if command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD=paperclip pg_dump \
    --host=127.0.0.1 \
    --port="$DB_PORT" \
    --username=paperclip \
    --dbname=paperclip \
    --clean \
    --if-exists \
    --file="$BACKUP_FILE"

  find "$BACKUP_DIR" -type f -name 'paperclip-*.sql' -mtime +"$BACKUP_RETENTION_DAYS" -delete 2>/dev/null || true
else
  echo "pg_dump is not installed. Falling back to repository backup helper..."
  PAPERCLIP_BACKUP_CONFIG_FILE="$CONFIG_FILE" \
    PAPERCLIP_BACKUP_DIR="$BACKUP_DIR" \
    pnpm --filter @paperclipai/db exec tsx src/backup.ts
fi

echo "[2/7] Fetching from origin..."
git fetch origin

echo "[3/7] Pulling branch $EXPECTED_BRANCH..."
git pull --ff-only origin "$EXPECTED_BRANCH"

echo "[4/7] Installing dependencies..."
INSTALL_LOG="$(mktemp)"
if CI=1 pnpm install --frozen-lockfile 2>&1 | tee "$INSTALL_LOG"; then
  rm -f "$INSTALL_LOG"
else
  if grep -q "ERR_PNPM_OUTDATED_LOCKFILE" "$INSTALL_LOG"; then
    echo "pnpm lockfile is out of date upstream. Retrying without --frozen-lockfile..."
    CI=1 pnpm install --no-frozen-lockfile
    rm -f "$INSTALL_LOG"
  else
    rm -f "$INSTALL_LOG"
    exit 1
  fi
fi

echo "[5/9] Building plugin SDK..."
CI=1 pnpm --filter @paperclipai/plugin-sdk build

echo "[6/9] Applying database migrations..."
CI=1 pnpm --filter @paperclipai/db migrate

echo "[7/9] Building UI..."
CI=1 pnpm --filter @paperclipai/ui build

echo "[8/9] Restarting service..."
sudo -n systemctl restart "$SERVICE_NAME"

echo "[9/9] Waiting for healthcheck..."
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${SERVER_PORT}/api/health" >/dev/null; then
    echo "Healthcheck passed."
    sudo -n systemctl --no-pager --full status "$SERVICE_NAME" | sed -n '1,40p'
    echo "Done."
    exit 0
  fi
  sleep 1
done

echo "Healthcheck failed after restart." >&2
sudo -n journalctl -u "$SERVICE_NAME" -n 80 --no-pager >&2
exit 1
