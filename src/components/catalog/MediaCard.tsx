"use client";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus, Star } from "lucide-react";
import { useState } from "react";
import { mediaKey, titleHref, type CatalogTitle } from "@/lib/catalog-types";
import { useLibrary } from "./LibraryProvider";
import { rememberTitle } from "@/lib/public-catalog-client";
import { canOptimizeArtwork } from "@/lib/artwork";
import { catalogFormatLabel } from "@/lib/catalog-formats";

export function MediaCard({ media, eager = false, rank, progress, href, sizes }: {
  media: CatalogTitle;
  eager?: boolean;
  /** Shows a large ranking numeral beside the poster. */
  rank?: number;
  /** Where the viewer is in the story, shown as a bar across the poster. */
  progress?: { value: number; label: string };
  href?: string;
  sizes?: string;
}) {
  const { entries, save, remove, ready } = useLibrary();
  const entry = entries.find((e) => mediaKey(e.media) === mediaKey(media));
  const [artworkReady, setArtworkReady] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);
  const link = href || titleHref(media);
  const remember = () => rememberTitle(media);
  const poster = (
    <div className="relative min-w-0">
      <Link
        href={link}
        className="poster-link relative block overflow-hidden"
        aria-label={`View ${media.title}`}
        onPointerEnter={remember}
        onFocus={remember}
        onClick={remember}
      >
        {media.poster && !artworkFailed ? (
          <>
            {!artworkReady && <span aria-hidden="true" className="loading-shape absolute inset-0" />}
            <Image
              src={media.poster}
              alt=""
              fill
              sizes={sizes || "(max-width: 479px) 45vw, (max-width: 767px) 31vw, (max-width: 1023px) 24vw, 200px"}
              loading={eager ? "eager" : "lazy"}
              unoptimized={!canOptimizeArtwork(media.poster)}
              fetchPriority={eager ? "high" : "auto"}
              className={`object-cover ${artworkReady ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setArtworkReady(true)}
              onError={() => setArtworkFailed(true)}
            />
          </>
        ) : (
          <span className="poster-fallback text-sm">{media.title}</span>
        )}
        {media.rating && (
          <span className="poster-badge">
            <Star className="size-3 fill-amber-300 text-amber-300" aria-hidden="true" />
            {media.rating.toFixed(1)}
          </span>
        )}
        {progress && (
          <span className="media-progress" aria-hidden="true">
            <span style={{ width: `${Math.max(4, Math.min(100, progress.value * 100))}%` }} />
          </span>
        )}
      </Link>
      <button
        type="button"
        disabled={!ready}
        aria-label={entry ? `Remove ${media.title} from library` : `Save ${media.title} to library`}
        aria-pressed={!!entry}
        className={`save-title absolute right-2 top-2 grid size-8 place-items-center rounded-full border backdrop-blur ${entry ? "border-transparent bg-brand-600 text-white" : "border-white/40 bg-black/60 text-white hover:border-white hover:bg-black/80"}`}
        onClick={() => (entry ? remove(media) : save(media))}
      >
        {entry ? <Check className="size-4" /> : <Plus className="size-4" />}
      </button>
    </div>
  );
  return (
    <article className={`media-card group min-w-0 ${rank ? "ranked-card-wrap" : ""}`}>
      {rank ? (
        <div className="ranked-card">
          <span className="ranked-number" aria-hidden="true">{rank}</span>
          {poster}
        </div>
      ) : poster}
      <div className={rank ? "ranked-copy" : undefined}>
        <Link
          href={link}
          onPointerEnter={remember}
          onFocus={remember}
          onClick={remember}
          className="media-title mt-2.5 block text-[13px] font-semibold text-zinc-100 hover:text-brand-300"
        >
          {media.title}
        </Link>
        <p className="media-meta">
          {progress ? (
            <span className="text-brand-300">{progress.label}</span>
          ) : (
            <>
              {media.year || "TBA"}
              <span className="mx-1.5" aria-hidden="true">·</span>
              {catalogFormatLabel(media)}
              {media.total && media.total > 1 ? (
                <>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  {media.total} {media.kind === "anime" ? "eps" : "ch"}
                </>
              ) : null}
            </>
          )}
        </p>
      </div>
    </article>
  );
}
