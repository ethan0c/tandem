"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import type { MediaKind } from "@/lib/catalog-types";
import type { ContentCatalog, ContentUnit } from "@/lib/content-types";
import { adjacentUnits, unitLabel } from "@/lib/spoilers";
import { AudioTrackToggle, availableAudioTracks } from "./AudioTrackToggle";
import { EpisodeGrid } from "./EpisodeGrid";

export function UnitNavigator({ kind, catalog, current, onSelect, offset, onOffset, disabled = false }: {
  kind: MediaKind;
  catalog: ContentCatalog;
  current: ContentUnit;
  onSelect: (unit: ContentUnit) => void;
  offset: number;
  onOffset: (offset: number) => void;
  disabled?: boolean;
}) {
  const tracks = kind === "anime" ? availableAudioTracks(catalog.units) : [];
  const activeTrack = current.group === "Dub" ? "Dub" : "Sub";
  const navigationUnits = kind === "anime" && tracks.length
    ? catalog.units.filter((unit) => unit.group === activeTrack)
    : catalog.units;
  const { previous, next } = adjacentUnits(navigationUnits, current);
  const noun = kind === "anime" ? "episode" : "chapter";
  const choices = navigationUnits.some((unit) => unit.id === current.id)
    ? navigationUnits : [current, ...navigationUnits];
  const pagination = (offset > 0 || catalog.hasMore) && (
    <div className="mt-3 flex flex-wrap justify-between gap-3">
      <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => onOffset(Math.max(0, offset - 100))}>Earlier {noun}s</Button>
      <Button variant="ghost" size="sm" disabled={!catalog.hasMore} onClick={() => onOffset(offset + 100)}>More {noun}s</Button>
    </div>
  );
  if (kind === "anime") return (
    <nav className="unit-navigation unit-navigation-anime mt-8" inert={disabled} aria-busy={disabled} aria-label="Episode navigation">
      <div className="episode-picker-heading">
        <div>
          <h2>Episodes</h2>
          <p className="mt-1 text-xs text-zinc-400">{navigationUnits.length} available{tracks.length ? ` · ${activeTrack}` : ""}</p>
        </div>
        <AudioTrackToggle tracks={tracks} active={activeTrack} disabled={disabled} onChange={(track) => {
          const episodes = catalog.units.filter((unit) => unit.group === track);
          const selected = episodes.find((unit) => unit.number === current.number) || episodes[0];
          if (selected) onSelect(selected);
        }} />
      </div>
      <EpisodeGrid units={choices} currentId={current.id} onSelect={onSelect} disabled={disabled} />
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <Button variant="ghost" size="sm" disabled={!previous} onClick={() => previous && onSelect(previous)}><ChevronLeft className="size-4" />Previous episode</Button>
        <Button variant="ghost" size="sm" disabled={!next} onClick={() => next && onSelect(next)}>Next episode<ChevronRight className="size-4" /></Button>
      </div>
      {pagination}
    </nav>
  );
  return (
    <nav className="unit-navigation mt-6" inert={disabled} aria-busy={disabled} aria-label="Chapter navigation">
      <div className="unit-navigation-row">
        <Button variant="ghost" size="icon" aria-label={`Previous ${noun}`} disabled={!previous} onClick={() => previous && onSelect(previous)}>
          <ChevronLeft className="size-4" />
        </Button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Choose {noun}</span>
          <select className="field w-full" value={current.id} onChange={(event) => {
            const selected = choices.find((unit) => unit.id === event.target.value);
            if (selected) onSelect(selected);
          }}>
            {choices.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(kind, unit)}{kind === "manga" && unit.group ? ` · ${unit.group}` : ""}</option>)}
          </select>
        </label>
        <Button variant="ghost" size="icon" aria-label={`Next ${noun}`} disabled={!next} onClick={() => next && onSelect(next)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {pagination}
    </nav>
  );
}
