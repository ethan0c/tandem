"use client";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Info, Play, Star } from "lucide-react";
import { titleHref, type CatalogTitle } from "@/lib/catalog-types";
import { ButtonLink } from "@/components/Button";
import { canOptimizeArtwork, largeArtwork } from "@/lib/artwork";
import { catalogFormatLabel } from "@/lib/catalog-formats";
import { rememberTitle } from "@/lib/public-catalog-client";

const INTERVAL = 8000;

/** Full-width hero that slides beneath the header and rotates through a few featured titles. */
export function Billboard({ items, compact = false, eyebrow, children }: {
  items: CatalogTitle[];
  compact?: boolean;
  /** Short label above the title, such as "Tonight’s pick". */
  eyebrow?: (media: CatalogTitle, index: number) => ReactNode;
  /** Extra content pinned to the top of the hero, such as a page heading. */
  children?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || reduced || items.length < 2) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % items.length), INTERVAL);
    return () => clearTimeout(timer);
  }, [index, paused, reduced, items.length]);
  const media = items[index % items.length];
  if (!media) return null;
  const unit = media.kind === "anime" ? "episodes" : "chapters";
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured titles"
      className={`billboard bleed under-header ${compact ? "billboard-compact" : ""}`}
      data-paused={paused || reduced}
      style={{ ["--billboard-interval" as string]: `${INTERVAL}ms` }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className="billboard-art" aria-hidden="true">
        {items.map((item, i) => {
          const art = item.cover ? largeArtwork(item.cover) : item.poster;
          return (
            <div key={`${item.kind}:${item.id}`} className="billboard-slide" data-active={i === index}>
              {art && (
                <Image
                  src={art}
                  alt=""
                  fill
                  sizes="100vw"
                  preload={i === 0}
                  loading={i === 0 ? undefined : "lazy"}
                  unoptimized={!canOptimizeArtwork(art)}
                  className={item.cover ? "" : "scale-110 blur-2xl"}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="billboard-scrim" />
      {children && (
        <div className="billboard-top">
          <div className="hero-inner site-width site-gutter">{children}</div>
        </div>
      )}
      <div className="billboard-content">
        <div className="hero-inner site-width site-gutter">
          <div key={`${media.kind}:${media.id}`} className="billboard-copy" data-switching="true" aria-live={paused ? "polite" : "off"}>
            {eyebrow && <div className="mb-3 flex flex-wrap items-center gap-2">{eyebrow(media, index)}</div>}
            <h2 className="billboard-title">{media.title}</h2>
            <div className="billboard-meta">
              {media.rating && (
                <span className="rating-chip"><Star className="size-3.5 fill-current" aria-hidden="true" />{media.rating.toFixed(1)}</span>
              )}
              {media.rating && <span className="dot" aria-hidden="true" />}
              <span>{media.year || "TBA"}</span>
              <span className="dot" aria-hidden="true" />
              <span>{catalogFormatLabel(media)}</span>
              {media.total && media.total > 1 ? <><span className="dot" aria-hidden="true" /><span>{media.total} {unit}</span></> : null}
              {media.genres.slice(0, 2).map((genre) => (
                <span key={genre} className="contents"><span className="dot" aria-hidden="true" /><span>{genre}</span></span>
              ))}
            </div>
            {media.synopsis && <p className="billboard-synopsis">{media.synopsis.replace(/\s*\(Source:[^)]*\)\s*$/, "")}</p>}
            <div className="billboard-actions">
              <ButtonLink href={`${titleHref(media)}#episodes`} variant="light" size="lg" onClick={() => rememberTitle(media)}>
                <Play className="size-5 fill-current" aria-hidden="true" />
                {media.kind === "anime" ? "Play" : "Read"}
              </ButtonLink>
              <ButtonLink href={titleHref(media)} variant="ghost" size="lg" aria-label={`More info about ${media.title}`} onClick={() => rememberTitle(media)}>
                <Info className="size-5" aria-hidden="true" />
                More info
              </ButtonLink>
            </div>
            {items.length > 1 && (
              <div className="billboard-dots" role="group" aria-label="Choose a featured title">
                {items.map((item, i) => (
                  <button
                    key={`${item.kind}:${item.id}`}
                    type="button"
                    className="billboard-dot"
                    aria-label={`Show ${item.title}`}
                    aria-current={i === index}
                    onClick={() => setIndex(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
