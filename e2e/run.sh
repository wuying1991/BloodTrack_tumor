#!/usr/bin/env bash
# E2E runner: builds + starts the full Docker stack with rate limiting disabled,
# waits for backend health, runs Playwright, then tears down (unless KEEP_STACK=1).
#
# Usage:
#   bash e2e/run.sh                    # run the whole suite
#   bash e2e/run.sh tests/auth.spec.ts # run a specific spec (args forwarded to playwright)
#   KEEP_STACK=1 bash e2e/run.sh       # leave the stack up after running
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
KEEP_STACK="${KEEP_STACK:-0}"

echo "[e2e] building + starting stack (rate limiting disabled)..."
docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml up -d --build

echo "[e2e] waiting for backend health..."
healthy=0
for _ in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo 000)
  if [ "$code" = "200" ]; then healthy=1; break; fi
  sleep 2
done
if [ "$healthy" != "1" ]; then
  echo "[e2e] backend did not become healthy; recent backend logs:" >&2
  docker compose logs --tail=30 backend >&2 || true
  docker compose down >&2 || true
  exit 1
fi
echo "[e2e] backend healthy"

echo "[e2e] running Playwright..."
cd e2e
TEST_EXIT=0
npx playwright test "$@" || TEST_EXIT=$?

cd "$ROOT"
if [ "$KEEP_STACK" = "1" ]; then
  echo "[e2e] keeping stack up (KEEP_STACK=1)"
else
  echo "[e2e] tearing down stack..."
  docker compose down
fi
exit "$TEST_EXIT"
