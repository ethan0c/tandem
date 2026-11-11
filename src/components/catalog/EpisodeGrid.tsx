import Link from "next/link";
import type { ContentUnit } from "@/lib/content-types";
import { unitLabel } from "@/lib/spoilers";

type Interaction =
  | { onSelect: (unit: ContentUnit) => void; hrefFor?: never }
  | { hrefFor: (unit: ContentUnit) => string; onSelect?: never };

export function EpisodeGrid({ units, currentId, disabled = false, titleFor, ...interaction }: {
  units: ContentUnit[];
  currentId?: string;
  disabled?: boolean;
  titleFor?: (unit: ContentUnit) => string | undefined;
} & Interaction) {
  return (
    <div className="episode-grid">
      {units.map((unit) => {
        const current = unit.id === currentId;
        const label = unitLabel("anime", unit);
        const title = titleFor?.(unit);
        const content = (
          <>
            <span className="episode-card-visual" aria-hidden="true">
              <span className="episode-card-number">{unit.number}</span>
              <span className="episode-card-play">▶</span>
            </span>
            <span className="episode-card-copy">
              <span className="episode-card-title">{label}</span>
              <span className="episode-card-detail">{current ? "Now playing" : title || "Watch episode"}</span>
            </span>
          </>
        );
        const className = `episode-card${current ? " episode-card-current" : ""}`;
        return interaction.hrefFor ? (
          <Link key={unit.id} href={interaction.hrefFor(unit)} className={className} aria-label={`Watch ${label}`} tabIndex={disabled ? -1 : undefined} aria-disabled={disabled || undefined}>
            {content}
          </Link>
        ) : (
          <button key={unit.id} type="button" className={className} aria-label={`Play ${label}`} aria-current={current ? "true" : undefined} disabled={disabled || current} onClick={() => interaction.onSelect?.(unit)}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
