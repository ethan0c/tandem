"use client";

import { useSyncExternalStore } from "react";

/**
 * How loud the other people on the call play, separate from the show's own volume.
 * Remembered per browser so each viewer keeps their own balance.
 */
export interface CallVolume {
  volume: number;
  muted: boolean;
}

const KEY = "tandem:call-volume";
const DEFAULT: CallVolume = { volume: 1, muted: false };

const listeners = new Set<() => void>();
let current: CallVolume | null = null;

function read(): CallVolume {
  if (current) return current;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved.volume === "number") {
      current = { volume: Math.min(1, Math.max(0, saved.volume)), muted: !!saved.muted };
      return current;
    }
  } catch {
    /* storage blocked or bad value: use the default */
  }
  current = DEFAULT;
  return current;
}

export function setCallVolume(next: Partial<CallVolume>) {
  current = { ...read(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage blocked: the setting still applies for this page */
  }
  listeners.forEach((l) => l());
}

/** Reactive call volume for sliders and remote audio. */
export function useCallVolume(): CallVolume {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULT,
  );
}

/** The volume to apply to a remote stream's media element. */
export function useCallOutputVolume(): number {
  const { volume, muted } = useCallVolume();
  return muted ? 0 : volume;
}
