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
  dropped member's seat (and their screen share) for a minute before treating it as a departure. Explicit Leave
  removes the seat immediately; pagehide sends a reconnect beacon and closes the transport, reserving the seat
  briefly for reload or browser restoration. If the server forgot a share anyway (it restarted, or
  the sharer was away longer than that), the sharer announces it again on rejoin.
- **Reload handover.** A random tab token is saved in session storage and reused only for reload navigation.
  The server replaces any previous seat for that token immediately, even when the unload beacon and socket
  goodbye are lost. The member ID still changes on reload so peers rebuild their media connections. New tabs
  receive new tokens even if the browser copied the opener's session storage. Late goodbye requests cannot
  remove the replacement seat because they carry the old member ID. Signaling is routed only between live
  sockets in the same room.
  Reload handover emits `member:replaced`, updating the roster and host silently while peers rebuild their
  media connections. `JoinCard` automatically resumes an active session on reload and restores the local
  camera/microphone enabled flags; it does not auto-join a new tab or a room explicitly left.
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

Streaming sites with protected or proprietary players cannot be driven from an unrelated web page. The
browser extension bridges the site's HTML5 player to the app using the same Socket.IO sync events. See
[extension/README.md](extension/README.md) for supported domains, permissions, and compatibility limitations.

## Call quality on weak connections

`useWebRTC` samples each call connection's WebRTC stats every two seconds. Camera quality and the visible
warning are separate: three constrained samples lower camera quality silently; five unconstrained samples
restore it. The warning has a ten-second startup grace period, then requires five consecutive severe samples
(about ten seconds). Three healthy samples clear it. Unknown samples break consecutive-sample streaks and
do not declare recovery.

Camera constraints include selected-pair RTT above 600 ms, interval packet loss above 5% (at least 20 packets),
or bandwidth-limited encoding. Warning severity requires RTT above one second, audio packet loss above 8%,
video packet loss above 12%, or a disconnected/failed connection. Bandwidth adaptation alone never displays
a warning. Packet loss uses interval counters, and unselected ICE pairs and CPU encoding limits are ignored.

Camera senders are capped at 900 kbps, 24 fps, and up to 720p normally; the reduced profile uses 220 kbps,
15 fps, and up to 360p. Browser support for sender parameters varies; unsupported settings do not interrupt
the call. Screen sharing uses separate peer connections and is not modified by the camera quality monitor.
The camera-off suggestion disables the local camera track while preserving audio. Recovery never enables a
camera the user turned off.

The UI shows “Watching together” or “Catching up…” instead of exposing drift measurements. The local-file
sync thresholds and corrections remain documented in the sync model above.

```bash
node --import tsx --test tests/connection-quality.test.ts
```

## Privacy implementation

Room metadata is held in server memory: member names/IDs, the selected source, and playback state. Idle rooms
are deleted ten minutes after the last member leaves. The signaling server relays WebRTC negotiation messages;
it does not record media. Calls and screen shares use direct WebRTC connections where possible, Google's STUN
services for discovery, and optionally the configured TURN relay. Connection services can observe client IPs.

The web app stores the display name, call volume/mute preference, chime preference, and floating-call width in
local storage. A temporary reload token is stored in session storage for seat replacement. The extension stores `appOrigin` in Chrome sync storage and the current room code in the tab's
session storage. Invite creation reads the active tab URL. Additional host permissions and registered content
scripts persist until removed; implementation details are in the extension README. The public privacy page
keeps these disclosures in everyday language.

## Returning to a room

The latest 100 chat messages remain in server memory for the lifetime of the room. Incoming messages have a
quiet Web Audio chime; the sound toggle mutes it alongside the other room chimes. Reloads and reconnects
restore history without playing old message sounds. After the last seat is removed, the room and chat expire
after ten minutes; rejoining cancels that timer. An active room has no idle expiry.

The browser stores an active room session and media choices in session storage, and a room code/timestamp
in local storage for the homepage's temporary rejoin card. The card checks `GET /room-status/<id>` (existence
and expiry only, no participants or chat) and hides expired or dismissed records. Returning to a cached room
starts a new JoinCard rather than reusing a stopped media stream. Browser screen capture must be selected
again after a reload; the browser does not permit restoring the old capture automatically.

```bash
node e2e/refresh.mjs
node e2e/rejoin.mjs
```

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
