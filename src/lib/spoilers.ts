import type { ContentUnit } from "./content-types";
import type { MediaKind } from "./catalog-types";

/** Starting an episode/chapter never counts as completing it. */
export function isUnitCompleted(number: number, progress: number) {
  return Number.isFinite(number) && number > 0 && Number.isFinite(progress) && number <= progress;
}

/** Keep provider titles out of navigation, tooltips and accessible labels. */
export function unitLabel(kind: MediaKind, unit: Pick<ContentUnit, "number"> & Partial<Pick<ContentUnit, "group">>) {
  const label = Number.isFinite(unit.number) && unit.number > 0
    ? `${kind === "anime" ? "Episode" : "Chapter"} ${unit.number}`
    : "Special";
  return kind === "anime" && (unit.group === "Sub" || unit.group === "Dub")
    ? `${label} · ${unit.group}`
    : label;
}

/** Alternate translations of one chapter must not become the next chapter. */
export function adjacentUnits(units: ContentUnit[], current: ContentUnit) {
  const ordered = units.toSorted((a, b) => a.number - b.number);
  return {
    previous: ordered.findLast((unit) => unit.number < current.number),
    next: ordered.find((unit) => unit.number > current.number),
  };
}
