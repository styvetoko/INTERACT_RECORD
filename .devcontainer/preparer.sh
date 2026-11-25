#!/usr/bin/env bash
# Préparation unique du Codespace : dépendances, configuration, base, jeu de démonstration, construction du site.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${CODESPACE_NAME:-}" ]; then
  HOST="${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  SITE="https://${HOST}"
else
  HOST="localhost:3000"
  SITE="http://localhost:3000"
fi
SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

cat > apps/api/.env <<ENV
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://interact:interact@db:5432/interact_dev
JWT_ACCESS_SECRET=${SECRET}
SMS_PROVIDER=fake
PAYMENT_PROVIDER=fake
STORAGE_PROVIDER=fake
PUBLIC_MEDIA_URL=${SITE}/media
PUBLIC_WEB_URL=${SITE}
ENV

cat > apps/web/.env.local <<ENV
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=${SITE}
NEXT_PUBLIC_SITE_URL=${SITE}
DEMO_PUBLIC_HOST=${HOST}
ENV

corepack enable
CI=true pnpm install --frozen-lockfile

set -a; . apps/api/.env; set +a
for i in $(seq 1 30); do pnpm --filter @interact/api exec prisma db execute --url "$DATABASE_URL" --stdin <<< "SELECT 1" >/dev/null 2>&1 && break; sleep 2; done
pnpm --filter @interact/api prisma:generate
pnpm --filter @interact/api prisma:deploy
pnpm --filter @interact/api prisma:seed
pnpm --filter @interact/api seed:demo
# Le compte d'équipe de démonstration reçoit le rôle administrateur, pour tout tester.
pnpm --filter @interact/api exec prisma db execute --url "$DATABASE_URL" --stdin <<'SQL'
UPDATE "User" SET roles = ARRAY['FAN','MODERATOR','ADMIN']::"Role"[], "displayName" = 'Admin (démo)' WHERE phone = '+237699000099';
SQL

pnpm --filter @interact/api build
# L'API tourne pendant la construction du site, pour que les pages publiques contiennent déjà les artistes.
(cd apps/api && node dist/main.js > /tmp/interact-build-api.log 2>&1 & echo $! > /tmp/interact-build-api.pid)
for i in $(seq 1 60); do curl -sf http://localhost:4000/health >/dev/null && break; sleep 1; done
(set -a; . apps/web/.env.local; set +a; pnpm --filter @interact/web build)
kill "$(cat /tmp/interact-build-api.pid)" 2>/dev/null || true
echo "Préparation terminée."
