import Image from "next/image";
import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { StartRoom } from "@/components/landing/StartRoom";
import { Preview } from "@/components/landing/Preview";

const GITHUB = "https://github.com/ethan0c";
const TOGETHER = "https://images.unsplash.com/photo-1601933470096-0e34634ffcde?w=1200&q=80";
const POSTERS = "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=1400&q=80";

const sources = ["Miruro, with the extension", "Direct MP4 and WebM links", "HLS streams", "A file you both have", "Sharing a tab"];

const log = [
  ["21:02", "you", "created the room"],
  ["21:03", "mia", "joined · camera on"],
  ["21:03", "you", "pasted haikyu-s2e11.mp4"],
  ["21:03", "▶", "play · both at 0:00"],
  ["21:14", "⏸", "mia paused at 11:20"],
  ["21:16", "▶", "play · drift 0.03s"],
  ["21:27", "⏭", "you skipped the opening · mia followed"],
  ["21:49", "■", "episode over · still on the call"],
];

const faq = [
  {
    q: "Does it work on Crunchyroll or Netflix?",
    a: "No. Their players use DRM, which no browser extension can drive. Tandem works with Miruro through the extension, and with any direct video link or file in the web app.",
  },
  {
    q: "What exactly does the extension do?",
    a: "It finds the video element on the page, mirrors your play, pause and seek to your partner, applies theirs to your player, and floats the call window on top. It needs no account and only stores the app URL.",
  },
  {
    q: "Do you ever see or store the video?",
    a: "Never. The server only relays timestamps and call signaling. Video comes from each person's own source, and the call runs peer to peer between your two browsers.",
  },
  {
    q: "Why is drift correction needed?",
    a: "Two computers never play at exactly the same speed, and buffering stalls one side. Tandem checks twice a second and speeds one player up or slows it down by a few percent until you match. You never notice it.",
  },
  {
    q: "More than two people?",
    a: "Yes, it works, but the call is a mesh, so each camera streams to every viewer. It is built and tuned for two.",
  },
  {
    q: "Is it free?",
    a: "Yes, and open source. Run it yourself or use the hosted version.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Theater */}
      <section className="bg-ink text-white">
        <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="Tandem home">
            <Logo size={28} light />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
            <a href="#sync" className="transition hover:text-white">How it syncs</a>
            <a href="#sources" className="transition hover:text-white">Sources</a>
            <a href="#faq" className="transition hover:text-white">Questions</a>
            <a href={GITHUB} target="_blank" rel="noreferrer" className="transition hover:text-white">GitHub</a>
          </nav>
          <ButtonLink href="#start" size="sm">
            Create a room
          </ButtonLink>
        </header>

        <div className="mx-auto max-w-6xl px-5 pb-0 pt-14 sm:pt-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="font-display text-[2.75rem] font-bold leading-[0.95] tracking-[-0.03em] sm:text-7xl">
                Same episode.
                <br />
                Same second.
                <br />
                <span className="text-brand-400">Watch together.</span>
              </h1>
            </div>
            <div className="lg:pb-2">
              <p className="max-w-md text-lg leading-relaxed text-zinc-300">
                Tandem locks two video players to the same frame and keeps your partner&apos;s camera floating over the
                show. Paste a link, or use the extension on Miruro.
              </p>
              <div id="start" className="mt-7 scroll-mt-24">
                <StartRoom tone="dark" />
              </div>
              <p className="mt-3 font-mono text-[11px] text-zinc-500">no account · no app · nothing stored</p>
            </div>
          </div>
          <div className="mt-14 translate-y-10 sm:translate-y-16">
            <Preview />
          </div>
        </div>
      </section>

      {/* Works with */}
      <section id="sources" className="scroll-mt-10 border-b border-cream-200 bg-cream pb-10 pt-24 sm:pt-32">
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Works with</p>
        </div>
        <div className="mt-4 overflow-hidden" aria-hidden="true">
          <div className="marquee gap-0">
            {[...sources, ...sources].map((s, i) => (
              <span key={i} className="flex items-center gap-6 pr-6 font-display text-2xl font-bold text-ink sm:text-3xl">
                {s}
                <LogoMark size={22} />
              </span>
            ))}
          </div>
        </div>
        <ul className="sr-only">
          {sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      {/* How it syncs */}
      <section id="sync" className="scroll-mt-20 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">How it stays in sync</p>
            <p className="mt-6 font-display text-[6rem] font-bold leading-none tracking-[-0.04em] text-ink sm:text-[8rem]">
              0.1<span className="text-brand-600">s</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-zinc-600">
              Typical gap between two players on a normal connection.
            </p>
          </div>
          <ol className="divide-y divide-cream-200 border-y border-cream-200">
            {[
              ["The server stamps every change", "Play, pause, seek. Each one is recorded with the server's clock, not yours, so both browsers agree on when it happened."],
              ["Each browser learns its clock offset", "A few pings on join tell the page how far its clock is from the server's. From then on it can compute where the video should be at any instant."],
              ["Twice a second, a nudge", "If you are a little behind, your player runs at 108% speed until you catch up. A little ahead, 92%. More than a second and a half out, it seeks."],
            ].map(([t, b], i) => (
              <li key={t} className="grid gap-3 py-7 sm:grid-cols-[3rem_1fr]">
                <span className="font-mono text-sm text-brand-600">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">{t}</h3>
                  <p className="mt-2 max-w-lg leading-relaxed text-zinc-600">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* A night on Tandem */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Session log</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1] tracking-[-0.03em] sm:text-5xl">
              Share one link and start watching.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-zinc-400">
              The room keeps nothing. No history, no account, no &ldquo;continue watching&rdquo;. When the last person
              leaves, it is gone.
            </p>
            <div className="relative mt-10 aspect-[4/3] overflow-hidden rounded-xl border border-white/10">
              <Image src={TOGETHER} alt="Two people laughing together at a laptop" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-zinc-200">
                the call stays open between episodes
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-ink-800 p-1">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 font-mono text-[11px] text-zinc-500">
              <span>room · k3f9-x2qa</span>
              <span>tue 21:02 → 21:49</span>
            </div>
            <ul className="divide-y divide-white/5 font-mono text-[13px]">
              {log.map(([t, who, what]) => (
                <li key={t + what} className="grid grid-cols-[3.5rem_2.5rem_1fr] gap-2 px-4 py-3">
                  <span className="text-zinc-500">{t}</span>
                  <span className={who.length > 1 ? "text-brand-300" : "text-zinc-200"}>{who}</span>
                  <span className="text-zinc-300">{what}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Extension */}
      <section className="bg-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[1fr_1fr] lg:py-28">
          <div className="relative aspect-[5/4] overflow-hidden rounded-xl border border-cream-200">
            <Image src={POSTERS} alt="A wall of anime posters" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">The extension</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1] tracking-[-0.03em] text-ink sm:text-5xl">
              Sync the player on the site you already use.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-zinc-600">
              Streaming sites run their own player, and a web page cannot touch it. The Tandem extension can. It
              drives the player on the page and drops the call window on top, so you watch on the site you already
              use, in full quality, both of you in control.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-700">
              <li className="flex gap-3"><span className="text-brand-600">—</span> Miruro today. Any site with a plain HTML5 player is a one-line addition.</li>
              <li className="flex gap-3"><span className="text-brand-600">—</span> Invite links are the episode URL with the room on the end.</li>
              <li className="flex gap-3"><span className="text-brand-600">—</span> The player&apos;s fullscreen still works, with the call on top.</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={GITHUB} variant="dark">
                Get the extension
              </ButtonLink>
              <ButtonLink href="#faq" variant="light">
                Which sites work?
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-cream-200 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.6fr_1.4fr] lg:py-28">
          <h2 className="font-display text-4xl font-bold leading-[1] tracking-[-0.03em] text-ink">Questions</h2>
          <div className="divide-y divide-cream-200 border-y border-cream-200">
            {faq.map(({ q, a }) => (
              <details key={q} className="faq group">
                <summary className="flex items-center justify-between gap-6 py-5 font-display text-lg font-bold text-ink">
                  {q}
                  <span className="faq-plus shrink-0 font-mono text-xl font-normal text-brand-600 transition">+</span>
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Last call */}
      <section className="bg-brand-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] sm:text-7xl">
            Start a room
            <br />
            in one click.
          </h2>
          <div className="w-full max-w-xl">
            <StartRoom tone="brand" />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
