"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import type { MediaKind } from "@/lib/catalog-types";
import type { ContentCatalog, ContentUnit } from "@/lib/content-types";
import { adjacentUnits, unitLabel } from "@/lib/spoilers";

export function UnitNavigator({ kind, catalog, current, onSelect, offset, onOffset }: {
  kind: MediaKind;
  catalog: ContentCatalog;
  current: ContentUnit;
  onSelect: (unit: ContentUnit) => void;
  offset: number;
  onOffset: (offset: number) => void;
}) {
  const { previous, next } = adjacentUnits(catalog.units, current);
  const noun = kind === "anime" ? "episode" : "chapter";
  const choices = catalog.units.some((unit) => unit.id === current.id)
    ? catalog.units : [current, ...catalog.units];
  return (
    <nav className="unit-navigation mt-6" aria-label={`${kind === "anime" ? "Episode" : "Chapter"} navigation`}>
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
            {choices.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(kind, unit)}{unit.group ? ` · ${unit.group}` : ""}</option>)}
          </select>
        </label>
        <Button variant="ghost" size="icon" aria-label={`Next ${noun}`} disabled={!next} onClick={() => next && onSelect(next)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {(offset > 0 || catalog.hasMore) && (
        <div className="mt-3 flex flex-wrap justify-between gap-3">
          <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => onOffset(Math.max(0, offset - 100))}>Earlier {noun}s</Button>
          <Button variant="ghost" size="sm" disabled={!catalog.hasMore} onClick={() => onOffset(offset + 100)}>More {noun}s</Button>
        </div>
      )}
    </nav>
  );
}
