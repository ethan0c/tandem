"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { forgetLastRoom, readLastRoom } from "@/lib/last-room";

export function RejoinRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function check() {
      const last = readLastRoom();
      if (!last) { if (!cancelled) setRoomId(null); return; }
      try {
        const base = (process.env.NEXT_PUBLIC_SOCKET_URL ?? "").replace(/\/$/, "");
        const response = await fetch(`${base}/room-status/${encodeURIComponent(last.roomId)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const status = await response.json() as { exists: boolean };
        if (!cancelled && readLastRoom()?.roomId === last.roomId) setRoomId(status.exists ? last.roomId : null);
      } catch { /* Keep the homepage usable when the room service is unavailable. */ }
    }
    void check();
    const timer = setInterval(check, 15_000);
    return () => { cancelled = true; controller.abort(); clearInterval(timer); };
  }, []);

  if (!roomId) return null;
  return (
    <div className="mt-5 flex w-full max-w-xl items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left">
      <Link href={`/room/${roomId}`} className="group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-brand-400">
        <span><span className="block text-sm font-medium text-white">Rejoin your last room</span><span className="mt-0.5 block text-xs text-zinc-400">Pick up where you left off.</span></span>
        <ArrowRight className="size-4 shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-white" />
      </Link>
      <button onClick={() => { forgetLastRoom(); setRoomId(null); }} aria-label="Dismiss last room" className="control-button control-md"><X className="size-4" /></button>
    </div>
  );
}
