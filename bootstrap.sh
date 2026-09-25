#!/usr/bin/env bash
# Kaluta Society — first deployment, one command.
#
#     bash bootstrap.sh
#
# You will be asked for the server's root password **once**, by ssh itself. It
# is typed into your terminal and used only to install your public key; nothing
# stores it, and every step afterwards runs over key authentication.
#
# After this, deployments are just `./deploy.sh`.
set -euo pipefail

HOST="${KINJY_HOST:-${KALUTA_HOST:-}}"
[ -n "$HOST" ] || { echo "Set KINJY_HOST, e.g.  KINJY_HOST=root@203.0.113.10 ./bootstrap.sh"; exit 1; }
REMOTE_DIR="${KALUTA_DIR:-/opt/kaluta}"
KEY="${KALUTA_KEY:-$HOME/.ssh/id_ed25519.pub}"

say() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

say "1/4 authorising your SSH key on $HOST"
if ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" 'echo ok' >/dev/null 2>&1; then
  echo "  already authorised"
else
  [ -f "$KEY" ] || { echo "No public key at $KEY. Create one with: ssh-keygen -t ed25519"; exit 1; }
  ssh-copy-id -o StrictHostKeyChecking=accept-new -i "$KEY" "$HOST"
fi

say "2/4 checking the server has Docker"
ssh "$HOST" 'command -v docker >/dev/null 2>&1' || {
  echo "  Docker is missing — installing it"
  ssh "$HOST" 'curl -fsSL https://get.docker.com | sh'
}
ssh "$HOST" 'docker compose version >/dev/null 2>&1' || {
  echo "The Docker Compose plugin is missing on the server."
  echo "On Debian/Ubuntu:  DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y docker-compose-plugin"
  exit 1
}
ssh "$HOST" 'docker --version; docker compose version --short'

say "3/4 installing the production secrets"
if ssh "$HOST" "test -f $REMOTE_DIR/.env"; then
  echo "  $REMOTE_DIR/.env already exists — left untouched"
else
  [ -f .env.production ] || { echo "No local .env.production to install."; exit 1; }
  ssh "$HOST" "mkdir -p $REMOTE_DIR"
  # Sent over the encrypted session and locked down immediately: it holds the
  # JWT secret, so anything that can read it can mint a session for any member.
  scp -q .env.production "$HOST:$REMOTE_DIR/.env"
  ssh "$HOST" "chmod 600 $REMOTE_DIR/.env"
  echo "  installed, mode 600"
fi

say "4/4 opening the firewall for http and https"
# Caddy needs port 80 reachable to answer the ACME challenge — without it the
# certificate never issues and the site stays unreachable over https with no
# obvious cause.
ssh "$HOST" 'if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; echo "  ufw: 80 and 443 allowed"
else
  echo "  no active ufw — nothing to open here; check your provider firewall"
fi'

# Anything already holding 80 or 443 would make Caddy fail to bind, so it is
# worth knowing before the deploy rather than from a crash loop.
ssh "$HOST" 'busy=$(ss -lntp 2>/dev/null | grep -E ":(80|443) " || true)
if [ -n "$busy" ]; then
  echo
  echo "  WARNING — something already listens on 80/443:"
  echo "$busy" | sed "s/^/    /"
  echo "  Caddy will not start. Either stop that server, or drop the caddy"
  echo "  service from docker-compose.prod.yml and proxy to WEB_PORT instead."
fi'

echo
echo "Server prepared. Deploying now."
exec ./deploy.sh
