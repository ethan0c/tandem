# Chrome Web Store listing: Tandem – watch together

Copy each field into the Developer Dashboard (Store listing tab and Privacy tab).

## Store listing tab

| Field | Value |
|---|---|
| Title | Tandem – watch together *(comes from manifest)* |
| Summary | Sync playback on anime sites with your partner and keep a video call floating on top. *(comes from manifest)* |
| Description | Paste the contents of `description.txt` |
| Category | Entertainment |
| Language | English |
| Store icon (128x128) | `icon/store-icon-128x128.png` |
| Screenshots (1280x800, 24-bit PNG) | `screenshots/screenshot-1-1280x800.png`, `-2-`, `-3-` (upload in this order) |
| Small promo tile (440x280) | `promo/small-promo-tile-440x280.png` |
| Marquee promo tile (1400x560) | `promo/marquee-promo-tile-1400x560.png` |
| Global promo video | *(optional, leave empty)* |
| Official URL | None, unless you verify ilovemygf.site in Google Search Console |
| Homepage URL | https://www.ilovemygf.site/ |
| Support URL | https://github.com/ethan0c |
| Mature content | Off |

## Privacy tab

**Single purpose**

> Tandem syncs video playback between two people watching the same episode on supported anime sites and shows their video call in a floating panel over the player.

**Permission justifications**

- `storage`: Saves one setting, the Tandem app URL, so the popup and the content script use the same server. Nothing else is stored with this permission.
- Host permissions (content script on `*.miruro.tv`, `*.miruro.to`, `*.miruro.online`): The content script has to read and control the page's HTML5 `<video>` element (play, pause, seek, current time) to keep both viewers in sync, and inject the floating call panel. It runs only on these domains.
- Remote code: **No.** All JavaScript ships in the package. The floating panel is an iframe of the Tandem web app, which is a web page, not executed extension code.

**Data usage** (tick these)

- Website content: the video's playing/paused state and current time are sent to the Tandem server for the user's room.
- Personally identifiable information: the display name the user types is shared with others in the room (kept in memory only).
- Everything else: not collected.

Certify all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**: https://www.ilovemygf.site/privacy (the page is `src/app/privacy/page.tsx`; deploy it before submitting)

## Test instructions tab (for the reviewer)

1. Install the extension and open any episode on https://www.miruro.tv/.
2. Click the Tandem toolbar icon, then **Create a room**. A floating panel appears in the bottom-right corner.
3. Click **Copy invite** and open the copied link in a second Chrome profile with the extension installed.
4. Play, pause or seek in one window. The other window follows.
No login is needed.
