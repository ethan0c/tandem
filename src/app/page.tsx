import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Link2, MonitorPlay, PictureInPicture2, Puzzle, ShieldCheck, Timer, Video } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { StartRoom } from "@/components/landing/StartRoom";
import { Preview } from "@/components/landing/Preview";

const POSTERS = "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=1400&q=80";
const FIGURE = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&q=80";

const features = [
  {
    icon: Timer,
    title: "Frame-tight sync",
    body: "Play, pause and seek are mirrored instantly. Drift correction quietly nudges playback so you never fall out of step.",
  },
  {
    icon: Video,
    title: "Face to face",
    body: "A peer-to-peer video call runs right inside the room. Your voice and camera go straight to each other, not through a server.",
  },
  {
    icon: PictureInPicture2,
    title: "Floating camera",
    body: "The anime fills the screen. Your partner's camera floats in a draggable window on top, even in fullscreen.",
  },
  {
    icon: ShieldCheck,
    title: "No accounts, no tracking",
    body: "Rooms are just links. Nothing is stored once everyone leaves. Each of you streams the video from your own source.",
  },
];

const steps = [
  { n: "1", title: "Create a room", body: "One click gives you a private link. No sign-up." },
  { n: "2", title: "Share the link", body: "Send it to your person. They pick a name and turn on their camera." },
  { n: "3", title: "Press play", body: "Paste a video link or pick the same file. Playback stays locked together." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="Tandem home">
            <Logo size={30} />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex">
            <a href="#features" className="transition hover:text-zinc-900">Features</a>
            <a href="#how" className="transition hover:text-zinc-900">How it works</a>
            <a href="#faq" className="transition hover:text-zinc-900">Sources</a>
          </nav>
          <ButtonLink href="#start" size="sm">
            Start a room
          </ButtonLink>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="hero-bg relative">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-16 pt-20 text-center sm:pt-24">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="size-1.5 rounded-full bg-brand-500 animate-pulse-soft" />
              Watch party + video call, in one tab
            </span>
            <h1 className="animate-fade-up mt-6 max-w-3xl text-balance text-5xl font-bold tracking-tight text-zinc-900 [animation-delay:60ms] sm:text-6xl">
              Watch anime together,{" "}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                face to face.
              </span>
            </h1>
            <p className="animate-fade-up mt-5 max-w-xl text-balance text-lg leading-relaxed text-zinc-600 [animation-delay:120ms]">
              Tandem keeps your playback perfectly in step and puts your partner&apos;s camera right on top of the
              show. No downloads, no accounts, just a link.
            </p>
            <div id="start" className="animate-fade-up mt-9 w-full max-w-xl scroll-mt-24 [animation-delay:160ms]">
              <StartRoom />
              <p className="mt-4 text-xs text-zinc-500">Free and open source. Works in Chrome, Edge, Safari and Firefox.</p>
            </div>
            <div className="mt-16 w-full">
              <Preview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Everything a long-distance movie night needs
            </h2>
            <p className="mt-3 text-zinc-600">Built for two people who want to feel like they are on the same couch.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border-2 border-zinc-200 border-b-[6px] bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-200 hover:border-b-brand-300"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-[0_3px_0_var(--color-brand-200)] transition group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-[0_3px_0_var(--color-brand-800)]">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Showcase */}
        <section className="border-y border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-20 md:grid-cols-5">
            <div className="relative min-h-72 overflow-hidden rounded-3xl border-2 border-zinc-200 border-b-[6px] md:col-span-3">
              <Image src={POSTERS} alt="A wall of anime posters" fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent" />
              <div className="absolute bottom-0 p-7 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">Your library, your rules</p>
                <h3 className="mt-2 max-w-md text-2xl font-bold">Any direct link or any file you both have</h3>
                <p className="mt-2 max-w-md text-sm text-zinc-300">
                  MP4, WebM, HLS streams, or a 4GB episode sitting on both your drives. Tandem only syncs the clock.
                </p>
              </div>
            </div>
            <div className="relative min-h-72 overflow-hidden rounded-3xl border-2 border-zinc-200 border-b-[6px] md:col-span-2">
              <Image src={FIGURE} alt="Anime figure under red light" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent" />
              <div className="absolute right-5 top-5 w-28 overflow-hidden rounded-xl border border-white/20 bg-zinc-900/80 shadow-xl backdrop-blur">
                <div className="relative aspect-[4/3]">
                  <Image src="https://i.pravatar.cc/200?img=32" alt="Partner on camera" fill sizes="112px" className="object-cover" />
                </div>
              </div>
              <div className="absolute bottom-0 p-7 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">Always on top</p>
                <h3 className="mt-2 text-2xl font-bold">Their face, over the show</h3>
                <p className="mt-2 text-sm text-zinc-300">Drag the call anywhere. It stays put in fullscreen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">How it works</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Three steps, under a minute</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-2xl border-2 border-zinc-200 border-b-[6px] bg-white p-6">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-[0_3px_0_var(--color-brand-800)]">
                  {s.n}
                </span>
                <h3 className="mt-4 font-bold text-zinc-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Sources */}
        <section id="faq" className="border-t border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Sources</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Where does the video come from?</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <SourceCard icon={Link2} title="A direct link" tag="Works today">
                Paste an MP4, WebM or HLS (.m3u8) link and both of you load it from that source. Tandem never
                re-streams the video, it only synchronises the clock.
              </SourceCard>
              <SourceCard icon={MonitorPlay} title="A file you both have" tag="Works today">
                Pick a local file. Your partner is prompted to pick the same one on their machine. Nothing is uploaded,
                so a 4GB episode starts instantly.
              </SourceCard>
              <SourceCard icon={Puzzle} title="Streaming sites" tag="Needs the extension">
                Sites like Miruro or Crunchyroll run their own player, which a web page cannot control. A small browser
                extension that speaks Tandem&apos;s sync protocol is the next step.
              </SourceCard>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-center text-white shadow-[0_8px_0_var(--color-brand-950)] sm:px-12">
            <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 size-80 rounded-full bg-brand-400/30 blur-3xl" />
            <h2 className="relative text-balance text-3xl font-bold tracking-tight sm:text-4xl">Tonight&apos;s episode is waiting.</h2>
            <p className="relative mx-auto mt-3 max-w-md text-balance text-brand-100">
              Open a room, send the link, and press play together. It takes less time than picking what to watch.
            </p>
            <div className="relative mt-8 flex justify-center">
              <ButtonLink href="#start" variant="light" size="lg">
                Create a free room <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SourceCard({
  icon: Icon,
  title,
  tag,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  const soon = tag.startsWith("Needs");
  return (
    <div className="rounded-2xl border-2 border-zinc-200 border-b-[6px] bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-5" />
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            soon ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {tag}
        </span>
      </div>
      <h3 className="mt-4 font-bold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{children}</p>
    </div>
  );
}
