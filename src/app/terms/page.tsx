import type { Metadata } from "next";
import Link from "next/link";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using Tandem, the Tandem browser extension and the Tandem Discord app.",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    title: "The short version",
    body: [
      "Tandem is free to use and needs no account. Use it to watch things you are allowed to watch, be decent to the people in your room, and understand that it is provided as it is, without guarantees.",
    ],
  },
  {
    title: "Using Tandem",
    body: [
      "These terms cover the Tandem website, the Tandem browser extension and the Tandem Discord app. By using any of them you agree to these terms. If you do not agree, please do not use Tandem.",
      "You must be at least 13 years old, or older if the law where you live requires it, to use Tandem.",
    ],
  },
  {
    title: "What you watch",
    body: [
      "Tandem keeps playback in sync and carries your video call. It does not provide, host or upload any shows, films or videos. You are responsible for having the right to watch whatever you play, on whichever service you play it.",
      "Streaming services have their own terms, and many limit how their content can be shared or shown to others. Following them is up to you. Do not use Tandem to share or show content to people who are not allowed to see it.",
    ],
  },
  {
    title: "How you behave",
    body: [
      "Do not use Tandem to harass, threaten or exploit anyone, to share illegal content, to send spam, or to break the law.",
      "Do not try to break, overload or get around how Tandem works, including its servers, its extension and its Discord app, or to access rooms you were not invited to.",
      "Rooms are private links. Anyone with a room’s link can join it, so only share it with people you want there.",
    ],
  },
  {
    title: "Your calls and messages",
    body: [
      "Your video, audio, chat messages and reactions belong to you. Tandem passes them between the people in your room so the room works, and does not claim any rights to them. How long anything is kept is described in the privacy policy.",
    ],
  },
  {
    title: "No guarantees",
    body: [
      "Tandem is provided “as is” and “as available”. We work to keep it reliable, but we cannot promise it will always be available, work with every site or video, or be free of mistakes. Sites change how their players work, and some videos may not sync.",
      "To the fullest extent the law allows, Tandem and the people who make it are not liable for any indirect or consequential loss, or for any loss arising from your use of Tandem, the content you watch, or the people you watch with. Nothing in these terms limits rights you have under the law where you live that cannot be limited.",
    ],
  },
  {
    title: "Changes and ending",
    body: [
      "We may change Tandem or these terms. If the terms change in a way that matters, we will update the date at the top of this page; using Tandem after that means you accept the new terms.",
      "You can stop using Tandem at any time by leaving your room, removing the extension or removing the Discord app. We may block access for anyone who breaks these terms.",
    ],
  },
  {
    title: "Get in touch",
    body: ["Questions about these terms: visit our project on GitHub at github.com/ethan0c."],
  },
];

export default function Terms() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/10 text-white">
        <HeaderFrame>
          <Link href="/" aria-label="Tandem home">
            <Logo size={24} light />
          </Link>
        </HeaderFrame>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
        <h1 className="font-display text-4xl font-medium tracking-[-0.03em]">Terms</h1>
        <p className="mt-3 font-sans text-xs text-zinc-500">Last updated 14 October 2026</p>
        {sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="font-display text-xl font-medium">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 24)} className="mt-3 leading-relaxed text-zinc-400">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="mt-10 leading-relaxed text-zinc-400">
          See also the <Link href="/privacy" className="text-zinc-200 underline underline-offset-4 hover:text-white">privacy policy</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}
