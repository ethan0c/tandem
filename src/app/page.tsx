import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { StartRoom } from "@/components/landing/StartRoom";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { Preview } from "@/components/landing/Preview";

const GITHUB = "https://github.com/ethan0c";

const streamingSites: [name: string, slug: string, invert?: boolean][] = [
  ["Netflix", "netflix"],
  ["Prime Video", "primevideo"],
  ["YouTube", "youtube"],
  ["Disney+", "disneyplus"],
  ["Hulu", "hulu"],
  ["Max", "max"],
  ["Crunchyroll", "crunchyroll"],
  ["Apple TV+", "appletv", true],
  ["Paramount+", "paramountplus"],
  ["Peacock", "peacock"],
];

const ways = [
  ["Miruro, with the extension", "You both open the episode on Miruro. The extension keeps the two players in sync and adds the call."],
  ["A file you both have", "Each of you opens your own copy of the video. Tandem lines up playback between them."],
  ["Share a tab", "One of you shares the tab with audio. The other watches the stream, and either can pause."],
];

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
      <section className="hero-shell relative overflow-hidden text-white">
        <header className="relative z-10">
          <HeaderFrame>
            <Link href="/" aria-label="Tandem home" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-4">
              <Logo size={24} />
            </Link>
            <nav aria-label="Main navigation" className="hero-nav flex items-center gap-1 text-sm text-zinc-400">
              <a href="#sync" className="hidden md:block">How it works</a>
              <a href="#sources" className="hidden md:block">Works with</a>
              <a href="#faq" className="hidden md:block">FAQ</a>
              <a href={GITHUB} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1">
                GitHub <ArrowUpRight className="size-3.5" />
              </a>
              <span aria-hidden="true" className="mx-2 hidden h-5 w-px bg-white/10 md:block" />
              <ButtonLink href="#start" size="sm">Create a room</ButtonLink>
            </nav>
          </HeaderFrame>
        </header>

        <div className="hero-body relative z-10 mx-auto flex site-width flex-1 flex-col items-center site-gutter">
          <div className="hero-intro flex flex-col items-center text-center">
            <h1 className="hero-title font-display font-bold tracking-[-0.04em]">
              Watch anime together.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              A video call and synced playback in one room. Share a tab, open a file, or use the extension on your streaming site.
            </p>
            <div id="start" className="mt-6 flex w-full scroll-mt-24 justify-center">
              <StartRoom tone="dark" />
            </div>
          </div>
          <div className="hero-preview w-full">
            <Preview />
          </div>
        </div>
        {/* The planet sits behind the lower part of the preview, so the showcase stands on the horizon. */}
        <div aria-hidden="true" className="hero-horizon" />
      </section>

      {/* Works with */}
      <section id="sources" className="scroll-mt-10 bg-ink pb-14 pt-16 sm:pb-20 sm:pt-24">
        <div data-reveal className="mx-auto site-width site-gutter">
          <h2 className="font-display text-3xl font-medium tracking-[-0.03em] sm:text-4xl">Works with</h2>
          <p className="mt-3 text-sm text-zinc-400">Watch on your usual site with the Tandem extension.</p>
          <ul className="service-logos my-10 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 sm:gap-y-14 lg:grid-cols-5">
            {streamingSites.map(([name, slug, invert]) => (
              <li key={slug} className="flex h-24 items-center justify-center sm:h-28">
                <Image
                  src={`/logos/${slug}.svg`}
                  alt={name}
                  width={200}
                  height={96}
                  data-invert={invert || undefined}
                  className="service-logo h-20 w-full max-w-44 object-contain sm:h-24"
                />
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-zinc-500">Support for these sites is experimental. Both viewers need access to the same episode; ads can interrupt sync.</p>
        </div>
      </section>

      {/* Three ways to watch */}
      <section className="border-t border-white/10 bg-ink">
        <div data-reveal className="mx-auto site-width site-gutter py-16 lg:py-20">
          <h2 className="font-display text-3xl font-medium tracking-[-0.03em] sm:text-4xl">Three ways to watch</h2>
          <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {ways.map(([t, b]) => (
              <li key={t} className="border-t border-white/15 pt-5">
                <h3 className="font-display text-lg font-medium">{t}</h3>
                <p className="mt-2 leading-relaxed text-zinc-400">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="sync" className="scroll-mt-20 border-t border-white/10 bg-ink">
        <div data-reveal className="mx-auto grid site-width gap-12 site-gutter py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <h2 className="font-display text-4xl font-medium leading-tight tracking-[-0.03em]">Pause, skip, and catch up together.</h2>
            <p className="mt-5 max-w-sm leading-relaxed text-zinc-400">Tandem adjusts playback when one of you falls behind, including after buffering.</p>
          </div>
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {[
              ["Create a room", "Send your partner the room link so they can join."],
              ["Choose what to watch", "Share a browser tab, open a file you both have, or use the extension on Miruro."],
              ["Press play", "Either of you can pause or skip. Your videos stay in sync, and you can keep talking on the call."],
            ].map(([t, b], i) => (
              <li key={t} className="grid gap-3 py-7 sm:grid-cols-[3rem_1fr]">
                <span className="font-sans text-sm text-zinc-500">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-xl font-medium">{t}</h3>
                  <p className="mt-2 max-w-lg leading-relaxed text-zinc-400">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Extension */}
      <section className="extension-shell relative overflow-hidden text-white">
        <div data-reveal className="relative mx-auto grid site-width gap-10 site-gutter py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-28">
          <div>
            <h2 className="font-display text-4xl font-medium leading-[1] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Watch on the site you already use.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-brand-100">
              Use the extension on Miruro, or try experimental support for Netflix, Prime Video, YouTube, Disney+, Hulu, Max, Crunchyroll, Apple TV+, Paramount+, and Peacock.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <ButtonLink href={GITHUB} variant="light" size="lg">
              Get the extension
            </ButtonLink>
            <ButtonLink href="#faq" variant="ghost" size="lg">
              Which sites work?
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-white/10 bg-ink">
        <div data-reveal className="mx-auto grid site-width gap-10 site-gutter py-20 lg:grid-cols-[0.6fr_1.4fr] lg:py-28">
          <h2 className="font-display text-4xl font-medium leading-[1] tracking-[-0.03em]">Questions</h2>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {faq.map(({ q, a }) => (
              <details key={q} className="faq group">
                <summary className="flex items-center justify-between gap-6 py-5 font-display text-lg font-medium">
                  {q}
                  <span aria-hidden="true" className="faq-plus shrink-0 font-sans text-xl font-normal text-zinc-500 transition">+</span>
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-zinc-400">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Last call */}
      <section className="cta-shell border-y border-white/10 text-white">
        <div data-reveal className="mx-auto flex site-width flex-col items-start gap-8 site-gutter py-20 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-4xl font-medium leading-tight tracking-[-0.03em] sm:text-5xl">
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
