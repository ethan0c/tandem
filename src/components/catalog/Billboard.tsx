"use client";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Star, Users } from "lucide-react";
import { newRoomId } from "@/lib/room-id";
import { titleHref, type CatalogTitle } from "@/lib/catalog-types";
import { Button, ButtonLink } from "@/components/Button";
import { canOptimizeArtwork, largeArtwork } from "@/lib/artwork";
import { catalogFormatLabel } from "@/lib/catalog-formats";
import { rememberTitle } from "@/lib/public-catalog-client";

const INTERVAL = 8000;

/** Full-width hero that slides beneath the header and rotates through a few featured titles. */
export function Billboard({ items, children }: {
  items: CatalogTitle[];
  /** Extra content pinned to the top of the hero, such as a page heading. */
  children?: ReactNode;
}) {
  const router = useRouter();
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
      className="billboard bleed under-header"
      data-banner={!!media.cover}
      data-paused={paused || reduced}
      style={{ ["--billboard-interval" as string]: `${INTERVAL}ms` }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className="billboard-art" aria-hidden="true">
        {items.map((item, i) => {
          // Wide screens show the landscape banner itself; phones (and titles without one) get a blurred wash.
          const wash = item.cover || item.poster;
          const banner = item.cover ? largeArtwork(item.cover) : "";
          return (
            <div key={`${item.kind}:${item.id}`} className="billboard-slide" data-active={i === index}>
              {banner && (
                <Image className="billboard-banner" src={banner} alt="" fill sizes="100vw" loading={i === 0 ? undefined : "lazy"} preload={i === 0} unoptimized={!canOptimizeArtwork(banner)} />
              )}
              {wash && (
                <Image className="billboard-wash" src={wash} alt="" fill sizes="50vw" loading="lazy" unoptimized={!canOptimizeArtwork(wash)} />
              )}
            </div>
          );
        })}
      </div>
      <div className="billboard-scrim" />
      {children && <div className="billboard-top"><div className="hero-inner site-width site-gutter">{children}</div></div>}
      <div className="billboard-content">
        <div className="hero-inner billboard-layout site-width site-gutter">
          {media.poster && (
            <Link href={titleHref(media)} key={`poster:${media.kind}:${media.id}`} className="billboard-poster" tabIndex={-1} aria-hidden="true" onClick={() => rememberTitle(media)}>
              <Image src={largeArtwork(media.poster)} alt="" fill sizes="(max-width: 767px) 180px, 300px" preload={index === 0} unoptimized={!canOptimizeArtwork(media.poster)} className="object-cover" />
            </Link>
          )}
          <div key={`${media.kind}:${media.id}`} className="billboard-copy" data-switching="true" aria-live={paused ? "polite" : "off"}>
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
              <Button
                variant="light"
                size="lg"
                onClick={() => router.push(`/${media.kind === "manga" ? "read" : "room"}/${newRoomId()}?${new URLSearchParams({ title: media.title, media: media.id, kind: media.kind })}`)}
              >
                <Users className="size-5" aria-hidden="true" />
                {media.kind === "anime" ? "Watch together" : "Read together"}
              </Button>
              <ButtonLink href={titleHref(media)} variant="ghost" size="lg" aria-label={`More info about ${media.title}`} onClick={() => rememberTitle(media)}>
                <Info className="size-5" aria-hidden="true" />
                More info
              </ButtonLink>
            </div>
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
    </section>
  );
}
