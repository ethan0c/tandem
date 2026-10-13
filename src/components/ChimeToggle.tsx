"use client";

import { Bell, BellOff } from "lucide-react";
import { playChime, setChimesMuted, useChimesMuted } from "@/lib/chime";

/** Mutes or unmutes the join/leave/share chimes. Remembered per browser. */
export function ChimeToggle({ className = "" }: { className?: string }) {
  const muted = useChimesMuted();
  const label = muted ? "Turn sounds on" : "Turn sounds off";
  return (
    <button
      onClick={() => {
        setChimesMuted(!muted);
        // Preview the sound you just turned on.
        if (muted) playChime("join");
      }}
      aria-label={label}
      title={label}
      className={className}
    >
      {muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
    </button>
  );
}
