"use client";

import { useLayoutEffect, useState } from "react";
import { JoinCard, type JoinResult } from "./JoinCard";
import { Session } from "./Session";

export function Room({ roomId }: { roomId: string }) {
  const [session, setSession] = useState<JoinResult | null>(null);
  useLayoutEffect(() => () => setSession(null), []);
  if (!session) return <JoinCard roomId={roomId} onJoin={setSession} />;
  return <Session roomId={roomId} name={session.name} localStream={session.stream} />;
}
