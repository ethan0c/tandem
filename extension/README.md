# Tandem browser extension

Syncs the video player on supported anime sites with your partner, and floats the Tandem call window on top.
The web app's server does all the work; this extension only bridges the page's `<video>` element to it.

## Install (Chrome, Edge, Brave, Arc)

1. Run the Tandem web app (`npm run dev` in the repo root, or your deployed URL).
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick this `extension/` folder.
3. If the app is not on `http://localhost:3000`, open the popup, expand **Settings**, and set the app URL.

## Use

1. Open an episode on miruro.tv.
2. Click the Tandem icon and press **Create a room**. A floating panel appears. Pick a name, allow the camera, join.
3. Press **Copy invite** in the popup and send the link. It is the episode URL with `#tandem=<room>` on the end,
   so your partner just opens it (with the extension installed) and lands in the same room.
4. Play, pause and seek on either side. The other side follows, and drift is corrected automatically.

The player's own fullscreen button still works: the extension swaps it for a page-level fullscreen so the call stays
visible.

## Supported sites

Domains are listed under `content_scripts.matches` in `manifest.json`. Any site with a plain HTML5 `<video>` (no DRM)
should work once its domain is added. `http://127.0.0.1/*` is there for the local test page and can be removed.

## How it talks to the app

- The overlay is an iframe of `<app>/overlay/<room>`. It owns the socket connection and the WebRTC call.
- Page → overlay: `tandem:event` (user pressed play / pause / seeked), `tandem:status`, `tandem:drift`.
- Overlay → page: `tandem:apply` with `{ playing, time, localUpdatedAt }` whenever the other side changes playback.
- Frames inside the tab talk through `background.js`, since the player is sometimes inside an iframe.
