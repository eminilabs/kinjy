#!/usr/bin/env bash
# Kaluta Society — deploy to the VPS.
#
#   ./deploy.sh                 # sync, build, restart, verify
#   ./deploy.sh --no-build      # sync and restart only
#
# The workflow this assumes: **edit locally, deploy here.** The production
# stack has no source mount and no --reload, so nothing on the server can be
# edited into effect — a change reaches production by going through this script
# and nowhere else.
set -euo pipefail

# Set KINJY_HOST (or KALUTA_HOST) to your own server. Deliberately not a
# default here: publishing "root@<address>" hands scanners the exact login
# target, and the one person who needs it already knows it.
HOST="${KINJY_HOST:-${KALUTA_HOST:-}}"
[ -n "$HOST" ] || { echo "Set KINJY_HOST, e.g.  KINJY_HOST=root@203.0.113.10 ./deploy.sh"; exit 1; }
REMOTE_DIR="${KALUTA_DIR:-/opt/kaluta}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
BUILD=1
[ "${1:-}" = "--no-build" ] && BUILD=0

say() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

say "1/5 checking access to $HOST"
ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" 'echo ok' >/dev/null || {
  echo "Cannot reach $HOST with key authentication."
  echo "Authorise a key once:  ssh-copy-id -i ~/.ssh/id_ed25519.pub $HOST"
  exit 1
}

say "2/5 syncing source"
# tar over ssh rather than rsync: rsync is not present on a stock Git Bash for
# Windows, and finding that out at deploy time is how a deployment fails at the
# one moment it matters. tar ships everywhere.
#
# The excludes matter as much as the transfer. `.env` holds the *server's*
# secrets and must never be overwritten by the local development one, which
# carries a known JWT secret and a known database password. node_modules and
# dist would push a Windows-built tree into a Linux image.
ssh "$HOST" "mkdir -p $REMOTE_DIR"
tar czf - \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.prodtest' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  . | ssh "$HOST" "tar xzf - -C $REMOTE_DIR"

say "3/5 checking the server has its own .env"
ssh "$HOST" "test -f $REMOTE_DIR/.env" || {
  echo "No $REMOTE_DIR/.env on the server."
  echo "Copy .env.production.example there, fill in the secrets, then re-run."
  exit 1
}

say "4/5 building and starting"
# Caddy first, and forced.
#
# Its Caddyfile is bind-mounted as a single *file*, and the sync replaces that
# file rather than editing it in place — so the mount keeps following the old
# inode and the container goes on serving a config that no longer exists on
# disk. A domain change looked like it had deployed while Caddy still answered
# for the previous hostname and never requested the new certificate.
ssh "$HOST" "cd $REMOTE_DIR && $COMPOSE up -d --force-recreate caddy" >/dev/null 2>&1 || true

if [ "$BUILD" = 1 ]; then
  ssh "$HOST" "cd $REMOTE_DIR && $COMPOSE up -d --build --remove-orphans"
else
  ssh "$HOST" "cd $REMOTE_DIR && $COMPOSE up -d --remove-orphans"
fi

say "5/5 verifying"
# Health is asked of the stack itself rather than assumed from a successful
# `up`: a container that starts and then crashes still exits 0 here.
ssh "$HOST" "cd $REMOTE_DIR && for i in \$(seq 1 30); do
  out=\$(docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T gateway \
        python -c \"import urllib.request,json;print(json.load(urllib.request.urlopen('http://localhost:8000/api/status'))['healthy'])\" 2>/dev/null || true)
  if [ -n \"\$out\" ]; then echo \"healthy services: \$out/13\"; break; fi
  sleep 4
done"

ssh "$HOST" "cd $REMOTE_DIR && $COMPOSE ps --format 'table {{.Service}}\t{{.Status}}'"

say "6/6 verifying the live site from outside"
# Asked from here, not from the server: a site that answers on localhost and
# not from the internet is the failure this catches — a firewall, a DNS record,
# or a certificate that never issued.
DOMAIN="${KALUTA_DOMAIN:-kinjy.com}"
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/" || echo 000)
  if [ "$code" = "200" ]; then
    echo "  https://$DOMAIN -> 200"
    echo "  certificate: $(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null         | openssl x509 -noout -issuer -dates 2>/dev/null | tr '
' ' ')"
    api=$(curl -s --max-time 10 "https://$DOMAIN/api/status" | head -c 60)
    echo "  api: $api"
    break
  fi
  echo "  waiting for the certificate… ($code)"
  sleep 6
done

say "done"
echo "https://kinjy.com"
echo
echo "Caddy obtains the certificate on first start; give it a few seconds and"
echo "watch it with:  ssh $HOST 'cd $REMOTE_DIR && docker compose logs -f caddy'"
