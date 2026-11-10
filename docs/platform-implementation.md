# Anime and manga platform

The platform uses the approved site sketch and the existing Tandem typography, violet palette, dark surfaces, logo, and raised buttons. Home keeps its watch-together focus; the shared header links to Anime, Manga, Library, and account access, with Create a room as an action. The catalog hub remains available at `/discover`. The original homepage and watch-room flows remain available. This is the implemented core of the larger roadmap in `site-plan.md`.

## Available now

- `/anime` and `/manga`: live Kitsu metadata search, alternative-title search, genres, release year, status, popular/rating/newest sorting, and pagination. A clearly labeled saved selection is available when the upstream provider cannot be reached.
- `/title/[kind]/[id]`: artwork, synopsis, genres, rating, episode/chapter count, progress, favorites, follows, trailers, provider links, and a watch/read room action.
- `/library`: separate anime and manga filters, reading/watching status, favorites, progress, sorting, search, deletion, and JSON export.
- `/library/import`: full Weeb Central subscription-page pastes, simple manga lists and Tandem JSON backups. Title/Latest/Last Read/Status blocks are recognized; progress comes only from Last Read, including episode labels and decimals. None means not started; release status does not silently mark reading complete. Season-based progress is flagged and initially unselected for review. Up to 100 titles appear immediately; at most three metadata searches run concurrently. Exact matching, manual corrections and duplicate merging remain available. Imported or existing progress is preserved when catalog counts are behind.
- `/account` and `/account/reset`: Supabase email/password accounts, email confirmation handling, reset flow, and sign-out.
- Account libraries use Supabase RLS. Guest libraries remain browser-local. Export and import a guest library to move it into an account. Pending cloud writes and deletions are retained in a per-account outbox and retried on focus, reconnect, or manual sync. A database trigger rejects stale updates.
- `/rooms`: watch-room and reading-room creation, invite joining, and a watch-night planning link.
- Watch rooms: the host can choose anime from the catalog in the source dialog. The selected story is shared with other members. Playback continues through existing local files, tab sharing, or the extension.
- `/read/[id]`: local image reading, chapters, pages, left/right reading direction, paginated and vertical views, shared page navigation, host-controlled navigation, independent pages, chat, invitation links, reconnect recovery, saved reading position, and optional voice.

Reading pages stay on each participant's device. Everyone must select their own matching images in the same order. Selecting a new chapter does not download or automatically open its files. In vertical mode, choose a page to bring the room to it. Rooms and shared reading state are held in memory and expire under the existing room cleanup rules.

## Content integration

`/play/[kind]/[id]` supplies in-site video and chapter reading, page/direction/scroll controls, saved reading position, resumable watch position, source attribution, and a route into a shared room. In-site content availability is separate from metadata catalog coverage.

The first verified native sources are Namakura Gatana (Kitsu anime 4650, a public-domain silent film supplied by Internet Archive/Wikimedia Commons) and Ubunchu! chapter 12 (Kitsu manga 24249, an openly licensed English translation). The Ubunchu images are stored as resized WebP pages with the original attribution and license under `public/reader/ubunchu`. The original manga is CC BY-NC-SA 2.1 JP and the English translation CC BY-NC-SA 4.0; this source is restricted to non-commercial use and must be reviewed before adding commercial use. Credit names Hiroshi Seo, ASCII Media Works, Tarek Saier, and PublicDesert. No artwork or dialogue was added or removed.

The MangaDex adapter matches Kitsu/MyAnimeList identifiers before falling back to unambiguous names, supports chapter languages and paginated chapter lists, validates a chapter belongs to the selected series, and restricts page servers to provider hosts. The live catalog and chapter metadata worked in testing, but tested chapter page-server requests returned 404. Those failures are shown explicitly; the adapter is not claimed to have verified broad live chapter coverage. ReAnime and Weeb Central public endpoints returned anti-bot 403 responses, so neither is advertised as a working source. No anti-bot or decryption bypass was added.

Remote watch-room URLs must exactly match registered sources. Reading rooms share the selected provider chapter as well as page number, so late joiners load the same chapter automatically. Local page images remain supported.

Kitsu supplies metadata and artwork, not playable episodes or manga pages. Anime provider URLs are restricted to known HTTPS streaming-provider hosts. Where no direct link exists, a clearly labeled provider search is offered. Trailers use YouTube's privacy-enhanced embed. No unauthorized media proxy or scraping integration is included.

The saved catalog selection in `src/content/catalog.json` was fetched from Kitsu on 10 November 2026. In-process API caching lasts 15 minutes and is bounded to 200 requests. It is intentionally separate from private library data.

## Watch and read controls

Anime and manga use separate viewer components while keeping the existing raised buttons and sentence-case labels. Anime keeps native playback, seeking, volume and mobile inline playback, and adds ten-second seek buttons, speed, fullscreen, supported picture in picture, keyboard shortcuts, and format switching that preserves position and speed. Controls only list formats actually supplied by the source.

Manga supports page/scroll modes, left/right reading direction, fit-to-screen/width, fullscreen where supported, swipe and arrow-key navigation, page selection, and chapter selection with previous/next navigation. Alternate releases of the same chapter are skipped when advancing. Scroll mode tracks the visible reading page. Chapter completion is explicit, and neither viewer advances automatically. The selected reading settings survive chapter changes.

Episode/chapter navigation uses numbers rather than provider story titles. Unfinished titles are omitted from the rendered series list until the user explicitly reveals them or marks that content complete. Starting a chapter does not reveal its title. Comments are not implemented. Any future comments must be scoped to a series and episode/chapter, exclude content beyond the reader's confirmed progress, and require a separate reveal for spoiler-tagged text, previews and replies. This same restriction must apply to search, notifications and activity previews; a blurred comment body alone is insufficient.

## Loading and navigation

Title and player routes have dedicated Suspense/loading placeholders, and client-fetched uncached titles use the same title skeleton. Title-load failures offer retry. Chapter/episode transitions keep the previous viewer mounted with an explicit loading status and disable its controls until the requested unit arrives; failure preserves the previous content and offers retry. New chapter images reserve an image frame and show a page-loading state; adjacent pages preload. Existing catalog results and chapter lists stay visible while filters or list pages refresh. Empty search results use a skeleton during the next request rather than an incorrect empty-state message.

All loading motion respects reduced-motion preferences. No artificial minimum wait or timed progress percentage is introduced. Public metadata responses have a short browser cache; title and provider lookups run concurrently rather than serially. Signed chapter/playback responses remain uncached.

## Performance and visibility

Catalog artwork and the homepage preview use responsive WebP optimization with accurate sizes. Only the first catalog cards load eagerly at high priority; remaining artwork is lazy. Optimized images have a one-day minimum cache lifetime, and local licensed reader images have a seven-day public cache. Comic source quality is retained. Unsupported custom artwork hosts retain direct loading.

Public catalog requests share in-flight requests and a bounded 60-second memory cache (24 responses). Already-seen card metadata supplies a bounded title preview (96 entries). Playback URLs and private data are excluded. The account SDK loads for account actions, existing sessions or auth callbacks; guest browsing does not download it. The blocking first-visit intro was removed.

In the same local production payload comparison, guest catalog JavaScript fell from 896,062 to 664,390 decoded bytes (about 26%). Three representative 256px posters fell from 171,613 combined original bytes to 72,328 WebP bytes (about 58%). The homepage preview was 7,121,526 bytes as a PNG and 60,204 bytes as a 1080px WebP. These compare payloads, not field latency or every image/device/network.

Reader mode, direction and sizing persist across reloads. Fullscreen has a labeled action and an expanded viewport fallback with focus containment and scroll/focus restoration. Scroll chapters reserve page dimensions and mount images only near the viewport. Page-by-page preloading follows the current image, at low priority with at most two speculative requests; obsolete waiting batches are replaced. Save Data suppresses speculative requests. Explicit page jumps are instant rather than animating through intervening pages. A 120-page fixture verified windowed loading and a direct jump to page 60 in Chromium and WebKit.

Secondary text uses a readable semantic gray, important small catalog notes are at least 12px, input borders/placeholders are clearer, and refreshing results retain contrast. The rendered-background scan passed 612 visible text samples across nine routes in each of Chromium and WebKit, using 4.5:1 for ordinary text and 3:1 for large text. Occluded/inert/decorative UI is excluded. This is a targeted check, not a claim of full WCAG conformance.

Personal GitHub and ocelabs links/credits were removed from the public UI, privacy/terms contact sections and store-listing source. Media/license attribution remains.

## Supabase

The linked Tandem project is `appjtkiyiylosjcnkzpm`. Its public client settings are configured in ignored `.env.local`. The migration `20261110190000_library.sql` is applied and recorded in remote migration history.

On a different installation, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, apply the migration, and allow the installation's account and password-reset URLs in Supabase Auth redirect settings. Only the public key belongs in browser code. Project administration keys are not stored by the app.

`scripts/configure-supabase.mjs <project-ref>` can configure the public client settings through an authenticated Supabase CLI. `scripts/check-supabase.mjs <project-ref>` creates two disposable auth users, checks isolation and persistence, and removes the test users and library rows. It reads administration credentials into process memory only.

`scripts/check-supabase-browser.mjs <project-ref>` verifies guest SDK deferral, real browser sign-in, private cloud saves, session restoration and sign-out isolation. It sends no email and removes its disposable test account and rows. The user does not want an external email service. No email delivery or CAPTCHA provider was configured by this work. A future username/password plus CAPTCHA or social sign-in decision is separate from the existing email/password implementation; CAPTCHA alone cannot verify email ownership.

## Checks

```sh
node --import tsx --test tests/*.test.ts
npm run typecheck
npm run build
node e2e/reading-sync.mjs
node e2e/platform-mobile.mjs
node e2e/content.mjs
node e2e/viewer-controls.mjs
node e2e/loading.mjs
node e2e/reader-performance.mjs
node e2e/contrast.mjs
node e2e/weebcentral-import.mjs
node scripts/check-supabase.mjs <project-ref>
node scripts/check-supabase-browser.mjs <project-ref>
```

The socket integration check verifies shared positions, host controls, late joining, separate-room isolation, and reconnect restoration. The Supabase check verifies real password authentication, cloud save/load, user isolation, anonymous denial, stale-write rejection, and deletion tombstones.

## Remaining roadmap

Broader in-site episode and chapter sources still need working, permitted integrations; the two native proof sources are not a claim of a complete streaming catalog. Progress on external providers remains manual; local reader positions save automatically. Following a series currently saves a subscription preference; it does not yet generate release notifications.

Background release checks and notifications, personalized recommendations, avatars and public profiles, friends, additional importer formats, and the admin/moderation dashboard remain future phases. The UI does not advertise these as available. Supabase Auth redirect configuration and delivery of confirmation/reset emails should be tested for the eventual deployment origin before launch. Local development has not been deployed to production.

## Responsive verification

The shared header uses a second navigation row on smaller screens. Catalog filters use full-width search and a two-column phone layout. Labels use sentence case, metadata is plain text, and dropdown chevrons have a fixed inset. Icon buttons do not shrink and reader pagination uses square 44px controls. The hidden reading-room chat panel is clipped without widening the document.

The production browser checks passed 126 layout/interaction assertions across widths 320, 360, 375, 390, 414, 430, 768, 1024, and 1440 in Chromium, and 42 assertions across 320, 390, and 430 in WebKit. Checks cover eleven routes, import review, local reading, navigation overlap, horizontal overflow, and icon containment. Separate live tests verified native media playback, actual licensed chapter images, saved position/reload resume, late-joining readers, host controls, independent reading, and mobile-to-desktop watch-room play/pause sync. WebKit also decoded the actual MP4 and chapter WebP pages at phone width. Browser emulation does not replace testing on physical phones.

Additional viewer checks cover Chromium at 320, 390, 430, 768 and 1440px and WebKit at 320, 390 and 430px. They exercise spoiler reveals, chapter changes, RTL keys, page sizing, scroll progress, stable height during delayed chapter loads, video speed/seeking, button icon containment and layout. Native video format switching also preserves playback time and speed. Extra units in these tests are fixtures; images and video use the actual verified sources. Separate delayed-response tests exercise uncached title skeletons, reduced motion, failed title loads/retry and empty-result search loading in both browsers. Unit tests total 45 passing cases.
