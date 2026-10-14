import type { Metadata } from "next";
import Link from "next/link";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Tandem and the Tandem browser extension do with your data.",
};

const sections = [
  {
    title: "Your privacy at a glance",
    body: [
      "You do not need an account. Tandem has no ads and does not track how you use the app. We do not record your call or the video you watch. Room details are deleted 10 minutes after everyone leaves.",
    ],
  },
  {
    title: "What your room remembers",
    body: [
      "While your room is open, Tandem keeps its code, the names people choose, which video is shared, and whether the video is playing or paused and where you are in it. People in the room can see each other’s names and the shared video details.",
      "Tandem helps your browsers connect for the call. Your camera, microphone, and shared video are not recorded or stored by Tandem.",
      "Chat messages go to everyone in the room. Tandem keeps the most recent hundred while the room is open, so someone who joins late or reconnects can read them, and deletes them with the room.",
      "Reactions, and whether someone has stepped away or is watching an ad, are passed to the others in the room as they happen. Tandem does not keep them.",
    ],
  },
  {
    title: "Your camera and microphone",
    body: [
      "Your camera and microphone are used only for the call, after you allow them. You can turn either off at any time, or watch without using them.",
      "Your browser uses Google’s connection services to help the call reach the other people in your room. Those services can see your internet address (IP address). Depending on how Tandem is hosted, another connection service may help carry the call when a direct connection is not possible.",
    ],
  },
  {
    title: "The browser extension",
    body: [
      "The extension works on the video sites it supports, including Miruro. You can also turn it on for another site from the Tandem button in your browser. On those sites, it checks the video’s position and controls play, pause, and skipping so you can watch together. It also shows your call beside the video.",
      "The extension remembers the Tandem website address using your browser’s saved settings. It remembers your room while the tab is open, so refreshing does not make you leave. The room code is cleared when you leave.",
      "To show “Our shows”, the extension keeps a list of up to 30 episodes you watched in a Tandem room: the page address and title, the room code, where you stopped, and how long you watched with someone. It also keeps how many minutes you watched together each day, for your streak. This list stays in your browser and is never sent to Tandem or anyone else. Removing the extension deletes it.",
      "On sites where Tandem can tell an ad is playing (currently YouTube), it checks the player for an ad so your partner’s show can wait. It does not record which ads you see.",
      "It does not read your browsing history. It reads the address of the current tab to make invite links and ask for access to that site. If you allow it to use an additional site, that access stays on until you remove it in your browser’s extension settings.",
    ],
  },
  {
    title: "What stays in your browser",
    body: [
      "Tandem remembers the name you last used so you do not need to type it again. It also remembers your call volume, notification sound preference, and call window size. These settings stay in your browser.",
      "While a tab is open, Tandem remembers your room and camera and microphone choices so you can reconnect after refreshing. It also briefly remembers your last room to offer a way back from the homepage. You can dismiss that reminder.",
      "When you plan a watch night, the time, your name, what you are watching and the episode link go into the invite link itself. Tandem does not store them. Calendar files are made in your browser, and “Remind me” uses your browser’s notifications only if you allow them.",
    ],
  },
  {
    title: "How your information is used",
    body: [
      "Tandem does not sell or rent your information. Your information is used only to run your room and call, including the connection services described above.",
    ],
  },
  {
    title: "Get in touch",
    body: ["For questions about your privacy, visit our project on GitHub at github.com/ethan0c."],
  },
];

export default function Privacy() {
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
        <h1 className="font-display text-4xl font-medium tracking-[-0.03em]">Privacy</h1>
        <p className="mt-3 font-sans text-xs text-zinc-500">Last updated 13 October 2026</p>
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
      </main>
      <Footer />
    </div>
  );
}
