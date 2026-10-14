"use client";

import { useState } from "react";
import { CalendarPlus, Check, Copy, Download } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { useClientValue } from "@/hooks/useClientValue";
import { downloadIcs, formatWhen, googleCalendarUrl, type Plan } from "@/lib/calendar";
import { newRoomId } from "@/lib/room-id";

const NAME_KEY = "tandem:name";

/** Today at 9 PM, or tomorrow if that has passed, as a datetime-local value. */
function defaultTime() {
  const d = new Date();
  if (d.getHours() >= 21) d.setDate(d.getDate() + 1);
  d.setHours(21, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T21:00`;
}

const FIELD =
  "h-11 w-full rounded-xl border border-white/10 bg-ink-700 px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20";

export function PlanForm() {
  const storedName = useClientValue(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  }, "");
  const initialTime = useClientValue(defaultTime, "");
  const [typedName, setName] = useState<string | null>(null);
  const [what, setWhat] = useState("");
  const [link, setLink] = useState("");
  const [typedWhen, setWhen] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; plan: Plan; roomId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = typedName ?? storedName;
  const when = typedWhen ?? initialTime;

  function create(e: React.FormEvent) {
    e.preventDefault();
    const start = new Date(when);
    if (Number.isNaN(start.getTime())) return setError("Pick a date and time.");
    const to = link.trim();
    if (to && !/^https?:\/\//i.test(to)) return setError("The episode link should start with https://");
    setError(null);
    const roomId = newRoomId();
    const params = new URLSearchParams({ at: String(start.getTime()), tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (name.trim()) params.set("from", name.trim());
    if (what.trim()) params.set("what", what.trim());
    if (to) params.set("to", to);
    const url = `${window.location.origin}/join/${roomId}?${params}`;
    setResult({
      url,
      roomId,
      plan: {
        title: what.trim() ? `Watch night: ${what.trim()}` : "Watch night on Tandem",
        start,
        minutes: 120,
        url,
        details: "Watching together on Tandem.",
      },
    });
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the link is shown for copying by hand */
    }
  }

  if (result) {
    return (
      <section className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Planned for</p>
          <p className="mt-1 text-lg font-medium">{formatWhen(result.plan.start)}</p>
        </div>
        <div>
          <p className="mb-1.5 text-sm text-zinc-300">Send this to your partner</p>
          <div className="flex gap-2">
            <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} className={`${FIELD} font-sans text-xs`} aria-label="Invite link" />
            <Button onClick={copy} size="md" className="shrink-0">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={googleCalendarUrl(result.plan)} target="_blank" rel="noreferrer" className="btn3d btn3d-ghost btn3d-sm">
            <CalendarPlus className="size-3.5" /> Add to Google Calendar
          </a>
          <button onClick={() => downloadIcs(result.plan, result.roomId)} className="btn3d btn3d-ghost btn3d-sm">
            <Download className="size-3.5" /> Apple / Outlook (.ics)
          </button>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          When it’s time, open the link yourself too. It’s the same room for both of you.
        </p>
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <ButtonLink href={new URL(result.url).pathname + new URL(result.url).search} variant="ghost" size="sm">Preview the invite</ButtonLink>
          <button onClick={() => setResult(null)} className="px-2 text-sm text-zinc-400 hover:text-white">Plan another</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={create} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-300">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Cash" className={FIELD} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-300">What are you watching? <span className="text-zinc-500">(optional)</span></span>
        <input value={what} onChange={(e) => setWhat(e.target.value)} maxLength={120} placeholder="Frieren, episode 4" className={FIELD} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-300">Link to the episode <span className="text-zinc-500">(optional)</span></span>
        <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://…" className={FIELD} />
        <span className="mt-1 block text-xs text-zinc-500">With a link, your partner goes straight to the episode with the call beside it.</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-300">When</span>
        <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <Button type="submit" size="lg" className="w-full">Create invite</Button>
    </form>
  );
}
