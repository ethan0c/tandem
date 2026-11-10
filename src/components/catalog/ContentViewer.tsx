"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { newRoomId } from "@/lib/room-id";
import { titleHref, type MediaKind } from "@/lib/catalog-types";
import type { ContentPlayback, ContentUnit } from "@/lib/content-types";
import { useLibrary } from "./LibraryProvider";
import { useContent } from "./useContent";
import { AnimePlayer } from "./AnimePlayer";
import { MangaReader } from "./MangaReader";
import { useReadingSettings } from "./useReadingSettings";
import { UnitNavigator } from "./UnitNavigator";
import { unitLabel } from "@/lib/spoilers";
import { ViewerSkeleton } from "./LoadingStates";

export function ContentViewer({ kind, id }: { kind: MediaKind; id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("unit");
  const language = params.get("language") || "en";
  const [offset, setOffset] = useState(0);
  const catalog = useContent(kind, id, language, offset);
  const [firstUnit, setFirstUnit] = useState<string>();
  const unitId = requested || firstUnit || catalog.data?.units[0]?.id;
  const [playback, setPlayback] = useState<ContentPlayback | null>(null);
  const [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [readingSettings, setReadingSettings] = useReadingSettings();
  const { ready } = useLibrary();
  const media = catalog.data?.media;
  useEffect(() => {
    if (!unitId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setFailure("");
      try {
        const response = await fetch(
          `/api/content?${new URLSearchParams({ kind, id, unit: unitId })}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "This source is unavailable.");
        if (controller.signal.aborted) return;
        setPlayback(data);
        setFirstUnit((current) => current || data.unit.id);
      } catch (e) {
        if (!controller.signal.aborted)
          setFailure(
            e instanceof Error ? e.message : "This source is unavailable.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [kind, id, unitId, retry]);
  function selectUnit(unit: ContentUnit) {
    router.push(`/play/${kind}/${id}?${new URLSearchParams({ unit: unit.id, language })}`, { scroll: false });
  }
  const togetherParams = new URLSearchParams({
    media: id,
    kind,
    title: media?.title || "Our story",
    ...(playback
      ? { unit: playback.unit.id, chapter: String(playback.unit.number) }
      : {}),
  });
  const startTogether = () =>
    router.push(
      `/${kind === "manga" ? "read" : "room"}/${newRoomId()}?${togetherParams}`,
    );
  const changingUnit = !failure && !!playback && (loading || playback.unit.id !== unitId);
  if ((!ready || (!catalog.data && catalog.pending) || (unitId && !failure && !catalog.error)) && !playback) return <ViewerSkeleton kind={kind} />;
  return (
    <>
      <Link
        href={titleHref({ kind, id })}
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to series
      </Link>
      <div className="viewer-heading">
        <div className="min-w-0">
          <h1>{media?.title || (kind === "anime" ? "Watch" : "Read")}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {playback ? unitLabel(kind, playback.unit) : "Finding your place…"}
            {playback ? ` · ${playback.source}` : ""}
          </p>
        </div>
        {playback && (
          <Button onClick={startTogether} disabled={changingUnit} variant="ghost">
            <Users className="size-4" />
            {kind === "anime" ? "Watch together" : "Read together"}
          </Button>
        )}
      </div>
      {(failure || catalog.error) && !playback ? (
        <div className="empty-state mt-7">
          <h2>Couldn’t open this source</h2>
          <p>{failure || catalog.error}</p>
          <Button
            variant="ghost"
            onClick={() => {
              setRetry((n) => n + 1);
              catalog.retry();
            }}
          >
            Try again
          </Button>
        </div>
      ) : !playback ? (
        <div className="empty-state mt-7">
          <h2>No {kind === "anime" ? "episodes" : "chapters"} available</h2>
          <p>
            {catalog.data?.notice ||
              "Choose another source or return to the series."}
          </p>
          <ButtonLink href={titleHref({ kind, id })} variant="ghost">
            Back to series
          </ButtonLink>
        </div>
      ) : (
        <>
          {(failure || catalog.error) && <div className="viewer-load-error mt-5" role="alert"><p>{failure || catalog.error}</p><Button variant="ghost" size="sm" onClick={() => { setRetry((n) => n + 1); catalog.retry(); }}>Try again</Button></div>}
          <div className="viewer-content" aria-busy={changingUnit}>
            {changingUnit && <div className="viewer-loading-note" role="status">Opening {kind === "anime" ? "episode" : "chapter"}…</div>}
            <div inert={changingUnit} className={changingUnit ? "viewer-content-pending" : undefined}>
              {media && kind === "anime" && playback.streams && <AnimePlayer key={`${playback.unit.id}:${retry}`} media={media} playback={playback} transitioning={changingUnit} onFailure={setFailure} />}
              {media && kind === "manga" && playback.pages && <MangaReader key={`${playback.unit.id}:${retry}`} media={media} playback={playback} transitioning={changingUnit} settings={readingSettings} onSettings={setReadingSettings} onFailure={setFailure} />}
            </div>
          </div>
          {catalog.data && <UnitNavigator kind={kind} catalog={catalog.data} current={playback.unit} onSelect={selectUnit} offset={offset} onOffset={setOffset} disabled={changingUnit || catalog.pending} />}
          {catalog.pending && <p className="mt-3 text-xs text-zinc-400" role="status">Loading {kind === "anime" ? "episode" : "chapter"} choices…</p>}
          <p className="mt-4 text-xs leading-6 text-zinc-400">Unfinished {kind === "anime" ? "episode" : "chapter"} titles are hidden to avoid spoilers. Nothing advances automatically.</p>
          <p className="mt-7 text-xs leading-6 text-zinc-400">
            {playback.credit}{" "}
            <a
              className="whitespace-nowrap underline underline-offset-4 hover:text-white"
              href={playback.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              View source ↗
            </a>
          </p>
        </>
      )}
    </>
  );
}
