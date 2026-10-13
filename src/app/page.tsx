import Link from "next/link";
import { Link2, MonitorPlay, PictureInPicture2, ShieldCheck, Timer, Video } from "lucide-react";
import { Logo } from "@/components/Logo";
import { StartRoom } from "@/components/landing/StartRoom";
import { Preview } from "@/components/landing/Preview";

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
  { n: "01", title: "Create a room", body: "One click gives you a private link." },
  { n: "02", title: "Share the link", body: "Send it to your person. They pick a name and turn on their camera." },
  { n: "03", title: "Press play", body: "Paste a video link or pick the same file. Playback stays locked together." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="Tandem home">
            <Logo size={30} />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-600 md:flex">
            <a href="#features" className="transition hover:text-zinc-900">Features</a>
            <a href="#how" className="transition hover:text-zinc-900">How it works</a>
            <a href="#faq" className="transition hover:text-zinc-900">FAQ</a>
          </nav>
          <a
            href="#start"
            className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Start a room
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="hero-bg relative">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-16 pt-20 text-center sm:pt-28">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="size-1.5 rounded-full bg-brand-500 animate-pulse-soft" />
              Watch party + video call, in one tab
            </span>
            <h1 className="animate-fade-up mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-zinc-900 [animation-delay:60ms] sm:text-6xl">
              Watch anime together,{" "}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                face to face.
              </span>
            </h1>
            <p className="animate-fade-up mt-5 max-w-xl text-lg leading-relaxed text-zinc-600 [animation-delay:120ms]">
              Tandem keeps your playback perfectly in step and puts your partner&apos;s camera right on top of the
              show. No downloads, no accounts, just a link.
            </p>
            <div id="start" className="animate-fade-up mt-9 w-full max-w-xl [animation-delay:160ms]">
              <StartRoom />
              <p className="mt-3 text-xs text-zinc-500">Free and open. Works in Chrome, Edge, Safari and Firefox.</p>
            </div>
            <div className="mt-16 w-full">
              <Preview />
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Everything a long-distance movie night needs</h2>
            <p className="mt-3 text-zinc-600">
              Built for two people who want to feel like they are on the same couch.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Three steps, under a minute</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="relative rounded-2xl border border-zinc-200 bg-white p-6">
                  <span className="font-mono text-xs font-medium text-brand-600">{s.n}</span>
                  <h3 className="mt-2 font-semibold text-zinc-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-zinc-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Where does the video come from?</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Link2 className="size-4 text-brand-600" /> A direct link
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Paste an MP4, WebM or HLS (.m3u8) link and both of you load it from that source. Tandem never
                re-streams the video, it only synchronises the clock.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <MonitorPlay className="size-4 text-brand-600" /> A file you both have
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Pick a local file. Your partner is prompted to pick the same one on their machine. Nothing is
                uploaded, so a 4GB episode starts instantly.
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-zinc-500">
            Streaming sites with protected players (DRM) cannot be controlled from a web page. For those, a small
            browser extension is the right tool, and this app&apos;s sync protocol is built so one can plug into it later.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-zinc-500 sm:flex-row">
          <Logo size={22} />
          <p>Made for two.</p>
        </div>
      </footer>
    </div>
  );
}
