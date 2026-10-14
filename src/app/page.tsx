import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarHeart, Clapperboard, Heart, History, Smartphone, Video } from "lucide-react";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { StartRoom } from "@/components/landing/StartRoom";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { RotatingHeadline } from "@/components/landing/RotatingHeadline";
import { RejoinRoom } from "@/components/landing/RejoinRoom";
import { Preview } from "@/components/landing/Preview";
import { IntroLoader } from "@/components/landing/IntroLoader";
import { DISCORD_ADD_URL, EXTENSION_URL, GITHUB, SITE_URL } from "@/lib/links";

const madeForTwo = [
  {
    icon: Video,
    title: "Stay face to face",
    body: "Keep your video call over the show, even in fullscreen.",
  },
  {
    icon: CalendarHeart,
    title: "Plan a night",
    body: "Pick a time. Share a link. Get a reminder in your time zone.",
  },
  {
    icon: History,
    title: "Resume your show",
    body: "The extension saves your place so you can pick up next time.",
  },
  {
    icon: Heart,
    title: "Send a little love",
    body: "Send floating reactions. Tap BRB when you need a break.",
  },
  {
    icon: Clapperboard,
    title: "Wait out ads together",
    body: "YouTube ads pause your partner’s video. On other sites, tap BRB.",
  },
  {
    icon: Smartphone,
    title: "Join from your phone",
    body: "Watch on a bigger screen. Keep the call on your phone.",
  },
];

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
  ["Use the extension", "Open the same episode on your own computers. Tandem keeps playback in sync."],
  ["A file you both have", "Each open the same file. Pause and skip together."],
  ["Share a tab", "Share your show’s browser tab with sound."],
];

const faq = [
  {
    q: "How do we start watching?",
    a: "Create a room and share the link. Then share a tab, open a file you both have, or use the extension.",
  },
  {
    q: "Do we both need the same video file?",
    a: "For files, yes—each person needs a copy. For tab sharing, only the sharer needs the video. Enable “Share tab audio” to include sound.",
  },
  {
    q: "Does it work with Netflix or Prime Video?",
    a: "Try the extension; support varies by video. You both need access to the episode. Ads can interrupt sync, and screen sharing may show a black screen.",
  },
  {
    q: "What does the extension do?",
    a: "It syncs playback and adds your call beside the show. You both need the extension and episode access. Site support varies.",
  },
  {
    q: "What happens when one of us gets an ad?",
    a: "On YouTube, your partner’s video pauses until your ad ends. On other sites, tap BRB during the ad.",
  },
  {
    q: "Can I join from my phone?",
    a: "Yes, for the call. Open the phone link in the Tandem window. Video sync still needs the extension on a computer.",
  },
  {
    q: "Does Tandem remember what we watched?",
    a: "The extension saves recent episodes, your place, and time watched in your browser only. Open Tandem to resume.",
  },
  {
    q: "Which browser should we use?",
    a: "Use Chrome or Edge for tab sharing with sound. The extension also supports Brave. For files, try MP4 or WebM.",
  },
  {
    q: "Do I have to turn my camera on?",
    a: "No. Join with your camera and microphone off, even without granting access.",
  },
  {
    q: "Does Tandem record the video or call?",
    a: "No. Calls and videos aren’t recorded. Files stay on your computer. Room details are deleted 10 minutes after everyone leaves.",
  },
  {
    q: "Can more than two people join?",
    a: "Yes. Tandem works best for two; larger groups need a stronger connection.",
  },
  {
    q: "Is it free?",
    a: "Yes. Free, with no account needed.",
  },
];

/** What search engines read about Tandem: a free browser app, and the questions below as an FAQ. */
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tandem",
    url: SITE_URL,
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Chrome, Edge, Brave",
    description:
      "Watch shows together with someone far away: playback stays in sync and your video call sits beside the show, even in fullscreen. Free, no account.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
];

export default function Home() {
  return (
    <LandingMotion>
      <IntroLoader />
      <script
        type="application/ld+json"
        // Escaped so nothing in the text can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      {/* Theater */}
      <section className="hero-shell relative text-white">
        <header className="relative z-10">
          <HeaderFrame>
            <Link href="/" aria-label="Tandem home" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-4">
              <Logo size={24} />
            </Link>
            <nav aria-label="Main navigation" className="hero-nav flex items-center gap-1 text-sm text-zinc-400">
              <a href="#two" className="hidden md:block">Made for two</a>
              <Link href="/plan" className="hidden md:block">Plan a night</Link>
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
              Your show in sync. Your favorite person on call. Free, no account.
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

      {/* Made for two */}
      <section id="two" className="scroll-mt-10 pt-16 sm:pt-24">
        <div data-reveal className="mx-auto site-width site-gutter">
          <h2 className="font-display text-3xl font-medium tracking-[-0.03em] sm:text-4xl">Made for two</h2>
          <p className="mt-3 max-w-xl text-zinc-400">Everything you need for a watch night, wherever you are.</p>
          <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {madeForTwo.map(({ icon: Icon, title, body }) => (
              <li key={title} className="border-t border-white/15 pt-5">
                <Icon className="size-5 text-brand-300" aria-hidden="true" />
                <h3 className="mt-3 font-display text-lg font-medium">{title}</h3>
                <p className="mt-2 leading-relaxed text-zinc-400">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/plan" variant="ghost">Plan a watch night</ButtonLink>
            {DISCORD_ADD_URL && (
              <ButtonLink href={DISCORD_ADD_URL} variant="ghost">Add to Discord</ButtonLink>
            )}
          </div>
        </div>
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
          <p className="mt-5 text-sm text-zinc-500">Support varies by video. You both need episode access. Ads may interrupt sync.</p>
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
            <h2 className="font-display text-4xl font-medium leading-tight tracking-[-0.03em]">One play button. Two screens.</h2>
            <p className="mt-5 max-w-sm leading-relaxed text-zinc-400">Pause, skip, and catch up together.</p>
          </div>
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {[
              ["Create a room", "Send your partner the link."],
              ["Choose what to watch", "Share a tab, open a file, or use the extension."],
              ["Press play", "With synced playback, either person can pause or skip for both."],
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
              Your usual sites. Together.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-brand-100">
              Sync your shows with the browser extension. Support varies by video.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <ButtonLink href={EXTENSION_URL} variant="light" size="lg">
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
            <Link href="/plan" className="mt-4 inline-block text-sm text-zinc-400 hover:text-white">
              Plan a night for later →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </LandingMotion>
  );
}
