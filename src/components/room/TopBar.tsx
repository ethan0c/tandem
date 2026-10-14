"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, LogOut, Maximize, MessageSquare, Minimize } from "lucide-react";
import { ChimeToggle } from "@/components/ChimeToggle";
import { Participants } from "@/components/Participants";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import type { Member } from "@/lib/types";
import type { RoomStatus } from "@/hooks/useRoom";

interface Props {
  roomId: string;
  roomUrl: string;
  members: Member[];
  selfId: string | null;
  hostId?: string | null;
  status: RoomStatus;
  drift: number | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  visible: boolean;
  /** Chat controls; left out where there is no chat (the landing-page preview). */
  chat?: { open: boolean; unread: number; onToggle: () => void };
}

export function TopBar({ roomId, roomUrl, members, selfId, hostId, status, drift, isFullscreen, onToggleFullscreen, visible, chat }: Props) {
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
          ? { text: "Watching together", tone: "bg-emerald-500/15 text-emerald-300" }
          : { text: "Catching up…", tone: "bg-amber-500/15 text-amber-300" };

  return (
    <header
      className={`absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent text-white transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      <HeaderFrame>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="flex h-8 shrink-0 items-center" aria-label="Tandem home">
            <Logo size={24} light className="[&>span]:hidden sm:[&>span]:inline" />
          </Link>
          <button
            onClick={copy}
            className="group btn3d btn3d-ghost btn3d-xs"
            title="Copy invite link"
            aria-label="Copy invite link"
          >
            <span className="hidden sm:inline">{roomId}</span>
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-zinc-400 group-hover:text-white" />}
          </button>
          <span className={`hidden h-8 items-center rounded-full px-2.5 text-[11px] font-medium sm:inline-flex ${sync.tone}`}>{sync.text}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Participants members={members} selfId={selfId} hostId={hostId} />
          {chat && (
            <button
              onClick={chat.onToggle}
              aria-label={chat.open ? "Close chat" : "Open chat"}
              aria-pressed={chat.open}
              title="Chat (c)"
              className="relative control-button control-md"
            >
              <MessageSquare className="size-4" />
              {chat.unread > 0 && (
                <span
                  data-testid="chat-unread"
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white"
                >
                  {chat.unread > 9 ? "9+" : chat.unread}
                </span>
              )}
            </button>
          )}
          <ChimeToggle className="control-button control-md" />
          <button
            onClick={onToggleFullscreen}
            className="control-button control-md"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            title="Fullscreen (f)"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
          <Link
            href="/"
            aria-label="Leave room"
            className="btn3d btn3d-ghost btn3d-xs"
          >
            <LogOut className="size-3.5" /> <span className="hidden sm:inline">Leave</span>
          </Link>
        </div>
      </HeaderFrame>
    </header>
  );
}
