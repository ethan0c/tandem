# Chrome Web Store listing: Tandem – watch together

Copy each field into the Developer Dashboard (Store listing tab and Privacy tab).

## Store listing tab

| Field | Value |
|---|---|
| Title | Tandem – watch together *(comes from manifest)* |
| Summary | Watch your favorite shows together with a video call beside the video. Some streaming sites may not work yet. *(comes from manifest)* |
| Description | Paste the contents of `description.txt`. Don't list streaming services by name: v0.2.1 was rejected for "excessive keywords" (Yellow Argon) over that list |
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

> Tandem syncs video playback between two people watching the same episode on a streaming site and shows their video call in a floating panel over the player.

**Permission justifications**

- `storage`: Saves the Tandem app URL setting, so the popup and the content script use the same server. Also keeps "Our shows" on the device only: up to 30 episodes watched in a Tandem room (page URL and title, room code, playback position, time watched together) and minutes watched together per day for the streak counter. None of it leaves the browser.
- `activeTab` and `scripting`: When the user presses **Enable on this site** in the popup on a site that is not listed in the manifest, Tandem injects its own packaged `content.js` and `content.css` into that tab and registers them for that site, so invite links keep working after a reload. Nothing runs on a site until the user turns it on there.
- Host permissions (content script on the streaming sites listed in the manifest): The content script has to read and control the page's HTML5 `<video>` element (play, pause, seek, current time) to keep both viewers in sync, and inject the floating call panel. It does not read page content beyond the video element.
- Optional host permissions (`https://*/*`, `http://*/*`): Requested for one origin at a time, only when the user presses **Enable on this site** for that site. Never requested up front.
- Remote code: **No.** All JavaScript ships in the package. The floating panel is an iframe of the Tandem web app, which is a web page, not executed extension code.

**Data usage** (tick these)

- Website content: the video's playing/paused state and current time are sent to the Tandem server for the user's room. Whether an ad is showing (YouTube only) is sent as a yes/no so the partner's video waits.
- Web history: the page URL and title of episodes watched in a room are stored locally for "Our shows". When the user copies an invite, the current episode URL and title are put in that link so the partner lands on the same episode; Tandem does not store them.
- Personally identifiable information: the display name the user types is shared with others in the room (kept in memory only).
- Everything else: not collected.

Certify all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**: https://www.ilovemygf.site/privacy (the page is `src/app/privacy/page.tsx`; deploy it before submitting)

## Test instructions tab (for the reviewer)

1. Install the extension and open any video on https://www.youtube.com/.
2. Click the Tandem toolbar icon, then **Create a room**. A floating panel appears in the bottom-right corner.
3. Click **Copy invite** and open the copied link in a second Chrome profile with the extension installed.
4. Play, pause or seek in one window. The other window follows.
No login is needed.
