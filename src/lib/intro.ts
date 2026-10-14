/**
 * The homepage intro, decided in <head> before anything paints (see app/layout.tsx and
 * components/landing/IntroLoader.tsx). Plain module, so the server layout and the client component
 * can share it.
 */
export const INTRO_SEEN_KEY = "tandem:intro-seen";
export const INTRO_ID = "intro";

const MARKUP =
  '<div class="intro-mark"><svg viewBox="0 0 32 32" width="72" height="72" fill="none">' +
  '<rect class="intro-frame-a" x="4" y="4" width="16" height="16" rx="5" stroke="#8b5cf6" stroke-width="2.25"/>' +
  '<rect class="intro-frame-b" x="12" y="12" width="16" height="16" rx="5" stroke="#8b5cf6" stroke-width="2.25"/>' +
  '</svg><span class="intro-word">tandem</span></div><span class="intro-bar"></span>';

/**
 * On the homepage only, on the first visit of a browser session, and never for people who prefer
 * reduced motion: add the intro to <html>, outside <body>. Not inside <body>, because the page streams
 * in inside React's loading boundaries and React clears a boundary's contents when it renders it in
 * the browser. Without JavaScript (search engines) there is no intro.
 */
export const INTRO_SCRIPT = `try{if(location.pathname==="/"&&!sessionStorage.getItem("${INTRO_SEEN_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var d=document.createElement("div");d.id="${INTRO_ID}";d.setAttribute("aria-hidden","true");d.innerHTML=${JSON.stringify(MARKUP)};document.documentElement.appendChild(d)}}catch(e){}`;
