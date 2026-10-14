"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { StreamVideo } from "@/components/room/StreamVideo";

/** Someone is in the room but their picture is not here yet: the call is still connecting. */
export function Connecting({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-700 text-center">
      <span className="relative flex">
        <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-brand-500/30 motion-reduce:animate-none" />
        <span className={`relative flex items-center justify-center rounded-full bg-brand-600/30 font-semibold text-brand-100 ${small ? "size-7 text-xs" : "size-14 text-lg"}`}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      </span>
      {small ? (
        <span className="sr-only">Connecting to {name}</span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-zinc-300">
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
          Connecting to {name}…
        </span>
      )}
    </div>
  );
}

/** A partner's camera, with the connecting state until its first frame arrives. */
export function PeerVideo({ stream, name, volume, className = "", small = false }: { stream: MediaStream; name: string; volume?: number; className?: string; small?: boolean }) {
  const [readyFor, setReadyFor] = useState<MediaStream | null>(null);
  return (
    <>
      <StreamVideo stream={stream} volume={volume} className={className} onFirstFrame={() => setReadyFor(stream)} />
      {readyFor !== stream && <Connecting name={name} small={small} />}
    </>
  );
}
