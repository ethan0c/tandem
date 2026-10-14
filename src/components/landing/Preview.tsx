"use client";

import { useRef } from "react";
import { TopBar } from "@/components/room/TopBar";
import { Player } from "@/components/room/Player";

const noop = () => {};
const preview = { poster: "/haikyu.png", time: 531, duration: 1420 };
const members = [{ id: "preview", name: "Cash" }];

/** Render the real room components with local sample state and no live session. */
export function Preview() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <figure className="room-preview">
      <div
        ref={containerRef}
        inert
        className="relative flex aspect-video overflow-hidden rounded-xl border border-white/10 bg-black text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/5"
      >
        <TopBar
          roomId="k3f9-x2qa"
          roomUrl=""
          members={members}
          selfId="preview"
          status="joined"
          drift={null}
          isFullscreen={false}
          onToggleFullscreen={noop}
          visible
        />
        <Player
          preview={preview}
          source={null}
          localFile={null}
          remote={null}
          selfId="preview"
          serverNow={Date.now}
          emitSync={noop}
          onOpenSource={noop}
          onPickFile={noop}
          onToggleFullscreen={noop}
          isFullscreen={false}
          onDrift={noop}
          onPlayingChange={noop}
          chromeVisible
          pickerName={null}
        />
        {/* The call as it looks mid-watch: small, in the corner, never covering the show. A still
            illustration rather than the real FloatingCall, which is sized for a full-screen room. */}
        <div aria-hidden="true" className="absolute bottom-[4.5rem] right-3 z-30 hidden w-[19%] overflow-hidden rounded-xl border border-white/15 bg-ink-800/90 shadow-2xl shadow-black/50 sm:block">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-900 via-ink-700 to-ink-800">
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex aspect-square w-[30%] items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-brand-500 text-[clamp(0.7rem,1.4vw,1.1rem)] font-semibold">M</span>
            </span>
            <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1 py-px text-[clamp(0.5rem,0.8vw,0.65rem)] font-medium">Mika</span>
            <span className="absolute bottom-1.5 right-1.5 flex aspect-[4/3] w-[32%] items-center justify-center rounded-md border border-white/20 bg-ink-700 text-[clamp(0.45rem,0.7vw,0.6rem)] text-zinc-400">You</span>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">Room preview</figcaption>
    </figure>
  );
}
