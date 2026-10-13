"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";
import { setCallVolume, useCallVolume } from "@/lib/call-volume";

/** Speaker button plus a slider that reveals on hover or focus. Sets how loud the call plays. */
export function CallVolumeControl({ buttonClassName = "" }: { buttonClassName?: string }) {
  const { volume, muted } = useCallVolume();
  const level = muted ? 0 : volume;
  const label = muted ? "Unmute call" : "Mute call";

  return (
    <div className="group flex items-center gap-1">
      <button
        onClick={() => setCallVolume(muted || volume === 0 ? { muted: false, volume: volume || 1 } : { muted: true })}
        aria-label={label}
        title={label}
        className={buttonClassName}
      >
        {level === 0 ? <VolumeX className="size-3.5" /> : level < 0.5 ? <Volume1 className="size-3.5" /> : <Volume2 className="size-3.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={level}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setCallVolume({ volume: v, muted: v === 0 });
        }}
        className="tandem-range w-0 opacity-0 transition-all group-focus-within:w-16 group-focus-within:opacity-100 group-hover:w-16 group-hover:opacity-100"
        style={{ "--fill": `${level * 100}%` } as React.CSSProperties}
        aria-label="Call volume"
        title="Call volume: how loud your partner is, separate from the show"
      />
    </div>
  );
}
