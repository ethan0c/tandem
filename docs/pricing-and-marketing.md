# Pricing and marketing notes

Goal: **$3–10k a month**, steady, with little upkeep. Not a venture-scale company.

## Pricing

Free forever, because free is what spreads:

- Watching in sync, the call, reactions, BRB, ad waiting
- Planning watch nights, invite links, joining from a phone
- "Our shows" (recent history, resume)

**Tandem Plus**: one purchase covers the couple.

| Plan | Price | Notes |
|---|---|---|
| Monthly | $3.99 | For trying it out |
| Yearly | $29 | The one to push: about 40% off monthly |
| Lifetime | $59 | For people who hate subscriptions |

What Plus adds (sentimental, not basic):

- **Yearly recap**: "our year together" with hours, episodes, streaks and favourite shows. Shareable. Build this first.
- Unlimited history, synced across devices and between both partners
- Custom reactions and themes
- Always-reliable calls (a relay server for networks that block direct calls)
- **Gift it**: anniversaries, Valentine's Day and birthdays are the buying moments

Never charge for syncing or the call itself. Never show ads: the privacy promise is part of the pitch.

## The math

At a blended ~$2.50 per couple per month (most on the yearly plan):

| Monthly income | Paying couples | Active couples needed at 3–5% paying |
|---|---|---|
| $3k | ~1,200 | 24k–40k |
| $5k | ~2,000 | 40k–70k |
| $10k | ~4,000 | 80k–130k |

A one-time-only price does not get there steadily: $5k a month at $20 means 250 new sales every month, forever. Lifetime exists for the people who want it, but the yearly plan carries the business.

## Running costs (estimates)

- Railway (socket server) + Vercel (site): ~$5–40/month at this scale
- **TURN relay**: the only cost that grows with users. Roughly 10–20% of calls need it, and relayed video is about 0.5–1 GB per hour. Cloudflare and Metered sell it by the GB. Free users get it within a monthly cap; Plus gets it unlimited.
- Lemon Squeezy: ~5% + 50¢ per sale, and it handles sales tax and VAT worldwide (it is the merchant of record)

## Keeping it low maintenance

- **Payments**: Lemon Squeezy checkout, which emails a license key. The buyer pastes the key into the extension. No accounts and no database, so "no account needed" survives.
- **Keep Plus client-side**: the recap, history and themes run on data the extension already stores.
- **The real upkeep is streaming sites changing their players.** Keep the supported list short, and check each site once a month (play, pause, seek, an ad, the next episode). Ad detection is per site (`AD_SELECTORS` in `extension/content.js`).
- Run `npm run e2e:resilience` before each release.

## Marketing

**Positioning**: long-distance date night, on the same couch. Teleparty is a group chat in a sidebar; Tandem is two faces beside the show.

**Built-in growth loop**: every invite brings in a new person. The invite page already does the setup, and its link preview reads "Sam invited you to watch …". Keep that path fast and pretty. It is the cheapest acquisition there is.

**Where long-distance couples already are**:

- Reddit: long-distance relationship communities. Be a person who built a thing, not an ad. Share the free tool, answer questions, and follow each subreddit's self-promotion rules.
- TikTok and Instagram: short clips of a real watch night (call over the show, hearts floating up, both reacting to the same moment). Couple creators with long-distance content are the best fit; send them Plus for free.
- Discord servers for anime and show communities: watch-together nights.

**Timing**: plan pushes for Valentine's Day, holidays when people are apart, and the start of university terms (couples split between cities).

**Chrome Web Store**:

- The name, short description and first screenshot do most of the work. Screenshot 1 should be the call floating over a show.
- Do not list streaming services in the description: that got 0.2.1 rejected for keyword spam. Say "popular streaming sites".
- Ask for reviews after a good watch night (for example after the third night together), never on first use.

**Launches**: Product Hunt and a "Show HN"-style post once Plus exists, so the traffic has something to buy.

**Content that keeps working**: short pages like "how to watch [show] together long distance" that answer the question and point to Tandem. Write a few, not a content farm.

## What to measure

- Weekly active couples (both people in a room for 10+ minutes)
- Invites sent → invites opened → partner joined (the growth loop)
- Watch nights per couple per week (retention)
- Plus conversion, and which feature people bought it for

## Order of work

1. Ship 0.3.0 and get it approved.
2. Grow on the free version: invites, Reddit and TikTok.
3. Add Plus with the yearly recap and license keys.
4. Add the relay and other paid features as costs and demand show up.
