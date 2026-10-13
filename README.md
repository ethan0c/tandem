# Tandem

Watch anime together, face to face. Tandem is a watch-party app for two: synced video playback and a peer-to-peer
video call in one tab, with your partner's camera floating over the show.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Open a room, copy the link, and open it in a second browser (or send it to your partner). For a quick local test
use two different browsers or an incognito window so each tab gets its own camera permission.

Production:

```bash
npm run build
npm start
```

End-to-end check (drives two copies of the installed Google Chrome through join, call, tab share, late join and
reconnect against a running server):

```bash
BASE_URL=http://localhost:3000 npm run e2e
```

## Deploy

Rooms, sync and call signalling all go through the Socket.IO server in `server.ts`, which must run as a
long-lived Node process. **A static or serverless host (Vercel, Netlify, GitHub Pages) cannot run it**: the site
renders, but `/socket.io` answers 404 and every room sits on "Connecting…" forever.

Two layouts work:

1. **One host for everything** (simplest). Deploy the repo to a Node host that runs `npm run build` then
   `npm start`, such as Railway, Fly.io or Render. The included `Dockerfile` works on any of them. Point your
   domain at that host. No extra configuration is needed.
2. **Static site + separate server.** Keep the site where it is and run `server.ts` on a Node host. On the server
   set `CORS_ORIGIN` to the site's origin; on the site set `NEXT_PUBLIC_SOCKET_URL` to the server's URL and
   rebuild. See `.env.example`.

For calls between some pairs of networks (mobile data, CGNAT, strict corporate NAT) a TURN relay is required;
set `NEXT_PUBLIC_TURN_*` where the site is built. Everything else works without environment variables.

## How it works

- **Next.js 16 + Tailwind 4** for the UI, served by a small custom Node server (`server.ts`) so Socket.IO can share
  the same port.
- **Socket.IO** carries room membership, playback sync (play / pause / seek), the shared video source, and WebRTC
  signaling. Rooms live in memory and are dropped ten minutes after the last person leaves.
- **Reconnects are not departures.** Each tab picks a member id once per page load and joins with it, so when a
  socket drops and comes back the server sees the same member and nothing is renegotiated. The server holds a
  dropped member's seat (and their screen share) for a minute before treating it as a departure; a tab that is
  closed says goodbye explicitly and is removed at once. If the server forgot a share anyway (it restarted, or
  the sharer was away longer than that), the sharer announces it again on rejoin.
- **WebRTC** connects browsers directly for audio and video. For each pair, only the member with the greater
  member id sends the offer, a rule both sides can apply without talking, so there is no negotiation glare. The
  offerer re-offers with an ICE restart if the connection fails. STUN is Google's public server; set
  `NEXT_PUBLIC_TURN_*` (see `.env.example`) if you need a relay for strict NATs.
- **Sync model**: the server stamps every playback change with its own clock. Each client estimates its offset to
  the server clock with a few pings, computes where the media *should* be, and corrects drift every 500 ms: small
  drift nudges the playback rate by ±8 %, large drift hard-seeks.
- **Fullscreen** is requested on the whole room container, not the `<video>` element, so the draggable camera
  window stays on top.

## Video sources

| Source           | What happens                                                                            |
| ---------------- | --------------------------------------------------------------------------------------- |
| Share tab        | The sharer streams a tab (with tab audio) over WebRTC. DRM sites may appear black. A viewer keeps asking the sharer for a picture until one arrives and asks again if the link fails, so a lost message costs seconds, not the show. |
| Local file       | Nothing is uploaded. Your partner is prompted to pick the same file on their machine.   |

Streaming sites with protected or proprietary players cannot be driven from a web page. A browser extension that
speaks the same Socket.IO events (`sync:update`, `sync:state`) is the natural next step for those.

## Keyboard

`space` / `k` play-pause · `←` `→` seek 5s · `j` `l` seek 10s · `m` mute · `f` fullscreen

## Project layout

```
server.ts                     custom Next server + Socket.IO rooms
src/lib/types.ts              shared event contracts and the expectedTime() helper
src/hooks/useRoom.ts          socket lifecycle, clock offset, membership, playback state
src/hooks/useWebRTC.ts        mesh peer connections, mic/cam toggles
src/hooks/useDraggable.ts     pointer-drag with bounds clamping
src/components/room/          JoinCard, Session, Player, FloatingCall, SourceDialog, TopBar
src/components/landing/       landing page pieces
```
