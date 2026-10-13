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

## How it works

- **Next.js 16 + Tailwind 4** for the UI, served by a small custom Node server (`server.ts`) so Socket.IO can share
  the same port.
- **Socket.IO** carries room membership, playback sync (play / pause / seek), the shared video source, and WebRTC
  signaling. Rooms live in memory and are dropped ten minutes after the last person leaves.
- **WebRTC** connects browsers directly for audio and video. The newcomer always sends the offer, so there is no
  negotiation glare. STUN is Google's public server; set `NEXT_PUBLIC_TURN_*` (see `.env.example`) if you need a
  relay for strict NATs.
- **Sync model**: the server stamps every playback change with its own clock. Each client estimates its offset to
  the server clock with a few pings, computes where the media *should* be, and corrects drift every 500 ms: small
  drift nudges the playback rate by ±8 %, large drift hard-seeks.
- **Fullscreen** is requested on the whole room container, not the `<video>` element, so the draggable camera
  window stays on top.

## Video sources

| Source           | What happens                                                                            |
| ---------------- | --------------------------------------------------------------------------------------- |
| Direct link      | MP4 / WebM / HLS (`.m3u8`, via hls.js). Everyone loads the same URL.                   |
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
