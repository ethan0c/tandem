#!/bin/sh
# Sets up Tandem's relay on a fresh Ubuntu server (22.04 or 24.04), as root:
#
#   DOMAIN=turn.ilovemygf.site EMAIL=you@example.com sh setup.sh
#
# Point DOMAIN's DNS (an A record) at this server first: the certificate step needs it.
# Prints the two values to put in Vercel at the end. Safe to run again (it keeps the same secret).
set -eu
: "${DOMAIN:?Set DOMAIN, e.g. turn.ilovemygf.site}"
: "${EMAIL:?Set EMAIL, for certificate expiry notices}"
HERE=$(cd "$(dirname "$0")" && pwd)

apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -yq coturn certbot ufw openssl

# One secret, shared with the site. Kept on reruns so existing passwords stay valid.
SECRET_FILE=/etc/coturn/secret
mkdir -p /etc/coturn
[ -s "$SECRET_FILE" ] || openssl rand -hex 32 > "$SECRET_FILE"
chmod 600 "$SECRET_FILE"
SECRET=$(cat "$SECRET_FILE")

# Only what the relay needs. SSH stays open so you can still log in.
ufw allow 22/tcp
ufw allow 80/tcp            # certificate renewals
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 443/tcp           # TURN over TLS
ufw allow 49152:50151/udp   # relay ports
ufw --force enable

# Certificate for TURN over TLS. coturn runs as its own user, so it gets its own copy, refreshed on
# every renewal.
HOOK=/etc/letsencrypt/renewal-hooks/deploy/coturn.sh
mkdir -p "$(dirname "$HOOK")"
cat > "$HOOK" <<HOOK_EOF
#!/bin/sh
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/coturn/
chown turnserver:turnserver /etc/coturn/fullchain.pem /etc/coturn/privkey.pem
chmod 600 /etc/coturn/privkey.pem
systemctl restart coturn || true
HOOK_EOF
chmod +x "$HOOK"
systemctl stop coturn 2>/dev/null || true
certbot certonly --standalone --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN"
sh "$HOOK"

sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__SECRET__/$SECRET/" "$HERE/turnserver.conf" > /etc/turnserver.conf
chmod 640 /etc/turnserver.conf
chgrp turnserver /etc/turnserver.conf

# Let coturn listen on 443 without running as root.
mkdir -p /etc/systemd/system/coturn.service.d
cat > /etc/systemd/system/coturn.service.d/tandem.conf <<'UNIT_EOF'
[Service]
AmbientCapabilities=CAP_NET_BIND_SERVICE
LimitNOFILE=65536
UNIT_EOF
sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn 2>/dev/null || true
systemctl daemon-reload
systemctl enable coturn
systemctl restart coturn
sleep 2
systemctl is-active --quiet coturn || { journalctl -u coturn -n 40 --no-pager; exit 1; }

cat <<DONE

Relay is running. Add these in Vercel (Settings → Environment Variables), then redeploy:

  TURN_SECRET=$SECRET
  TURN_URLS=turn:$DOMAIN:3478?transport=udp,turn:$DOMAIN:3478?transport=tcp,turns:$DOMAIN:443?transport=tcp

Then, from the project on your computer:  TURN_SECRET=... TURN_URLS=... npm run turn:check
DONE
