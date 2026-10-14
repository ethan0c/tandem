"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bell, CalendarPlus, Download, Monitor, Puzzle, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { useClientValue } from "@/hooks/useClientValue";
import { useNow } from "@/hooks/useNow";
import { downloadIcs, formatCountdown, formatWhen, googleCalendarUrl, type Plan } from "@/lib/calendar";
import { EXTENSION_URL } from "@/lib/links";

interface Props {
  roomId: string;
  from: string | null;
  what: string | null;
  /** The episode to open, for rooms on a streaming site. */
  to: string | null;
  /** Planned start, ms since epoch. */
  at: number | null;
  /** The planner's time zone, so each of you sees the other's local time too. */
  timeZone: string | null;
}

/** Where an invite link lands: gets the guest set up, then into the room. */
export function Invite({ roomId, from, what, to, at, timeZone }: Props) {
  const now = useNow();
  const ownZone = useClientValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone, null);
  const [reminder, setReminder] = useState<"idle" | "set" | "blocked">("idle");
  const start = at ? new Date(at) : null;
  const upcoming = start && now !== null && start.getTime() > now;
  const who = from ?? "Your partner";
  const roomPath = `/room/${roomId}`;
  const episode = to ? `${to.split("#")[0]}#tandem=${roomId}` : null;

  const plan: Plan | null = start
    ? {
        title: what ? `Watch night: ${what}` : "Watch night on Tandem",
        start,
        minutes: 120,
        url: typeof window === "undefined" ? "" : window.location.href,
        details: `${who} invited you to watch together on Tandem.`,
      }
    : null;

  async function remind() {
    if (!start || typeof Notification === "undefined") return setReminder("blocked");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setReminder("blocked");
    notifyBefore(start, what ?? `${who} is waiting for you.`);
    setReminder("set");
  }

  return (
    <div className="relative flex flex-1 flex-col items-center text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(50rem_20rem_at_50%_-5%,rgb(124_58_237/0.25),transparent_60%)]" />
      <header className="relative w-full">
        <HeaderFrame>
          <Link href="/" aria-label="Tandem home">
            <Logo size={24} light />
          </Link>
        </HeaderFrame>
      </header>
      <main className="relative w-full max-w-lg flex-1 px-5 py-12">
        <p className="text-sm text-brand-300">You’re invited 💜</p>
        <h1 className="mt-2 font-display text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl">
          {who} wants to watch {what ? <span className="text-brand-200">{what}</span> : "something"} with you.
        </h1>

        {start && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">When</p>
            <p className="mt-1 text-lg font-medium">{formatWhen(start)} <span className="text-sm font-normal text-zinc-400">your time</span></p>
            {timeZone && ownZone && timeZone !== ownZone && (
              <p className="mt-0.5 text-sm text-zinc-400">That’s {formatWhen(start, timeZone)} for {who}.</p>
            )}
            {now !== null && (
              <p className={`mt-3 text-sm ${upcoming ? "text-emerald-300" : "text-amber-300"}`}>
                {upcoming ? `Starts in ${formatCountdown(start.getTime() - now)}` : "It’s time. Jump in below."}
              </p>
            )}
            {upcoming && plan && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={googleCalendarUrl(plan)} target="_blank" rel="noreferrer" className="btn3d btn3d-ghost btn3d-sm">
                  <CalendarPlus className="size-3.5" /> Google Calendar
                </a>
                <button onClick={() => downloadIcs(plan, roomId)} className="btn3d btn3d-ghost btn3d-sm">
                  <Download className="size-3.5" /> Apple / Outlook
                </button>
                <button onClick={remind} disabled={reminder === "set"} className="btn3d btn3d-ghost btn3d-sm">
                  <Bell className="size-3.5" /> {reminder === "set" ? "Reminder set" : "Remind me here"}
                </button>
              </div>
            )}
            {reminder === "set" && <p className="mt-2 text-xs text-zinc-500">Keep this tab open for the reminder. The calendar invite works even if you close it.</p>}
            {reminder === "blocked" && <p className="mt-2 text-xs text-amber-300">Notifications are blocked. Add it to your calendar instead.</p>}
          </section>
        )}

        {episode ? (
          <ol className="mt-8 space-y-3">
            <Step n={1} icon={<Puzzle className="size-4" />} title="Add Tandem to your browser" body="Free, no account. Chrome, Edge or Brave on a computer.">
              <ButtonLink href={EXTENSION_URL} variant="ghost" size="sm">Get the extension</ButtonLink>
            </Step>
            <Step n={2} icon={<Monitor className="size-4" />} title="Open the episode" body="You’ll join the room with the call beside the show. Already have Tandem? Start here.">
              <a href={episode} className="btn3d btn3d-brand btn3d-sm">
                Open and join <ArrowRight className="size-3.5" />
              </a>
            </Step>
          </ol>
        ) : (
          <div className="mt-8">
            <ButtonLink href={roomPath} size="lg">
              Join the room <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        )}

        <div className="mt-8 space-y-2 border-t border-white/10 pt-6 text-sm text-zinc-400">
          <Link href={`/call/${roomId}`} className="flex items-center gap-2 hover:text-white">
            <Smartphone className="size-4" /> On your phone or watching on a TV? Join just the call.
          </Link>
          {episode && (
            <Link href={roomPath} className="flex items-center gap-2 hover:text-white">
              <Monitor className="size-4" /> Can’t install extensions? Use the room in your browser and share a tab.
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

/** A timer only fires while the tab stays open, so this is a nudge on top of the calendar invite. */
function notifyBefore(start: Date, body: string) {
  const delay = start.getTime() - 5 * 60_000 - Date.now();
  setTimeout(() => new Notification("Watch night starts in 5 minutes", { body }), Math.max(0, delay));
}

function Step({ n, icon, title, body, children }: { n: number; icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600/25 text-brand-200" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium"><span className="sr-only">Step {n}: </span>{title}</p>
        <p className="mt-0.5 text-sm text-zinc-400">{body}</p>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}
