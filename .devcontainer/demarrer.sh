#!/usr/bin/env bash
# À chaque démarrage du Codespace : l'API (faux SMS) puis le site, en arrière-plan.
set -uo pipefail
cd "$(dirname "$0")/.."
LOGS=/tmp/interact && mkdir -p "$LOGS"
# Redémarrage propre : on arrête ce qui tournerait encore (préparation, démarrage précédent).
pkill -f "node dist/main.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
for i in $(seq 1 20); do (curl -s -o /dev/null http://localhost:4000/health || curl -s -o /dev/null http://localhost:3000/) || break; sleep 0.5; done
(cd apps/api && set -a && . ./.env && set +a && nohup node dist/main.js > "$LOGS/api.log" 2>&1 &)
for i in $(seq 1 60); do curl -sf http://localhost:4000/health >/dev/null && break; sleep 1; done
(set -a; . apps/web/.env.local; set +a; cd apps/web && NODE_ENV=production nohup pnpm start > "$LOGS/web.log" 2>&1 &)
echo "Site : port 3000 (onglet PORTS). Code SMS de connexion : bash .devcontainer/code-sms.sh"
