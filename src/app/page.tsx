import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { StartRoom } from "@/components/landing/StartRoom";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { RotatingHeadline } from "@/components/landing/RotatingHeadline";
import { RejoinRoom } from "@/components/landing/RejoinRoom";
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
  ["Miruro, with the extension", "Open the same episode on Miruro. Tandem keeps you watching together, with your call beside the video."],
  ["A file you both have", "Open the same video file on each computer. When one of you pauses or skips, the other follows."],
  ["Share a tab", "Share the browser tab playing your show, including its sound. Your partner watches along."],
];

const faq = [
  {
    q: "How do we start watching?",
    a: "Create a room and send your partner the link. Once they join, share the tab playing your show or choose a video file you both have. For Miruro, you can use the extension instead.",
  },
  {
    q: "Do we both need the same video file?",
    a: "Yes, if you watch a video file. You each need a copy on your computer. If you share a browser tab instead, only one of you needs the video. Turn on “Share tab audio” when choosing the tab so your partner can hear it.",
  },
  {
    q: "Does it work with Netflix or Prime Video?",
    a: "You can try the extension on these sites, but it may not work with every video. You both need access to the same episode, and ads can get you out of step. Some sites block screen sharing, so your partner may see a black screen.",
  },
  {
    q: "What does the extension do?",
    a: "It keeps your videos playing together and puts your call beside the show. You both need the extension and access to the same episode. It works with Miruro; other sites may not always work.",
  },
  {
    q: "Which browser should we use?",
    a: "Use Chrome or Edge on a computer to share a tab with sound. The extension also works in Brave. If you watch a file, MP4 and WebM are good options.",
  },
  {
    q: "Do I have to turn my camera on?",
    a: "No. You can watch with your camera and microphone off. You can also join without giving Tandem access to them.",
  },
  {
    q: "Does Tandem record the video or call?",
    a: "No. Tandem does not record your call or the video you watch. Video files stay on your computer. Room details are kept only while needed and deleted 10 minutes after everyone leaves.",
  },
  {
    q: "Can more than two people join?",
    a: "Yes, but Tandem works best for two. Bigger groups need a stronger internet connection.",
  },
  {
    q: "Is it free?",
    a: "Yes. It is free to use, and you do not need an account.",
  },
];

export default function Home() {
  return (
    <LandingMotion>
      {/* Theater */}
      <section className="hero-shell relative text-white">
        <header className="relative z-10">
          <HeaderFrame>
            <Link href="/" aria-label="Tandem home" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-4">
              <Logo size={24} />
            </Link>
            <nav aria-label="Main navigation" className="hero-nav flex items-center gap-1 text-sm text-zinc-400">
              <a href="#sync" className="hidden md:block">How it works</a>
              <a href="#sources" className="hidden md:block">Works with</a>
              <a href="#faq" className="hidden md:block">Questions</a>
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
            <RotatingHeadline />
            <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Watch the same moment, even when you are apart. Start a video call, share your show, and watch together.
            </p>
            <div id="start" className="mt-6 flex w-full scroll-mt-24 justify-center">
              <StartRoom tone="dark" />
            </div>
            <RejoinRoom />
          </div>
          <div className="hero-preview w-full">
            <Preview />
          </div>
        </div>
        {/* The planet sits behind the lower part of the preview, so the showcase stands on the horizon. */}
        <div aria-hidden="true" className="hero-horizon" />
      </section>

      {/* Works with */}
      <section id="sources" className="scroll-mt-10 pb-14 pt-16 sm:pb-20 sm:pt-24">
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
          <p className="mt-5 text-sm text-zinc-500">Some videos may not work with Tandem yet. You both need access to the same episode, and ads can get you out of step.</p>
        </div>
      </section>

      {/* Three ways to watch */}
      <section className="border-t border-white/10">
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
      <section id="sync" className="scroll-mt-20 border-t border-white/10">
        <div data-reveal className="mx-auto grid site-width gap-12 site-gutter py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <h2 className="font-display text-4xl font-medium leading-tight tracking-[-0.03em]">Pause, skip, and catch up together.</h2>
            <p className="mt-5 max-w-sm leading-relaxed text-zinc-400">If one video falls behind or stops to load, Tandem helps you get back to the same moment.</p>
          </div>
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {[
              ["Create a room", "Send your partner the room link so they can join."],
              ["Choose what to watch", "Share a browser tab, open a file you both have, or use the extension on Miruro."],
              ["Press play", "When you each open the same video, either of you can pause or skip and the other follows. Keep talking as you watch."],
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
              Add Tandem to your browser to watch on Miruro. You can also try it on the sites above, though some videos may not work yet.
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
      <section id="faq" className="scroll-mt-20 border-t border-white/10">
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
