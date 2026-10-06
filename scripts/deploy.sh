#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
npm run typecheck
npm test
bash scripts/build.sh
node scripts/migrate.mjs --production
npx wrangler deploy --env production
