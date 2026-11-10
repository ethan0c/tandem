"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { MediaKind } from "@/lib/catalog-types";
import { useContent } from "./useContent";
import { Button, ButtonLink } from "@/components/Button";
import { useLibrary } from "./LibraryProvider";
import { isUnitCompleted, unitLabel } from "@/lib/spoilers";

export function ContentChapters({ kind, id }: { kind: MediaKind; id: string }) {
  const [language, setLanguage] = useState("en");
  const [offset, setOffset] = useState(0);
  const [revealedFor, setRevealedFor] = useState("");
  const { entries } = useLibrary();
  const progress = entries.find((entry) => entry.media.kind === kind && entry.media.id === id)?.progress || 0;
  const showTitles = revealedFor === `${kind}:${id}`;
  const content = useContent(kind, id, language, offset);
  return (
    <section
      className="content-chapters mt-10 border-t border-white/10 pt-7"
      id="episodes"
    >
      <div className="section-heading">
        <h2>{kind === "anime" ? "Watch in Tandem" : "Chapters"}</h2>
        {kind === "manga" && (
          <label>
            <span className="sr-only">Chapter language</span>
            <select
              className="field"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setOffset(0);
              }}
            >
              {[
                ["en", "English"],
                ["es", "Spanish"],
                ["pt-br", "Portuguese (Brazil)"],
                ["fr", "French"],
                ["ja", "Japanese"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {content.pending && !content.data ? (
        <div role="status" aria-busy="true" aria-label="Loading available content">
          <span className="sr-only">Checking available {kind === "anime" ? "episodes" : "chapters"}…</span>
          <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((index) => <div key={index} className="loading-shape h-16 w-full" />)}</div>
        </div>
      ) : content.error && !content.data ? (
        <div className="space-y-4">
          <p role="status" className="text-sm text-zinc-400">
            {content.error}
          </p>
          <Button variant="ghost" size="sm" onClick={content.retry}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {content.error && <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400" role="alert"><p>{content.error}</p><Button variant="ghost" size="sm" onClick={content.retry}>Try again</Button></div>}
          <p className="mb-2 min-h-5 text-xs text-zinc-400" role="status">{content.pending ? "Updating available content…" : ""}</p>
          {content.data?.source && (
            <p className="mb-4 text-xs text-zinc-400">
              Source: {content.data.source}
            </p>
          )}
          {content.data?.notice && (
            <p className="text-sm leading-7 text-zinc-400">
              {content.data.notice}
            </p>
          )}
          {content.data?.externalUrl && (
            <ButtonLink href={content.data.externalUrl} variant="ghost" size="sm" className="mt-4">
              Open {content.data.source} search <ArrowRight className="size-3.5" />
            </ButtonLink>
          )}
          {!!content.data?.units.length && (
            <label className="spoiler-toggle mb-4">
              <input type="checkbox" checked={showTitles} onChange={(event) => setRevealedFor(event.target.checked ? `${kind}:${id}` : "")} />
              Show unfinished {kind === "anime" ? "episode" : "chapter"} titles (may contain spoilers)
            </label>
          )}
          <div className="chapter-list" inert={content.pending} aria-busy={content.pending}>
            {content.data?.units.map((unit) => (
              <div key={unit.id} className="chapter-row">
                <div className="min-w-0">
                  <h3 className="text-sm">{unitLabel(kind, unit)}</h3>
                  {unit.title && unit.title !== unit.label && (showTitles || isUnitCompleted(unit.number, progress)) && (
                    <p className="mt-1 text-xs leading-6 text-zinc-400">
                      {unit.title}
                    </p>
                  )}
                  {unit.title && unit.title !== unit.label && !showTitles && !isUnitCompleted(unit.number, progress) && (
                    <p className="mt-1 text-xs leading-6 text-muted">Title hidden until completed</p>
                  )}
                  {unit.group && (
                    <p className="mt-1 text-xs text-muted">{unit.group}</p>
                  )}
                </div>
                <ButtonLink
                  aria-label={`${kind === "anime" ? "Watch" : "Read"} ${unitLabel(kind, unit).toLowerCase()}`}
                  href={`/play/${kind}/${id}?${new URLSearchParams({ unit: unit.id, language })}`}
                  variant="ghost"
                  size="sm"
                >
                  {kind === "anime" ? "Watch" : "Read"}
                  <ArrowRight className="size-3.5" />
                </ButtonLink>
              </div>
            ))}
          </div>
          {(offset > 0 || content.data?.hasMore) && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={content.pending || offset === 0}
                onClick={() => setOffset((n) => Math.max(0, n - 100))}
              >
                Previous chapters
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={content.pending || !content.data?.hasMore}
                onClick={() => setOffset((n) => n + 100)}
              >
                More chapters
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
