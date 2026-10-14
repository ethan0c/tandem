"use client";

import { useEffect, useRef, useState } from "react";
import { FolderOpen, MonitorUp, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
  /** Opens the browser's share picker; resolves false if nothing was shared. */
  onScreen: () => Promise<boolean>;
  screenError: string | null;
}

export function SourceDialog({ open, onClose, onFile, onScreen, screenError }: Props) {
  const [tab, setTab] = useState<"screen" | "file">("screen");
  const [sharing, setSharing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-ink-800 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a video"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Choose a video</h2>
          <button onClick={onClose} className="control-button control-md" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-1 p-2">
          <TabButton active={tab === "screen"} onClick={() => setTab("screen")} icon={<MonitorUp className="size-4" />}>
            Share tab
          </TabButton>
          <TabButton active={tab === "file"} onClick={() => setTab("file")} icon={<FolderOpen className="size-4" />}>
            Video file
          </TabButton>
        </div>
        <div className="px-5 pb-5 pt-2">
          {tab === "screen" ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Let everyone watch what is playing in your browser. Choose the tab with your show and turn on{" "}
                <span className="text-zinc-200">Share tab audio</span>, then play or pause the show in that tab.
              </p>
              <p className="rounded-lg border border-amber-400/20 bg-amber-950/40 px-3 py-2 text-xs text-amber-200/90">
                Some streaming sites block screen sharing, so your partner may see a black screen.
                For the best results, use Chrome or Edge on a computer.
              </p>
              {screenError && <p className="text-xs text-red-300">{screenError}</p>}
              <button
                disabled={sharing}
                onClick={async () => {
                  setSharing(true);
                  const ok = await onScreen();
                  setSharing(false);
                  if (ok) onClose();
                }}
                className="btn3d btn3d-brand btn3d-md w-full"
              >
                {sharing ? "Waiting for you to pick…" : "Choose a tab to share"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                You both need the same video file on your computers. When one of you pauses or skips, the other follows.
                Your file stays on your computer.
              </p>
              <button
                onClick={() => fileInput.current?.click()}
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-ink-700/60 text-sm text-zinc-300 transition hover:border-brand-400 hover:bg-brand-500/10"
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
