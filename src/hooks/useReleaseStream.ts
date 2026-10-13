"use client";

import { useEffect, useRef } from "react";

/**
 * Stops a local media stream when the component really goes away.
 * React may run an effect's cleanup and then re-run the effect on the same mounted component
 * (Strict Mode does this in development), so the stop is deferred one tick and skipped if the
 * effect has already run again.
 */
export function useReleaseStream(stream: MediaStream | null) {
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      setTimeout(() => {
        if (!alive.current) stream?.getTracks().forEach((t) => t.stop());
      }, 0);
    };
  }, [stream]);
}
