# Anime and manga platform

The new experience starts at `/discover` and uses the existing Tandem typography, violet palette, dark surfaces, logo, and raised buttons. The original homepage and watch-room flows remain available. This is the implemented core of the larger roadmap in `site-plan.md`.

## Available now

- `/anime` and `/manga`: live Kitsu metadata search, alternative-title search, genres, release year, status, popular/rating/newest sorting, and pagination. A clearly labeled saved selection is available when the upstream provider cannot be reached.
- `/title/[kind]/[id]`: artwork, synopsis, genres, rating, episode/chapter count, progress, favorites, follows, trailers, provider links, and a watch/read room action.
- `/library`: separate anime and manga filters, reading/watching status, favorites, progress, sorting, search, deletion, and JSON export.
- `/library/import`: pasted manga lists and Tandem JSON backups, exact matching against title aliases, manual match correction, review, duplicate detection, and progress merging. Pasted lists are limited to 100 unique titles per batch. Weeb Central layouts vary; the parser does not claim to support every copied page layout.
- `/account` and `/account/reset`: Supabase email/password accounts, email confirmation handling, reset flow, and sign-out.
- Account libraries use Supabase RLS. Guest libraries remain browser-local. Export and import a guest library to move it into an account. Pending cloud writes and deletions are retained in a per-account outbox and retried on focus, reconnect, or manual sync. A database trigger rejects stale updates.
- `/rooms`: watch-room and reading-room creation, invite joining, and a watch-night planning link.
- Watch rooms: the host can choose anime from the catalog in the source dialog. The selected story is shared with other members. Playback continues through existing local files, tab sharing, or the extension.
- `/read/[id]`: local image reading, chapters, pages, left/right reading direction, paginated and vertical views, shared page navigation, host-controlled navigation, independent pages, chat, invitation links, reconnect recovery, saved reading position, and optional voice.

Reading pages stay on each participant's device. Everyone must select their own matching images in the same order. Selecting a new chapter does not download or automatically open its files. In vertical mode, choose a page to bring the room to it. Rooms and shared reading state are held in memory and expire under the existing room cleanup rules.

## Content integration

Kitsu supplies metadata and artwork, not playable episodes or manga pages. Anime provider URLs are restricted to known HTTPS streaming-provider hosts. Where no direct link exists, a clearly labeled provider search is offered. Trailers use YouTube's privacy-enhanced embed. No unauthorized media proxy or scraping integration is included.

The saved catalog selection in `src/content/catalog.json` was fetched from Kitsu on 10 November 2026. In-process API caching lasts 15 minutes and is bounded to 200 requests. It is intentionally separate from private library data.

## Supabase

The linked Tandem project is `appjtkiyiylosjcnkzpm`. Its public client settings are configured in ignored `.env.local`. The migration `20261110190000_library.sql` is applied and recorded in remote migration history.

On a different installation, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, apply the migration, and allow the installation's account and password-reset URLs in Supabase Auth redirect settings. Only the public key belongs in browser code. Project administration keys are not stored by the app.

`scripts/configure-supabase.mjs <project-ref>` can configure the public client settings through an authenticated Supabase CLI. `scripts/check-supabase.mjs <project-ref>` creates two disposable auth users, checks isolation and persistence, and removes the test users and library rows. It reads administration credentials into process memory only.

## Checks

```sh
node --import tsx --test tests/*.test.ts
npm run typecheck
npm run build
node e2e/reading-sync.mjs
node scripts/check-supabase.mjs <project-ref>
```

The socket integration check verifies shared positions, host controls, late joining, separate-room isolation, and reconnect restoration. The Supabase check verifies real password authentication, cloud save/load, user isolation, anonymous denial, stale-write rejection, and deletion tombstones.

## Remaining roadmap

Licensed in-site episode and chapter providers still need to be selected and integrated. Progress on external providers remains manual; local reader positions save automatically. Following a series currently saves a subscription preference; it does not yet generate release notifications.

Background release checks and notifications, personalized recommendations, avatars and public profiles, friends, additional importer formats, and the admin/moderation dashboard remain future phases. The UI does not advertise these as available. Supabase Auth redirect configuration and delivery of confirmation/reset emails should be tested for the eventual deployment origin before launch. Local development has not been deployed to production.
