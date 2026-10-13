import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { StartRoom } from "@/components/landing/StartRoom";
import { Preview } from "@/components/landing/Preview";

const GITHUB = "https://github.com/ethan0c";
const POSTERS = "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=1400&q=80";

const sources = ["Miruro, with the extension", "Direct MP4 and WebM links", "HLS streams", "A file you both have", "Sharing a tab"];

const faq = [
  {
    q: "Does it work on Crunchyroll or Netflix?",
    a: "Netflix and Crunchyroll are not supported. You can use Miruro with the extension, or a direct video link or local file in the web app.",
  },
  {
    q: "What exactly does the extension do?",
    a: "It keeps the Miruro player in sync with your partner and adds a floating video call. Either person can pause or skip.",
  },
  {
    q: "Do you ever see or store the video?",
    a: "Tandem does not record your video or call. Each person loads the video from their own source, and the call connects directly between your browsers.",
  },
  {
    q: "More than two people?",
    a: "You can invite more people, but Tandem works best for two. Larger calls use more bandwidth.",
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
            <a href="#sync" className="transition hover:text-white">How it works</a>
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
                Watch anime
                <br />
                <span className="text-brand-400">together.</span>
              </h1>
            </div>
            <div className="lg:pb-2">
              <p className="max-w-md text-lg leading-relaxed text-zinc-300">
                Watch with your partner on a video call. When either of you pauses or skips, the other player follows.
                Use a video link, a file, or Miruro with the extension.
              </p>
              <div id="start" className="mt-7 scroll-mt-24">
                <StartRoom tone="dark" />
              </div>
              <p className="mt-3 font-sans text-[11px] text-zinc-500">No signup. Create a room and send them the link.</p>
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
          <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-zinc-500">Works with</p>
        </div>
        <ul className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-3 px-5">
          {sources.map((source) => (
            <li key={source} className="rounded-full border border-cream-200 bg-white px-4 py-2 text-sm text-zinc-700">{source}</li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="sync" className="scroll-mt-20 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-zinc-500">How it works</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-ink">Pause, skip, and catch up together.</h2>
            <p className="mt-5 max-w-sm leading-relaxed text-zinc-600">Tandem adjusts playback when one of you falls behind, including after buffering.</p>
          </div>
          <ol className="divide-y divide-cream-200 border-y border-cream-200">
            {[
              ["Create a room", "Send your partner the room link so they can join."],
              ["Choose what to watch", "Paste a video link, open a file you both have, or use the extension on Miruro."],
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
      <section className="bg-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[1fr_1fr] lg:py-28">
          <div className="relative aspect-[5/4] overflow-hidden rounded-xl border border-cream-200">
            <Image src={POSTERS} alt="A wall of anime posters" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-zinc-500">The extension</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1] tracking-[-0.03em] text-ink sm:text-5xl">
              Watch together on Miruro.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-zinc-600">
              The extension syncs your Miruro players and keeps the call over the video, including in fullscreen.
            </p>
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
                  <span className="faq-plus shrink-0 font-sans text-xl font-normal text-brand-600 transition">+</span>
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Last call */}
      <section className="bg-brand-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
            Start watching together.
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
