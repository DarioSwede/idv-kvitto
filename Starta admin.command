#!/bin/zsh
set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTROL_URL="http://127.0.0.1:43920"
ADMIN_URL="http://localhost:43922/admin.html"
LOG_FILE="/tmp/idv-kvitto-control-center.log"

cd "$PROJECT_DIR" || exit 1
npm run control-center >"$LOG_FILE" 2>&1 &
control_pid=$!
trap 'kill "$control_pid" 2>/dev/null' EXIT

for attempt in {1..15}; do
  if curl -fsS "$CONTROL_URL/api/status" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS -X POST "$CONTROL_URL/api/run" \
  -H 'Content-Type: application/json' \
  --data '{"action":"start-preview"}' >/dev/null 2>&1 || {
  printf 'Kunde inte starta förhandsvisningen. Läs loggen: %s\n' "$LOG_FILE"
  exit 1
}

open "$ADMIN_URL"
wait "$control_pid"
