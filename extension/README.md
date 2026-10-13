# Tandem browser extension

Syncs the video player on supported anime sites with your partner, and floats the Tandem call window on top.
The web app's server does all the work; this extension only bridges the page's `<video>` element to it.

## Install (Chrome, Edge, Brave, Arc)

1. Run the Tandem web app (`npm run dev` in the repo root, or your deployed URL).
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick this `extension/` folder.
3. The extension talks to `https://www.ilovemygf.site` by default. For local development, open the popup, expand **Settings**, and set the **Tandem website address**.

## Use

1. Open an episode on miruro.tv.
2. Click the Tandem icon and press **Create a room**. A floating panel appears. Pick a name, allow the camera, join.
3. Press **Copy invite** in the popup and send the link. It is the episode URL with `#tandem=<room>` on the end,
   so your partner just opens it (with the extension installed) and lands in the same room.
4. Play, pause and seek on either side. The other side follows, and drift is corrected automatically.

The player's own fullscreen button still works: the extension swaps it for a page-level fullscreen so the call stays
visible.

## Supported sites

Domains are listed under `content_scripts.matches` in `manifest.json`. Additional sites can be enabled from the popup.
Compatibility depends on the site’s player; see the experimental coverage and test checklist below.

## How it talks to the app

- The overlay is an iframe of `<app>/overlay/<room>`. It owns the socket connection and the WebRTC call.
- Page → overlay: `tandem:event` (user pressed play / pause / seeked), `tandem:status`, `tandem:drift`.
- Overlay → page: `tandem:apply` with `{ playing, time, localUpdatedAt }` whenever the other side changes playback.
- Frames inside the tab talk through `background.js`, since the player is sometimes inside an iframe.

## Expanded site coverage (experimental)

Version 0.2 adds injection on Netflix, Prime Video (`primevideo.com` and the US Amazon video paths),
YouTube, Disney+, Hulu, Max (including `hbomax.com`), Crunchyroll, Apple TV+, Paramount+, and Peacock.
These are ten initial targets, not a traffic ranking or a verified compatibility claim. Miruro remains included.
Each viewer must have authorized access to the same episode. DRM does not itself prevent synchronizing controls;
Tandem does not extract or redistribute protected media.

Other HTTP/HTTPS sites can be enabled from the popup with a per-origin permission request. Access is persistent,
so invite links work after reloading. Cross-origin embedded players need separate permission for their origin;
otherwise their video may not be discovered. Browser internal pages and extension-store pages cannot be enabled.

The generic controller searches visible videos and open shadow roots, re-scans after navigation and player replacement,
and elects one player frame per tab. This is generic HTML5 control, not verified service-specific adapters.
Ads, differing episode versions, site player overrides, autoplay restrictions, and policies blocking the call iframe
can prevent correct operation. Site-level ad handling, episode identity matching, and a separate-call-window fallback
are not implemented yet. Do not label these services fully supported before signed-in browser tests.

### Manual acceptance checks for each service

- Two authorized accounts open the same episode; create/join and confirm the call panel loads.
- Pause, resume, and seek in both directions; test after buffering and a page reload.
- Navigate to another episode and verify no stale seek; compare both episode titles before resuming.
- Check fullscreen, autoplay prompts, camera/microphone permissions, and embedded players.
- Test an ad-supported plan separately. Do not expect synchronization across unequal ads.
