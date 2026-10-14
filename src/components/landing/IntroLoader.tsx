"use client";

import { useEffect } from "react";

const SEEN_KEY = "tandem:intro-seen";
/** The intro plays for 2 s; this is when it is fully gone and the hero's entrance has finished. */
const CLEANUP_MS = 3_100;
const ID = "intro";

/**
 * Runs as soon as the browser reads it, before anything paints: on the first homepage visit of a
 * browser session (and never for people who prefer reduced motion), it adds the intro to the end of
 * <body>. It is built here rather than rendered by React because React resets whatever it renders when
 * it takes over the page, while leaving elements other scripts add to <body> alone. Without JavaScript
 * (search engines) there is no intro and the page shows straight away.
 */
const MARKUP =
  '<div class="intro-mark"><svg viewBox="0 0 32 32" width="72" height="72" fill="none">' +
  '<rect class="intro-frame-a" x="4" y="4" width="16" height="16" rx="5" stroke="#8b5cf6" stroke-width="2.25"/>' +
  '<rect class="intro-frame-b" x="12" y="12" width="16" height="16" rx="5" stroke="#8b5cf6" stroke-width="2.25"/>' +
  '</svg><span class="intro-word">tandem</span></div><span class="intro-bar"></span>';
const decide = `try{if(!sessionStorage.getItem("${SEEN_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var d=document.createElement("div");d.id="${ID}";d.setAttribute("aria-hidden","true");d.innerHTML=${JSON.stringify(MARKUP)};document.body.appendChild(d)}}catch(e){}`;

/** A 2-second branded intro on the homepage. Click or press a key to skip it. */
export function IntroLoader() {
  useEffect(() => {
    const intro = document.getElementById(ID);
    if (!intro) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage blocked: it just plays again next visit */
    }
    const end = () => intro.remove();
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

  return <script dangerouslySetInnerHTML={{ __html: decide }} />;
}
