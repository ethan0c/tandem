import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Tandem and the Tandem browser extension do with your data.",
};

const sections = [
  {
    title: "The short version",
    body: [
      "Tandem has no accounts, no ads and no analytics. Nothing about you is written to a database. Rooms live in the server's memory and are deleted 10 minutes after the last person leaves.",
    ],
  },
  {
    title: "What the server handles",
    body: [
      "While you are in a room, the server keeps the room code, the display name you typed, and the playback state (playing or paused, and the current time). If you paste a video link into the web app, that link is shared with the others in your room.",
      "The server relays call signaling so your browsers can connect to each other. It never sees, records or stores your video, audio or the episode itself.",
    ],
  },
  {
    title: "Camera and microphone",
    body: [
      "Your camera and microphone are used only for the call, and only after you allow them in the browser. The call runs peer to peer between the browsers in the room. To find a route between you, your browser contacts public STUN servers run by Google, which see your IP address as part of that.",
    ],
  },
  {
    title: "The browser extension",
    body: [
      "The extension runs only on the supported sites listed in its manifest (miruro.tv and its mirrors). On those pages it reads and controls the video player (play, pause, seek, current time) to keep your room in sync, and shows the floating call panel, which is this website loaded in a frame.",
      "It stores one setting with Chrome sync storage: the Tandem app URL. The current room code is kept in the tab's session storage so a reload keeps you in the room, and it is cleared when you leave. The extension does not read your browsing history or any page outside the supported sites.",
    ],
  },
  {
    title: "Stored in your browser",
    body: ["The web app remembers the display name you last used, in your browser's local storage, so you don't have to type it again."],
  },
  {
    title: "Sharing and selling",
    body: [
      "Tandem does not sell, rent or share your data with anyone, and does not use it for anything other than running your watch session.",
    ],
  },
  {
    title: "Contact",
    body: ["Questions or requests: open an issue at github.com/ethan0c."],
  },
];

export default function Privacy() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-ink text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Link href="/" aria-label="Tandem home">
            <Logo size={28} light />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Privacy</h1>
        <p className="mt-3 font-mono text-xs text-zinc-500">Last updated 13 October 2026</p>
        {sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="font-display text-xl font-bold">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 24)} className="mt-3 leading-relaxed text-zinc-600">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
