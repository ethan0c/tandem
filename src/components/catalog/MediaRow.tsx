"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** A titled row of cards that scrolls sideways, with edge arrows on pointer devices. */
export function MediaRow({ title, href, linkLabel = "Explore all", ranked = false, busy = false, children }: {
  title: string;
  href?: string;
  linkLabel?: string;
  ranked?: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, children]);
  function page(direction: 1 | -1) {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  }
  return (
    <section className="media-row" aria-label={title}>
      <div className="row-heading">
        <h2>{title}</h2>
        {href && <Link href={href}>{linkLabel} <ChevronRight aria-hidden="true" /></Link>}
      </div>
      <div className="row-viewport">
        <button type="button" className="row-arrow row-arrow-prev" aria-label={`Scroll ${title} back`} hidden={edges.start} onClick={() => page(-1)}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <div ref={track} className={`row-track ${ranked ? "row-ranked" : ""}`} onScroll={measure} aria-busy={busy}>
          {children}
        </div>
        <button type="button" className="row-arrow row-arrow-next" aria-label={`Scroll ${title} forward`} hidden={edges.end} onClick={() => page(1)}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
