"use client";

import { useEffect } from "react";
import { INTRO_ID, INTRO_SEEN_KEY } from "@/lib/intro";

/** The intro plays for 2 s; this is when it is fully gone and the hero's entrance has finished. */
const CLEANUP_MS = 3_100;

/**
 * Ends the homepage intro that the script in <head> started (src/lib/intro.ts): remembers it was seen
 * this session, and removes it after it has played, or straight away on a click or key press.
 */
export function IntroLoader() {
  useEffect(() => {
    const intro = document.getElementById(INTRO_ID);
    if (!intro) return;
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* storage blocked: it just plays again next visit */
    }
    const end = () => intro.remove();
    const timer = setTimeout(end, CLEANUP_MS);
    window.addEventListener("pointerdown", end, { once: true });
    window.addEventListener("keydown", end, { once: true });
    // Cleanup only stops listening: React mounts components twice in development, and ending the
    // intro here would cut it short. The timer, a click or a key ends it.
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", end);
      window.removeEventListener("keydown", end);
    };
  }, []);

  return null;
}
