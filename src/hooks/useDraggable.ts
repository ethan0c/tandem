"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface Pos {
  x: number;
  y: number;
}

/**
 * Drag an absolutely positioned element inside a container, clamped to its bounds.
 * Position is measured from the container's top-left corner.
 */
export function useDraggable(
  containerRef: RefObject<HTMLElement | null>,
  elementRef: RefObject<HTMLElement | null>,
  initial: (container: DOMRect, el: DOMRect) => Pos,
  /** Pixels on the container's right that are covered (e.g. by an open side panel) and must be avoided. */
  reserveRight = 0,
) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const reserveRef = useRef(reserveRight);
  /** Where the element was before a panel pushed it aside, to put it back when the panel closes. */
  const parked = useRef<Pos | null>(null);

  const clamp = useCallback(
    (p: Pos): Pos => {
      const c = containerRef.current?.getBoundingClientRect();
      const e = elementRef.current?.getBoundingClientRect();
      if (!c || !e) return p;
      return {
        x: Math.min(Math.max(8, p.x), Math.max(8, c.width - reserveRef.current - e.width - 8)),
        y: Math.min(Math.max(8, p.y), Math.max(8, c.height - e.height - 8)),
      };
    },
    [containerRef, elementRef],
  );

  // Place on first layout, and keep inside bounds when the container resizes (e.g. fullscreen).
  useEffect(() => {
    const c = containerRef.current;
    const e = elementRef.current;
    if (!c || !e) return;
    const place = () => {
      setPos((prev) => clamp(prev ?? initial(c.getBoundingClientRect(), e.getBoundingClientRect())));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(c);
    ro.observe(e);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamp]);

  // A panel opened over our side: step aside. It closed: go back to where we were, unless moved since.
  useEffect(() => {
    reserveRef.current = reserveRight;
    if (reserveRight > 0) {
      setPos((prev) => {
        if (!prev) return prev;
        const next = clamp(prev);
        if (next.x !== prev.x || next.y !== prev.y) parked.current = prev;
        return next;
      });
    } else if (parked.current) {
      const back = parked.current;
      parked.current = null;
      setPos(clamp(back));
    }
  }, [reserveRight, clamp]);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent) => {
      if ((ev.target as HTMLElement).closest("button, input, a")) return;
      if (!pos) return;
      // Moved by hand: this is where it lives now.
      parked.current = null;
      ev.preventDefault();
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      start.current = { px: ev.clientX, py: ev.clientY, x: pos.x, y: pos.y };
      setDragging(true);
    },
    [pos],
  );

  const onPointerMove = useCallback(
    (ev: React.PointerEvent) => {
      const s = start.current;
      if (!s) return;
      setPos(clamp({ x: s.x + ev.clientX - s.px, y: s.y + ev.clientY - s.py }));
    },
    [clamp],
  );

  const onPointerUp = useCallback((ev: React.PointerEvent) => {
    start.current = null;
    setDragging(false);
    try {
      (ev.currentTarget as HTMLElement).releasePointerCapture(ev.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  /** Move programmatically (e.g. to keep a corner fixed while resizing), still clamped. */
  const moveTo = useCallback((p: Pos) => setPos(clamp(p)), [clamp]);

  return { pos, dragging, moveTo, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
