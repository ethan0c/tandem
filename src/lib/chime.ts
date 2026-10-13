"use client";

import { useSyncExternalStore } from "react";

/**
 * Small UI chimes synthesized with Web Audio, so there are no sound files to load.
 * Each chime is a few soft sine notes with a quick attack and an exponential fade.
 */
export type Chime = "join" | "leave" | "shareStart" | "shareStop" | "disconnect" | "reconnect" | "message";

/** [frequency Hz, start offset s, duration s] per note. */
const NOTES: Record<Chime, [number, number, number][]> = {
  join: [[659.25, 0, 0.18], [987.77, 0.09, 0.32]], // E5 → B5, rising
  leave: [[987.77, 0, 0.18], [659.25, 0.09, 0.32]], // B5 → E5, falling
  shareStart: [[523.25, 0, 0.16], [659.25, 0.07, 0.16], [783.99, 0.14, 0.34]], // C major arpeggio up
  shareStop: [[783.99, 0, 0.16], [523.25, 0.08, 0.3]],
  disconnect: [[440, 0, 0.22], [349.23, 0.12, 0.4]], // A4 → F4, lower and longer
  reconnect: [[523.25, 0, 0.14], [783.99, 0.07, 0.28]],
  message: [[880, 0, 0.1], [1174.66, 0.05, 0.18]], // A5 → D6, a short tap
};

/** Quiet on purpose: chimes sit under the show and the call, never over them. */
const VOLUME = 0.12;
const MUTE_KEY = "tandem:chimes-muted";

let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setChimesMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage blocked: the toggle still works for this page */
  }
  mutedOverride = muted;
  listeners.forEach((l) => l());
}

let mutedOverride: boolean | null = null;
const isMuted = () => mutedOverride ?? readMuted();

/** Reactive mute flag for toggles. */
export function useChimesMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    isMuted,
    () => false,
  );
}

export function playChime(kind: Chime) {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    ctx ??= new AudioContext();
    // Browsers start the context suspended until a user gesture; joining a room is one.
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime + 0.01;
    const out = ctx.createGain();
    out.gain.value = VOLUME;
    out.connect(ctx.destination);
    for (const [freq, at, dur] of NOTES[kind]) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.0001, now + at);
      env.gain.exponentialRampToValueAtTime(1, now + at + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.connect(env).connect(out);
      osc.start(now + at);
      osc.stop(now + at + dur + 0.02);
    }
  } catch {
    /* no audio available */
  }
}
