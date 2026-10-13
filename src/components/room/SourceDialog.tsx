"use client";

import { useEffect, useRef, useState } from "react";
import { FolderOpen, Link2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUrl: (url: string) => void;
  onFile: (file: File) => void;
}

export function SourceDialog({ open, onClose, onUrl, onFile }: Props) {
  const [tab, setTab] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    try {
      const u = new URL(trimmed);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      setError("Enter a full http(s) link to an MP4, WebM or .m3u8 stream.");
      return;
    }
    onUrl(trimmed);
    setUrl("");
    onClose();
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a video"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Choose a video</h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-1 p-2">
          <TabButton active={tab === "url"} onClick={() => setTab("url")} icon={<Link2 className="size-4" />}>
            Link
          </TabButton>
          <TabButton active={tab === "file"} onClick={() => setTab("file")} icon={<FolderOpen className="size-4" />}>
            Local file
          </TabButton>
        </div>
        <div className="px-5 pb-5 pt-2">
          {tab === "url" ? (
            <form onSubmit={submitUrl} className="space-y-3">
              <p className="text-sm text-zinc-400">
                Everyone in the room loads this link. Direct MP4, WebM and HLS (.m3u8) links work; streaming sites with
                protected players do not.
              </p>
              <input
                autoFocus
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://…/episode-01.mp4"
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-800 px-3.5 font-mono text-sm placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
              />
              {error && <p className="text-xs text-red-300">{error}</p>}
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold transition hover:bg-brand-500"
              >
                Play for everyone
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Nothing is uploaded. Your partner is asked to pick the same file on their computer, and Tandem keeps
                both copies in step.
              </p>
              <button
                onClick={() => fileInput.current?.click()}
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-zinc-800/60 text-sm text-zinc-300 transition hover:border-brand-400 hover:bg-brand-500/10"
              >
                <FolderOpen className="size-5 text-brand-300" />
                Choose a video file
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="video/*,.mkv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    onFile(f);
                    onClose();
                  }
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition ${
        active ? "bg-brand-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
