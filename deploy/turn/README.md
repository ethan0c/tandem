# Tandem's own relay (TURN)

Calls connect directly when they can. When two networks cannot reach each other (mobile data, strict
school or office Wi-Fi, some home routers), the call goes through a relay. This runs our own instead of
paying a hosted one per GB.

- **Server**: any small Linux server with its own public IP and UDP allowed (Hetzner, DigitalOcean,
  Vultr, Linode, …; around $4–6 a month with terabytes of traffic included). Not Railway or Vercel: they
  cannot take UDP.
- **Software**: coturn, the standard open-source relay.
- **Passwords**: short-lived, signed by the site with a shared secret (`/api/turn`); nothing to store.

## Set it up (about 15 minutes)

1. **Rent the server**: Ubuntu 24.04, the smallest size (1 CPU, 1–2 GB) is plenty. Note its IP address.
2. **DNS**: add an A record `turn.ilovemygf.site` pointing at that IP. Wait until
   `ping turn.ilovemygf.site` answers from it.
3. **Install**: copy this folder over and run the setup as root:
   ```sh
   scp -r deploy/turn root@turn.ilovemygf.site:/root/turn
   ssh root@turn.ilovemygf.site 'DOMAIN=turn.ilovemygf.site EMAIL=you@example.com sh /root/turn/setup.sh'
   ```
   It installs coturn, gets a certificate (renewed automatically), opens only the ports it needs, and
   prints `TURN_SECRET` and `TURN_URLS`.
4. **Check it** from your computer, with those two values:
   ```sh
   TURN_SECRET=… TURN_URLS=… npm run turn:check
   ```
   Every address should say `ok`.
5. **Vercel**: add `TURN_SECRET` and `TURN_URLS`, then redeploy. Remove `NEXT_PUBLIC_TURN_USERNAME`,
   `NEXT_PUBLIC_TURN_CREDENTIAL` (and `NEXT_PUBLIC_TURN_URL`) once calls work, and cancel the hosted relay.

## Good to know

- **The secret** lives in `/etc/coturn/secret` on the server and in Vercel. Never in the page or git.
  To change it: delete that file, rerun `setup.sh`, update Vercel.
- **Limits** (in `turnserver.conf`): about 4 Mbit/s per relayed person, 12 sessions per password,
  1,200 in total, and nothing relayed into private networks.
- **Logs**: `journalctl -u coturn -f` on the server.
- **Capacity**: the smallest servers handle dozens of relayed calls at once. Most calls never touch
  the relay; the site logs `call connected through the TURN relay` in the browser console when one does.
