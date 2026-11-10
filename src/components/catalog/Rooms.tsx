"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarHeart,
  Link as LinkIcon,
  MonitorPlay,
  Users,
} from "lucide-react";
import { newRoomId, parseRoomCode } from "@/lib/room-id";
import { Button, ButtonLink } from "@/components/Button";
import { RejoinRoom } from "@/components/landing/RejoinRoom";
export function Rooms() {
  const router = useRouter();
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="mx-auto max-w-4xl">
      <div className="py-5 text-center">
        <p className="eyebrow">A little less far away</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
          Same story. <span className="text-brand-300">Together.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-zinc-400">
          One of you picks a story. The other brings the company.
          <br className="hidden sm:block" />
          Create a private room and send a link. No account needed.
        </p>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {[
          {
            kind: "room",
            icon: MonitorPlay,
            heading: "Watch together",
            body: "Your show in sync, your favorite person on call. Share a tab, choose a video file, or use the extension.",
            action: "Create a watch room",
          },
          {
            kind: "read",
            icon: BookOpen,
            heading: "Read together",
            body: "Turn the page at the same time. Choose your manga page images and share a reading room, with optional voice chat.",
            action: "Create a reading room",
          },
        ].map(({ kind, icon: Icon, heading, body, action }) => (
          <section
            className="together-banner rounded-3xl border border-white/10 p-7"
            key={kind}
          >
            <span className="grid size-12 place-items-center rounded-2xl border border-brand-400/20 bg-brand-500/10 text-brand-300">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-7 text-2xl font-medium tracking-tight">
              {heading}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{body}</p>
            <Button
              className="mt-7 w-full"
              onClick={() => router.push(`/${kind}/${newRoomId()}`)}
            >
              {action}
              <ArrowRight className="size-4" />
            </Button>
          </section>
        ))}
      </div>
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
        <h2 className="flex items-center gap-2 text-sm">
          <LinkIcon className="size-4 text-brand-300" />
          Someone waiting for you?
        </h2>
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
            Join room <ArrowRight className="size-4" />
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-xs text-rose-300">
            {error}
          </p>
        )}
        <RejoinRoom />
      </section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-2 text-sm">
        <p className="flex items-center gap-2 text-muted">
          <Users className="size-4" />
          Private links. Good company.
        </p>
        <ButtonLink href="/plan" variant="ghost" size="sm">
          <CalendarHeart className="size-4" />
          Plan a night
        </ButtonLink>
      </div>
    </div>
  );
}
