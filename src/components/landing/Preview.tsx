"use client";

import { useRef } from "react";
import { TopBar } from "@/components/room/TopBar";
import { Player } from "@/components/room/Player";
import { FloatingCall } from "@/components/room/FloatingCall";

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
      <figcaption className="sr-only">Room preview</figcaption>
    </figure>
  );
}
