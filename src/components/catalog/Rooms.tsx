"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarHeart, MonitorPlay } from "lucide-react";
import { newRoomId, parseRoomCode } from "@/lib/room-id";
import { Button, ButtonLink } from "@/components/Button";
import { RejoinRoom } from "@/components/landing/RejoinRoom";
export function Rooms() {
  const router = useRouter();
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="mx-auto max-w-3xl">
      <div className="pt-4">
        <h1>Rooms</h1>
        <p className="mt-2 text-[15px] text-zinc-400">
          Start a private room and send the link. No account needed.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          {
            kind: "room",
            icon: MonitorPlay,
            heading: "Watch together",
            body: "Synced playback with a video call. Share a tab, open a file you both have, or use the extension.",
            action: "Create a watch room",
          },
          {
            kind: "read",
            icon: BookOpen,
            heading: "Read together",
            body: "Page turns stay in sync for both of you, with optional voice chat.",
            action: "Create a reading room",
          },
        ].map(({ kind, icon: Icon, heading, body, action }) => (
          <section
            className="flex flex-col rounded-xl border border-white/[0.08] bg-ink-800 p-6"
            key={kind}
          >
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <Icon className="size-5 text-brand-300" aria-hidden="true" />
              {heading}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-zinc-400">{body}</p>
            <Button
              className="mt-6 w-full"
              onClick={() => router.push(`/${kind}/${newRoomId()}`)}
            >
              {action}
            </Button>
          </section>
        ))}
      </div>
      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight">Join a room</h2>
        <p className="mt-1 text-sm text-zinc-400">Paste the invite link or room code you were sent.</p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const code = parseRoomCode(invite);
            if (!code) {
              setError("Enter a room code or a Tandem invite link.");
              return;
            }
            const isRead = /\/read\//i.test(invite);
            router.push(`/${isRead ? "read" : "room"}/${code}`);
          }}
        >
          <label className="min-w-48 flex-1">
            <span className="sr-only">Room code or invite link</span>
            <input
              className="field w-full"
              placeholder="Paste a room link or code"
              value={invite}
              onChange={(e) => {
                setInvite(e.target.value);
                setError("");
              }}
            />
          </label>
          <Button variant="ghost" type="submit">
            Join room
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-xs text-rose-300">
            {error}
          </p>
        )}
        <RejoinRoom />
      </section>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm">
        <p className="text-zinc-400">Watching later? Pick a time and send a reminder.</p>
        <ButtonLink href="/plan" variant="ghost" size="sm">
          <CalendarHeart className="size-4" />
          Plan a watch night
        </ButtonLink>
      </div>
    </div>
  );
}
