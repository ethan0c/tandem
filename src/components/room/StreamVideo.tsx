"use client";

import { useEffect, useRef } from "react";

export function StreamVideo({
  stream,
  muted = false,
  mirror = false,
  className = "",
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => {});
    return () => {
      v.srcObject = null;
    };
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}
