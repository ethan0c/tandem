import Link from "next/link";
import Image from "next/image";
import { CodeXml, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { StartRoom } from "@/components/landing/StartRoom";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { Preview } from "@/components/landing/Preview";

const GITHUB = "https://github.com/ethan0c";

const streamingSites = [
  ["Netflix", "netflix"],
  ["Prime Video", "primevideo"],
  ["YouTube", "youtube"],
  ["Disney+", "disneyplus"],
  ["Hulu", "hulu"],
  ["Max", "max"],
  ["Crunchyroll", "crunchyroll"],
  ["Apple TV+", "appletv"],
  ["Paramount+", "paramountplus"],
  ["Peacock", "peacock"],
];

const sources = ["Miruro, with the extension", "A file you both have", "Sharing a tab"];

const faq = [
  {
    q: "How do we start watching?",
    a: "Create a room and send your partner the link. Once they join, share the tab playing your show or choose a video file you both have. For Miruro, you can use the extension instead.",
  },
  {
    q: "Do we both need the same video file?",
    a: "Yes, if you choose a local file. Each person opens their own copy, and Tandem keeps playback in sync. With tab sharing, only the person sharing needs the video. Select Share tab audio in the browser picker so your partner can hear it.",
  },
  {
    q: "Does it work with Netflix or Prime Video?",
    a: "The extension has experimental support for Netflix and Prime Video, plus other major streaming sites. Each person needs their own access to the same episode. Compatibility varies, especially with ads. Tab sharing can still show a black screen for protected video.",
  },
  {
    q: "What does the extension do?",
    a: "It syncs the video player on the page and adds a floating call. Both people need the extension and access to the same episode. Miruro is included; support for other streaming sites is experimental.",
  },
  {
    q: "Which browser should we use?",
    a: "Tab sharing with audio works best in Chrome or Edge on desktop. The extension supports Chrome, Edge, and Brave. Local files must be in a format your browser can play, such as MP4 or WebM.",
  },
  {
    q: "Do I have to turn my camera on?",
    a: "No. You can turn your camera and microphone off and still watch together. You can also join if you decline the browser’s camera and microphone permissions.",
  },
  {
    q: "Does Tandem record the video or call?",
    a: "No. Local files stay on your computer. Shared tabs and calls stream between participants, with a relay if needed to connect. The server holds room details temporarily and deletes them 10 minutes after everyone leaves.",
  },
  {
    q: "Can more than two people join?",
    a: "Yes, but Tandem works best for two. Larger calls use more bandwidth because each person connects to everyone else.",
  },
  {
    q: "Is it free?",
    a: "Yes. Tandem is free and open source, with no account required.",
  },
];

export default function Home() {
  return (
    <LandingMotion>
      {/* Theater */}
      <section className="hero-shell bg-ink text-white">
        <header className="hero-header mx-auto flex w-full site-width items-center justify-between gap-4 site-gutter">
          <Link href="/" aria-label="Tandem home" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-4">
            <Logo size={26} light />
          </Link>
          <nav aria-label="Main navigation" className="hero-nav hidden items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs text-zinc-300 md:flex">
            <a href="#sync">How it works</a>
            <a href="#sources">Works with</a>
            <a href="#faq">Questions</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={GITHUB} target="_blank" rel="noreferrer" aria-label="GitHub (opens in a new tab)" className="hero-github flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300">
              <CodeXml className="size-4" />
            </a>
            <ButtonLink href="#start" size="sm">
              Create a room <ArrowUpRight className="size-3.5" />
            </ButtonLink>
          </div>
        </header>

        <div className="hero-body mx-auto flex w-full site-width flex-1 flex-col items-center justify-center site-gutter">
          <div className="hero-preview w-full">
            <Preview />
          </div>
          <div className="hero-intro grid w-full items-center gap-5 md:grid-cols-[1fr_1.15fr] md:gap-10">
            <div>
              <h1 className="hero-title font-display font-bold tracking-[-0.03em]">
                Watch anime<br />
                <span className="text-brand-400">together.</span>
              </h1>
            </div>
            <div className="min-w-0">
              <p className="max-w-lg text-sm leading-relaxed text-zinc-300 sm:text-base">
                A video call and synced playback, in one room. Share a tab, open a file, or use the extension on your streaming site.
              </p>
              <div id="start" className="mt-4 scroll-mt-24">
                <StartRoom tone="dark" />
              </div>
              <p className="mt-2 text-xs text-zinc-400">No signup. Just send your partner the link.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Works with */}
      <section id="sources" className="scroll-mt-10 border-b border-cream-200 bg-cream py-14 sm:py-20">
        <div data-reveal className="mx-auto site-width site-gutter">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Works with</h2>
          <p className="mt-3 text-sm text-zinc-600">Watch on your usual site with the Tandem extension.</p>
          <ul className="service-logos my-10 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 sm:gap-y-14 lg:grid-cols-5">
            {streamingSites.map(([name, slug]) => (
              <li key={slug} className="flex h-24 items-center justify-center sm:h-28">
                <Image src={`/logos/${slug}.svg`} alt={name} width={200} height={96} className="service-logo h-20 w-full max-w-44 object-contain sm:h-24" />
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-zinc-500">Support for these sites is experimental. Both viewers need access to the same episode; ads can interrupt sync.</p>
          <ul className="source-chips mt-6 flex flex-wrap gap-3">
            {sources.map((source) => (
              <li key={source} className="rounded-full border border-cream-200 bg-white px-4 py-2 text-sm text-zinc-700">{source}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="sync" className="scroll-mt-20 bg-white">
        <div data-reveal className="mx-auto grid site-width gap-12 site-gutter py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <p className="font-sans text-[11px] font-medium text-zinc-500">How it works</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-ink">Pause, skip, and catch up together.</h2>
            <p className="mt-5 max-w-sm leading-relaxed text-zinc-600">Tandem adjusts playback when one of you falls behind, including after buffering.</p>
          </div>
          <ol className="divide-y divide-cream-200 border-y border-cream-200">
            {[
              ["Create a room", "Send your partner the room link so they can join."],
              ["Choose what to watch", "Share a browser tab, open a file you both have, or use the extension on Miruro."],
              ["Press play", "Either of you can pause or skip. Your videos stay in sync, and you can keep talking on the call."],
            ].map(([t, b], i) => (
              <li key={t} className="grid gap-3 py-7 sm:grid-cols-[3rem_1fr]">
                <span className="font-sans text-sm text-brand-600">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">{t}</h3>
                  <p className="mt-2 max-w-lg leading-relaxed text-zinc-600">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Extension */}
      <section className="bg-brand-700 text-white">
        <div data-reveal className="mx-auto site-width site-gutter py-16">
          <div>
            <p className="font-sans text-[11px] font-medium text-brand-200">The extension</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1] tracking-[-0.03em] text-white sm:text-5xl">
              Watch on the site you use.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-brand-100">
              Use the extension on Miruro, or try experimental support for Netflix, Prime Video, YouTube, Disney+, Hulu, Max, Crunchyroll, Apple TV+, Paramount+, and Peacock.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={GITHUB} variant="light">
                Get the extension
              </ButtonLink>
              <ButtonLink href="#faq" variant="ghost">
                Which sites work?
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-cream">
        <div data-reveal className="mx-auto grid site-width gap-10 site-gutter py-20 lg:grid-cols-[0.6fr_1.4fr] lg:py-28">
          <h2 className="font-display text-4xl font-bold leading-[1] tracking-[-0.03em] text-ink">Questions</h2>
          <div className="divide-y divide-cream-200 border-y border-cream-200">
            {faq.map(({ q, a }) => (
              <details key={q} className="faq group">
                <summary className="flex items-center justify-between gap-6 py-5 font-display text-lg font-bold text-ink">
                  {q}
                  <span aria-hidden="true" className="faq-plus shrink-0 font-sans text-xl font-normal text-brand-600 transition">+</span>
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Last call */}
      <section className="border-b border-white/10 bg-ink text-white">
        <div data-reveal className="mx-auto flex site-width flex-col items-start gap-8 site-gutter py-20 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
            Start watching together.
          </h2>
          <div className="w-full max-w-xl">
            <StartRoom tone="dark" />
          </div>
        </div>
      </section>

      <Footer />
    </LandingMotion>
  );
}
