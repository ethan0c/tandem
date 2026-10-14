"use client";

import { useEffect, useRef, useState } from "react";

const WORDS = ["anime", "shows", "movies", "streams", "sports"];
const INTERVAL = 3200;
/** Fired on window with the word now showing, for anything on the page that follows along. */
export const HEADLINE_EVENT = "tandem:headline";

export function RotatingHeadline() {
  const ref = useRef<HTMLHeadingElement>(null);
  const sizers = useRef<(HTMLSpanElement | null)[]>([]);
  const [widths, setWidths] = useState<number[] | null>(null);
  const [rotation, setRotation] = useState({ index: 0, previous: -1, turn: 0 });

  // Measure every word once the font is in, and again if the headline's size changes with the viewport.
  useEffect(() => {
    const measure = () => {
      const next = sizers.current.map((el) => el?.getBoundingClientRect().width ?? 0);
      setWidths((prev) => (prev && prev.every((w, i) => w === next[i]) ? prev : next));
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The hero preview lifts the card that matches the current word.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(HEADLINE_EVENT, { detail: WORDS[rotation.index] }));
  }, [rotation.index]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = true;
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
    if (ref.current) observer.observe(ref.current);
    const timer = setInterval(() => {
      if (preference.matches || document.hidden || !inView) return;
      setRotation(({ index, turn }) => ({ index: (index + 1) % WORDS.length, previous: index, turn: turn + 1 }));
    }, INTERVAL);
    return () => { clearInterval(timer); observer.disconnect(); };
  }, []);

  return (
    <h1 ref={ref} className="hero-title font-display font-bold tracking-[-0.04em]">
      <span className="sr-only">Watch anime, shows, movies, streams, and sports together.</span>
      <span aria-hidden="true">
        <span className="rotating-phrase">
          Watch{" "}
          {/* The slot is exactly as wide as the current word, and tweens to the next one's width. */}
          <span className="rotating-word" style={widths ? { width: widths[rotation.index] } : undefined}>
            <span className="rotating-measure">
              {WORDS.map((word, i) => (
                <span key={word} ref={(el) => { sizers.current[i] = el; }}>{word}</span>
              ))}
            </span>
            {rotation.previous >= 0 && <span key={`out-${rotation.turn}`} className="rotating-outgoing">{WORDS[rotation.previous]}</span>}
            <span key={`in-${rotation.turn}`} className={rotation.turn ? "rotating-incoming" : undefined}>{WORDS[rotation.index]}</span>
          </span>
        </span>{" "}
        <span className="rotating-ending">together.</span>
      </span>
    </h1>
  );
}
