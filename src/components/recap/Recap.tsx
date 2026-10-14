"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { useClientValue } from "@/hooks/useClientValue";

/** What the extension packs into the link after "#" (see storyLink in extension/popup.js). */
interface Story {
  v: 1;
  /** Hours watched together. */
  h: number;
  /** Episodes watched together for at least five minutes. */
  e: number;
  /** Nights (days) with a watch together. */
  n: number;
  /** Longest streak of days in a row. */
  ls: number;
  since: string | null;
  top: { t: string; s: string }[];
}

/** The same hash gives back the same object: useClientValue needs a stable value, or it re-renders forever. */
let cached: { hash: string; story: Story | null } | null = null;

function readStory(): Story | null {
  const hash = window.location.hash;
  if (cached?.hash !== hash) cached = { hash, story: decodeStory(hash.slice(1)) };
  return cached.story;
}

function decodeStory(packed: string): Story | null {
  try {
    if (!packed) return null;
    const bytes = Uint8Array.from(atob(packed.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const s = JSON.parse(new TextDecoder().decode(bytes)) as Story;
    if (s?.v !== 1 || typeof s.h !== "number") return null;
    return { ...s, top: Array.isArray(s.top) ? s.top.slice(0, 3) : [] };
  } catch {
    return null;
  }
}

const W = 1080;
const H = 1920;

/** Shorten text to fit a width, with an ellipsis. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function draw(canvas: HTMLCanvasElement, story: Story, names: string, font: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2e1065");
  bg.addColorStop(0.55, "#120d1f");
  bg.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.75, 260, 0, W * 0.75, 260, 700);
  glow.addColorStop(0, "rgba(139, 92, 246, 0.45)");
  glow.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The two linked frames from the logo.
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 9;
  for (const o of [0, 32]) {
    ctx.beginPath();
    ctx.roundRect(96 + o, 120 + o, 64, 64, 20);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  ctx.font = `500 52px ${font}`;
  ctx.fillText("tandem", 222, 178);

  ctx.fillStyle = "#c4b5fd";
  ctx.font = `600 40px ${font}`;
  ctx.fillText(names.trim() ? fit(ctx, names.trim(), W - 192) : "Our story so far", 96, 380);
  ctx.fillStyle = "#fff";
  ctx.font = `700 104px ${font}`;
  ctx.fillText("Watching", 96, 500);
  ctx.fillText("together, apart.", 96, 616);

  const stats: [string, string][] = [
    [String(story.h >= 10 ? Math.round(story.h) : story.h), story.h === 1 ? "hour together" : "hours together"],
    [String(story.e), story.e === 1 ? "episode" : "episodes"],
    [String(story.n), story.n === 1 ? "night in" : "nights in"],
    [String(story.ls), story.ls === 1 ? "day streak" : "days in a row"],
  ];
  stats.forEach(([value, label], i) => {
    const x = 96 + (i % 2) * 456;
    const y = 760 + Math.floor(i / 2) * 270;
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    ctx.beginPath();
    ctx.roundRect(x, y, 432, 236, 36);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `700 112px ${font}`;
    ctx.fillText(fit(ctx, value, 380), x + 40, y + 140);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `500 36px ${font}`;
    ctx.fillText(label, x + 40, y + 196);
  });

  if (story.top.length) {
    ctx.fillStyle = "#c4b5fd";
    ctx.font = `600 36px ${font}`;
    ctx.fillText("Our top shows", 96, 1380);
    story.top.forEach((show, i) => {
      const y = 1460 + i * 92;
      ctx.fillStyle = "#8b5cf6";
      ctx.font = `700 44px ${font}`;
      ctx.fillText(`${i + 1}`, 96, y);
      ctx.fillStyle = "#fff";
      ctx.font = `500 44px ${font}`;
      ctx.fillText(fit(ctx, show.t, W - 260), 156, y);
    });
  }

  ctx.fillStyle = "#71717a";
  ctx.font = `500 32px ${font}`;
  const since = story.since ? `since ${new Date(`${story.since}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · ` : "";
  ctx.fillText(`${since}ilovemygf.site`, 96, H - 110);
}

export function Recap() {
  const story = useClientValue(readStory, null);
  const [names, setNames] = useState("");
  const [canShare, setCanShare] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!story || !canvas.current) return;
    const el = canvas.current;
    // The site's font, once loaded, so the card matches the page.
    const font = getComputedStyle(document.body).fontFamily;
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) draw(el, story, names, font);
    });
    return () => { cancelled = true; };
  }, [story, names]);

  useEffect(() => {
    const probe = new File([new Blob()], "x.png", { type: "image/png" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- only known in the browser
    setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
  }, []);

  function blob() {
    return new Promise<Blob | null>((resolve) => canvas.current?.toBlob(resolve, "image/png") ?? resolve(null));
  }
  async function download() {
    const b = await blob();
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "our-tandem-story.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function share() {
    const b = await blob();
    if (!b) return;
    try {
      await navigator.share({ files: [new File([b], "our-tandem-story.png", { type: "image/png" })], text: "Our watch nights on Tandem 💜" });
    } catch {
      /* closed the share sheet */
    }
  }

  return (
    <div className="relative flex flex-1 flex-col items-center text-white">
      <header className="relative w-full">
        <HeaderFrame>
          <Link href="/" aria-label="Tandem home">
            <Logo size={24} light />
          </Link>
        </HeaderFrame>
      </header>
      <main className="w-full max-w-3xl flex-1 px-5 py-10">
        {!story ? (
          <div className="mx-auto max-w-md text-center">
            <h1 className="font-display text-3xl font-medium tracking-[-0.03em]">Your story card</h1>
            <p className="mt-3 leading-relaxed text-zinc-400">
              Open this from the Tandem extension: click the Tandem button, then <span className="text-zinc-200">Share our story</span> under Our shows. Your watch history stays in your browser; it only becomes a picture when you share it.
            </p>
          </div>
        ) : (
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
            <canvas ref={canvas} className="aspect-[9/16] w-full max-w-[320px] justify-self-center rounded-2xl shadow-2xl shadow-black/50" aria-label="Your story card" />
            <div>
              <h1 className="font-display text-3xl font-medium tracking-[-0.03em]">Your story card</h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">Sized for Instagram and TikTok stories. Made in your browser from your Tandem history; nothing is uploaded.</p>
              <label className="mt-6 block">
                <span className="mb-1.5 block text-sm text-zinc-300">Your names <span className="text-zinc-500">(optional)</span></span>
                <input
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  maxLength={40}
                  placeholder="Alex & Sam"
                  className="h-11 w-full rounded-xl border border-white/10 bg-ink-700 px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
                />
              </label>
              <div className="mt-5 flex flex-wrap gap-3">
                {canShare && (
                  <button onClick={share} className="btn3d btn3d-brand btn3d-md">
                    <Share2 className="size-4" /> Share
                  </button>
                )}
                <button onClick={download} className={`btn3d ${canShare ? "btn3d-ghost" : "btn3d-brand"} btn3d-md`}>
                  <Download className="size-4" /> Download image
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
