"use client";

import { useSyncExternalStore } from "react";

const STEP = 15_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, STEP);
  return () => clearInterval(timer);
}

/** The time, refreshed every 15 seconds: enough for a countdown in minutes. Null while server rendering. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / STEP) * STEP, () => null);
}
