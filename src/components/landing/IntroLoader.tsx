"use client";

import { useEffect } from "react";

const SEEN_KEY = "tandem:intro-seen";
/** The intro plays for 2 s; this is when it is fully gone and the hero's entrance has finished. */
const CLEANUP_MS = 3_100;

/**
 * Runs as soon as the browser reads it, before anything paints: switches the intro on only for the
 * first homepage visit of a browser session, and never for people who prefer reduced motion. The switch
 * is an empty <style id="intro-on"> in <head>: React resets the classes of anything it renders when it
 * takes over the page, but leaves alone elements other scripts add to <head>. Without JavaScript
 * (search engines) nothing is switched on and the page shows straight away.
 */
const MARKER = "intro-on";
const decide = `try{if(!sessionStorage.getItem("${SEEN_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var s=document.createElement("style");s.id="${MARKER}";document.head.appendChild(s)}}catch(e){}`;

/** A 2-second branded intro on the homepage. Click or press a key to skip it. */
export function IntroLoader() {
  useEffect(() => {
    const marker = document.getElementById(MARKER);
    if (!marker) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage blocked: it just plays again next visit */
    }
    const end = () => marker.remove();
    const timer = setTimeout(end, CLEANUP_MS);
    window.addEventListener("pointerdown", end, { once: true });
    window.addEventListener("keydown", end, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", end);
      window.removeEventListener("keydown", end);
      end();
    };
  }, []);

  return (
    <>
      <div className="intro-loader" aria-hidden="true">
        <div className="intro-mark">
          <svg viewBox="0 0 32 32" width="72" height="72" fill="none">
            <rect className="intro-frame-a" x="4" y="4" width="16" height="16" rx="5" stroke="#8b5cf6" strokeWidth="2.25" />
            <rect className="intro-frame-b" x="12" y="12" width="16" height="16" rx="5" stroke="#8b5cf6" strokeWidth="2.25" />
          </svg>
          <span className="intro-word">tandem</span>
        </div>
        <span className="intro-bar" />
      </div>
      <script dangerouslySetInnerHTML={{ __html: decide }} />
    </>
  );
}
