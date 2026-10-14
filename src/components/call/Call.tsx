"use client";

import { useLayoutEffect, useState } from "react";
import { JoinCard, type JoinResult } from "@/components/room/JoinCard";
import { OverlaySession } from "@/components/overlay/OverlaySession";

/** Call only, sized for a phone: for whoever is watching on a TV or has no laptop with the extension. */
export function Call({ roomId }: { roomId: string }) {
  const [session, setSession] = useState<JoinResult | null>(null);
  useLayoutEffect(() => () => setSession(null), []);
  if (!session) return <JoinCard roomId={roomId} onJoin={setSession} />;
  return <OverlaySession roomId={roomId} name={session.name} localStream={session.stream} embedded={false} layout="phone" />;
}
