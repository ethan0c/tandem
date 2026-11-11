import Link from "next/link";
import Image from "next/image";
import { ButtonLink } from "@/components/Button";
import { StartRoom } from "@/components/landing/StartRoom";
import { DISCORD_ADD_URL, EXTENSION_URL, SITE_URL } from "@/lib/links";

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

export const metadata = {
  title: "How it works",
  description: "Watch shows together with someone far away: playback stays in sync and your video call sits beside the show. Free, no account.",
};

const steps = [
  ["Create a room", "Send the link to whoever you’re watching with."],
  ["Pick what to watch", "Play an episode from Tandem, share a tab, open a file you both have, or use the extension."],
  ["Press play", "Either of you can pause or skip, and it happens for both."],
];

export default function About() {
  return (
    <div className="mx-auto max-w-4xl">
      <script
        type="application/ld+json"
        // Escaped so nothing in the text can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <section className="pt-4">
        <h1>How Tandem works</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
          Watch in sync with someone far away, with your video call on screen the whole time. Free, no account.
        </p>
        <div className="mt-6"><StartRoom tone="dark" /></div>
      </section>

      <section className="mt-14">
        <ol className="grid gap-6 sm:grid-cols-3">
          {steps.map(([title, body], i) => (
            <li key={title} className="border-t border-white/10 pt-4">
              <span className="text-sm font-semibold text-brand-300">{i + 1}</span>
              <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-zinc-400">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="sources" className="mt-14 scroll-mt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Works with your usual sites</h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              With the browser extension. Support varies by video, you both need access, and ads can interrupt sync.
            </p>
          </div>
          <ButtonLink href={EXTENSION_URL} variant="ghost" size="sm">Get the extension</ButtonLink>
        </div>
        <ul className="service-logos mt-6 grid grid-cols-3 items-center gap-x-6 gap-y-4 sm:grid-cols-5">
          {streamingSites.map(([name, slug, invert]) => (
            <li key={slug} className="flex h-14 items-center justify-center">
              <Image
                src={`/logos/${slug}.svg`}
                alt={name}
                width={120}
                height={48}
                data-invert={invert || undefined}
                className="service-logo h-10 w-full max-w-28 object-contain"
              />
            </li>
          ))}
        </ul>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          {ways.map(([title, body]) => (
            <li key={title}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" className="mt-14 scroll-mt-28">
        <h2 className="text-xl font-bold tracking-tight">Questions</h2>
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {faq.map(({ q, a }) => (
            <details key={q} className="faq group">
              <summary className="flex items-center justify-between gap-6 py-4 text-[15px] font-semibold">
                {q}
                <span aria-hidden="true" className="faq-plus shrink-0 text-xl font-normal text-muted transition">+</span>
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-relaxed text-zinc-400">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-zinc-400">
          More help in the <Link href="/guides" className="font-semibold text-brand-300 hover:text-white">guides</Link>.
          {DISCORD_ADD_URL && <> Tandem also works <a href={DISCORD_ADD_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-300 hover:text-white">in Discord</a>.</>}
        </p>
      </section>
    </div>
  );
}
