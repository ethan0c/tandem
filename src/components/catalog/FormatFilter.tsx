"use client";
import type { MediaKind } from "@/lib/catalog-types";
import { catalogFormats } from "@/lib/catalog-formats";

export function FormatFilter({ kind, value, onChange, className = "" }: {
  kind: MediaKind | "all";
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const options = (mediaKind: MediaKind) => catalogFormats[mediaKind].map((format) => <option key={format.value} value={format.value}>{format.label}</option>);
  return (
    <label className={`filter-format ${className}`}>
      <span className="sr-only">Format</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All formats</option>
        {kind === "all" ? <><optgroup label="Manga and reading">{options("manga")}</optgroup><optgroup label="Anime">{options("anime")}</optgroup></> : options(kind)}
      </select>
    </label>
  );
}
