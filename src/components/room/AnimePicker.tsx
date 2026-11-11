"use client";
import { useEffect, useState } from "react";
import type { CatalogTitle, MediaKind } from "@/lib/catalog-types";
import type { RoomStory } from "@/lib/reading";
import seed from "@/content/catalog.json";
export function AnimePicker({
  onPick,
  kind = "anime",
}: {
  onPick: (story: RoomStory) => void;
  kind?: MediaKind;
}) {
  const [q, setQ] = useState("");
  const [titles, setTitles] = useState(
    (seed as CatalogTitle[]).filter((t) => t.kind === kind),
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(
          `/api/catalog?kind=${kind}&q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (r.ok) setTitles((await r.json()).items);
      } catch {
        /* Keep the saved selection. */
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, kind]);
  return (
    <div>
      <p className="mb-3 text-xs leading-6 text-zinc-400">
        {kind === "anime"
          ? "Pick the anime for this room. Open your episode on a provider, then share its tab or use the Tandem extension to sync playback."
          : "Pick a manga for this room. Tandem will open its available chapters for shared reading."}
      </p>
      <label>
        <span className="sr-only">Search anime for room</span>
        <input
          className="field w-full"
          placeholder={`Find ${kind}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <div className="mt-3 max-h-60 space-y-1 overflow-auto">
        {busy && <p className="py-2 text-xs text-muted">Searching…</p>}
        {titles.map((t) => (
          <button
            type="button"
            key={t.id}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-xs hover:bg-white/10"
            onClick={() => onPick({ id: t.id, title: t.title, kind })}
          >
            <span>{t.title}</span>
            <span className="text-muted">{t.year}</span>
          </button>
        ))}
        {!titles.length && (
          <p className="py-4 text-xs text-muted">No titles found.</p>
        )}
      </div>
    </div>
  );
}
