"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, LogOut, Maximize, Minimize } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { Member } from "@/lib/types";
import type { RoomStatus } from "@/hooks/useRoom";

interface Props {
  roomId: string;
  roomUrl: string;
  members: Member[];
  selfId: string | null;
  status: RoomStatus;
  drift: number | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  visible: boolean;
}

export function TopBar({ roomId, roomUrl, members, selfId, status, drift, isFullscreen, onToggleFullscreen, visible }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const sync =
    status !== "joined"
      ? { text: status === "connecting" ? "Connecting…" : "Reconnecting…", tone: "bg-amber-500/15 text-amber-300" }
      : drift === null
        ? { text: "Ready", tone: "bg-white/10 text-zinc-300" }
        : Math.abs(drift) < 0.3
          ? { text: `In sync · ${Math.abs(drift).toFixed(2)}s`, tone: "bg-emerald-500/15 text-emerald-300" }
          : { text: `Correcting · ${drift > 0 ? "+" : "-"}${Math.abs(drift).toFixed(1)}s`, tone: "bg-amber-500/15 text-amber-300" };

  return (
    <header
      className={`absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 text-white transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="shrink-0" aria-label="Tandem home">
          <Logo size={26} light />
        </Link>
        <button
          onClick={copy}
          className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-zinc-200 transition hover:bg-white/10"
          title="Copy invite link"
        >
          {roomId}
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-zinc-400 group-hover:text-white" />}
        </button>
        <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline ${sync.tone}`}>{sync.text}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {members.map((m) => (
            <span
              key={m.id}
              title={m.name}
              className={`flex size-7 items-center justify-center rounded-full border-2 border-zinc-950 text-[11px] font-semibold ${
                m.id === selfId ? "bg-brand-600" : "bg-zinc-700"
              }`}
            >
              {m.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <button
          onClick={onToggleFullscreen}
          className="flex size-8 items-center justify-center rounded-lg transition hover:bg-white/10"
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          title="Fullscreen (f)"
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </button>
        <Link
          href="/"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-zinc-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-white"
        >
          <LogOut className="size-3.5" /> Leave
        </Link>
      </div>
    </header>
  );
}
