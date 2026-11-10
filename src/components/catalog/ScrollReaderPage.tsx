"use client";
/* Comic pages keep their original source quality and text detail. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

function PageImage({ url, label, current, onRatio, onFailure }: {
  url: string; label: string; current: boolean;
  onRatio: (ratio: number) => void; onFailure: (message: string) => void;
}) {
  const [ready, setReady] = useState(false);
  return <>
    {!ready && <div className="reader-image-loading loading-shape" role="status">Loading {label.toLowerCase()}…</div>}
    <img src={url} alt={label} referrerPolicy="no-referrer" decoding="async" fetchPriority={current ? "high" : "low"}
      className={ready ? "reader-image-ready" : "reader-image-pending"}
      onLoad={(event) => { onRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight); setReady(true); }}
      onError={() => onFailure("This page couldn’t be loaded. Retry to refresh the page source.")}
    />
  </>;
}

export function ScrollReaderPage({ url, index, label, active, current, initialRatio, onFailure }: {
  url: string; index: number; label: string; active: boolean; current: boolean;
  initialRatio: number; onFailure: (message: string) => void;
}) {
  const [ratio, setRatio] = useState(initialRatio);
  return <div data-page={index} className="reader-scroll-page" style={{ aspectRatio: ratio }}>
    {active ? <PageImage url={url} label={`Page ${index + 1} of ${label}`} current={current} onRatio={setRatio} onFailure={onFailure} /> : <span className="sr-only">Page {index + 1}</span>}
  </div>;
}
