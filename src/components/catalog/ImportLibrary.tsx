"use client";
import { useRef, useState } from "react";
import { ArrowLeft, Check, FileUp, Search } from "lucide-react";
import Link from "next/link";
import seed from "@/content/catalog.json";
import {
  mediaKey,
  type CatalogTitle,
  type LibraryEntry,
} from "@/lib/catalog-types";
import { matchTitle, parseBackup, parseLibraryText } from "@/lib/library";
import { Button, ButtonLink } from "@/components/Button";
import { useLibrary } from "./LibraryProvider";
interface ReviewRow {
  name: string;
  progress: number;
  media: CatalogTitle | null;
  selected: boolean;
  candidates: CatalogTitle[];
  original?: LibraryEntry;
}
export function ImportLibrary() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const { entries, importEntries } = useLibrary();
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  async function review() {
    const run = ++generation.current;
    setError("");
    setBusy(true);
    try {
      if (text.trim().startsWith("[")) {
        const backup = parseBackup(text);
        setRows(
          backup.map((e) => ({
            name: e.media.title,
            progress: e.progress,
            media: e.media,
            selected: true,
            candidates: [e.media],
            original: e,
          })),
        );
        return;
      }
      const parsed = parseLibraryText(text);
      if (!parsed.length)
        throw new Error(
          "No titles found. Paste one manga title per line, with an optional chapter number.",
        );
      const next: ReviewRow[] = [];
      for (const row of parsed) {
        let media =
          matchTitle(
            row.title,
            (seed as CatalogTitle[]).filter((t) => t.kind === "manga"),
          ) || null;
        let candidates: CatalogTitle[] = media ? [media] : [];
        if (!media) {
          try {
            const response = await fetch(
              `/api/catalog?kind=manga&q=${encodeURIComponent(row.title)}`,
            );
            if (response.ok) {
              candidates = (await response.json()).items;
              media = matchTitle(row.title, candidates) || null;
            }
          } catch {
            /* Leave unmatched rows for manual review. */
          }
        }
        if (run !== generation.current) return;
        next.push({
          name: row.title,
          progress: row.progress,
          media,
          selected: !!media,
          candidates,
        });
        setRows([...next]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t read this library.");
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }
  async function find(index: number, name: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/catalog?kind=manga&q=${encodeURIComponent(name)}`,
      );
      if (!response.ok) throw new Error("Search unavailable. Try again.");
      const data = await response.json();
      setRows((prev) =>
        prev!.map((row, i) =>
          i === index ? { ...row, candidates: data.items } : row,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }
  function finish() {
    const incoming = new Map<string, LibraryEntry>();
    for (const row of rows || []) {
      if (!row.selected || !row.media) continue;
      const key = mediaKey(row.media);
      const existing =
        incoming.get(key) || entries.find((e) => mediaKey(e.media) === key);
      const progress = Math.min(
        row.media.total || 1_000_000,
        Math.max(existing?.progress || 0, row.progress),
      );
      incoming.set(key, {
        status: progress > 0 ? "current" : "planned",
        favorite: false,
        subscribed: true,
        ...row.original,
        ...existing,
        media: row.media,
        progress,
        updatedAt: Date.now(),
      });
    }
    importEntries([...incoming.values()]);
    setDone(true);
  }
  if (done)
    return (
      <div className="empty-state">
        <Check className="text-brand-400" />
        <h1>Your stories made it.</h1>
        <p>Your selected titles and progress are in your library.</p>
        <ButtonLink href="/library">Open your library</ButtonLink>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/library"
        className="mb-7 inline-flex items-center gap-2 text-xs text-zinc-400"
      >
        <ArrowLeft className="size-3" />
        Your library
      </Link>
      <p className="eyebrow">Bring your favorites along</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        A new home for your manga.
      </h1>
      <p className="mt-3 text-sm leading-7 text-zinc-400">
        Paste the text from your Weeb Central subscriptions page, or a list of
        titles. We’ll find matches and let you review everything before saving.
      </p>
      {!rows ? (
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <label className="block text-sm" htmlFor="import-text">
            Your manga list
          </label>
          <textarea
            id="import-text"
            className="field mt-3 min-h-60 w-full resize-y font-mono text-xs leading-7"
            placeholder={
              "One Piece — Chapter 100\nDeath Note — Chapter 12\nTokyo Ghoul"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100_000}
          />
          <p className="mt-3 text-xs leading-6 text-zinc-500">
            One title per line. Chapter numbers are optional. Up to 100 unique
            titles per paste. You can also restore a Tandem JSON export.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={review} disabled={busy || !text.trim()}>
              {busy ? "Finding matches…" : "Review matches"}
              <Search className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => input.current?.click()}>
              <FileUp className="size-4" />
              Choose a file
            </Button>
          </div>
          <input
            ref={input}
            className="hidden"
            type="file"
            accept=".txt,.json,text/plain,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= 2_000_000) {
                setText(await file.text());
                setError("");
              } else setError("Choose a text or JSON file under 2 MB.");
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm">
              {busy
                ? `Finding matches… ${rows.length} reviewed`
                : `${rows.filter((r) => r.selected && r.media).length} selected · ${rows.filter((r) => !r.media).length} need a match`}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                ++generation.current;
                setRows(null);
                setBusy(false);
              }}
            >
              Edit list
            </Button>
          </div>
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Import ${row.name}`}
                    checked={row.selected}
                    disabled={!row.media || busy}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === index
                            ? { ...r, selected: e.target.checked }
                            : r,
                        ),
                      )
                    }
                    className="size-4 accent-violet-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{row.name}</p>
                    <p
                      className={`mt-1 text-xs ${row.media ? "text-brand-300" : "text-amber-200"}`}
                    >
                      {row.media
                        ? `Matched: ${row.media.title}`
                        : "Choose a match below, or leave this title out."}
                      {row.media &&
                      entries.some(
                        (e) => mediaKey(e.media) === mediaKey(row.media!),
                      )
                        ? " · Already saved; progress will be merged"
                        : ""}
                    </p>
                  </div>
                  <label className="text-[10px] text-zinc-500">
                    Chapter
                    <input
                      className="field ml-2 w-20 text-xs"
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.1"
                      value={row.progress}
                      onChange={(e) =>
                        setRows(
                          rows.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  progress: Math.max(0, Number(e.target.value)),
                                }
                              : r,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <details className="mt-3 text-xs text-zinc-500">
                  <summary className="cursor-pointer">
                    {row.media ? "Change match" : "Find a match"}
                  </summary>
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      void find(index, String(form.get("title")));
                    }}
                  >
                    <input
                      name="title"
                      defaultValue={row.name}
                      aria-label={`Search replacement for ${row.name}`}
                      className="field min-w-0 flex-1 text-xs"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                    >
                      Search
                    </Button>
                  </form>
                  <label className="mt-3 block">
                    <span className="sr-only">
                      Catalog match for {row.name}
                    </span>
                    <select
                      className="field w-full text-xs"
                      value={row.media?.id || ""}
                      onChange={(e) => {
                        const media =
                          row.candidates.find((t) => t.id === e.target.value) ||
                          null;
                        setRows(
                          rows.map((r, i) =>
                            i === index
                              ? { ...r, media, selected: !!media }
                              : r,
                          ),
                        );
                      }}
                    >
                      <option value="">Leave unmatched</option>
                      {row.candidates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.year || "TBA"})
                        </option>
                      ))}
                    </select>
                  </label>
                </details>
              </div>
            ))}
          </div>
          <p className="my-4 text-xs leading-6 text-zinc-500">
            Only checked, matched titles will be imported. Existing progress is
            kept if it’s further ahead. No chapters are downloaded.
          </p>
          <Button
            onClick={finish}
            disabled={busy || !rows.some((r) => r.selected && r.media)}
          >
            Import selected titles
          </Button>
        </section>
      )}
      {error && (
        <p className="mt-4 text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
