"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JoinCard, type JoinResult } from "@/components/room/JoinCard";
import { useClientValue } from "@/hooks/useClientValue";
import { OverlaySession } from "./OverlaySession";

/** The page the browser extension embeds in its floating panel. */
export function Overlay({ roomId }: { roomId: string }) {
  const [session, setSession] = useState<JoinResult | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const embedded = useClientValue(() => window.parent !== window, false);

  // Tell the host how tall we are so the iframe can hug the content.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.parent === window) return;
    const report = () => window.parent.postMessage({ type: "tandem:resize", height: el.offsetHeight }, "*");
    const ro = new ResizeObserver(report);
    ro.observe(el);
    report();
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="w-full bg-zinc-950 text-white">
      {!embedded && (
        <div className="border-b border-amber-400/20 bg-amber-950/60 px-3 py-2 text-[11px] text-amber-200">
          This panel is meant to be opened by the Tandem browser extension on a streaming site.{" "}
          <Link href={`/room/${roomId}`} className="font-medium underline">
            Open the full room instead
          </Link>
          .
        </div>
      )}
      {session ? (
        <OverlaySession roomId={roomId} name={session.name} localStream={session.stream} embedded={embedded} />
      ) : (
        <JoinCard roomId={roomId} onJoin={setSession} compact />
      )}
    </div>
  );
}
