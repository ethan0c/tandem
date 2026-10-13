"use client";

import { useRef } from "react";
import { TopBar } from "@/components/room/TopBar";
import { Player } from "@/components/room/Player";
import { FloatingCall } from "@/components/room/FloatingCall";

const noop = () => {};
const members = [{ id: "preview", name: "You" }];

/** Render the real room components with local sample state and no live session. */
export function Preview() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <figure>
      <div
        ref={containerRef}
        inert
        className="relative flex h-[540px] overflow-hidden rounded-xl border border-white/10 bg-black text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/5"
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
        <div className="hidden lg:contents">
          <FloatingCall
            containerRef={containerRef}
            localStream={null}
            peers={[]}
            members={members}
            micOn={false}
            camOn={false}
            toggleMic={noop}
            toggleCam={noop}
            roomUrl=""
          />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-zinc-500">Room preview</figcaption>
    </figure>
  );
}
