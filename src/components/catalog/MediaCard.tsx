"use client";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Check, Star } from "lucide-react";
import { useState } from "react";
import { mediaKey, titleHref, type CatalogTitle } from "@/lib/catalog-types";
import { useLibrary } from "./LibraryProvider";
import { rememberTitle } from "@/lib/public-catalog-client";
import { canOptimizeArtwork } from "@/lib/artwork";
export function MediaCard({ media, eager = false }: { media: CatalogTitle; eager?: boolean }) {
  const { entries, save, remove, ready } = useLibrary();
  const entry = entries.find((e) => mediaKey(e.media) === mediaKey(media));
  const [artworkReady, setArtworkReady] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);
  return (
    <article className="media-card group min-w-0">
      <div className="relative">
        <Link
          href={titleHref(media)}
          className="poster-link relative block overflow-hidden rounded-xl bg-white/5"
          aria-label={`View ${media.title}`}
          onPointerEnter={() => rememberTitle(media)}
          onFocus={() => rememberTitle(media)}
          onClick={() => rememberTitle(media)}
        >
          {media.poster && !artworkFailed ? (
            <>
            {!artworkReady && <span aria-hidden="true" className="loading-shape absolute inset-0" />}
            <Image
              src={media.poster}
              alt=""
              fill
              sizes="(max-width: 479px) calc((100vw - 56px) / 2), (max-width: 767px) calc((92vw - 32px) / 3), (max-width: 1023px) calc((92vw - 48px) / 4), (max-width: 1279px) calc((92vw - 100px) / 6), 181px"
              loading={eager ? "eager" : "lazy"}
              unoptimized={!canOptimizeArtwork(media.poster)}
              fetchPriority={eager ? "high" : "auto"}
              className={`object-cover transition duration-300 motion-reduce:transition-none group-hover:scale-105 ${artworkReady ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setArtworkReady(true)}
              onError={() => setArtworkFailed(true)}
            />
            </>
          ) : (
            <span className="absolute inset-0 grid place-items-center text-brand-300">
              {media.title}
            </span>
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {media.rating && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1 text-xs font-semibold">
              <Star className="size-3 fill-amber-300 text-amber-300" />
              {media.rating.toFixed(1)}
            </span>
          )}
        </Link>
        <button
          type="button"
          disabled={!ready}
          aria-label={
            entry
              ? `Remove ${media.title} from library`
              : `Save ${media.title} to library`
          }
          aria-pressed={!!entry}
          className={`save-title absolute right-2 top-2 grid size-9 place-items-center rounded-lg border border-white/20 backdrop-blur ${entry ? "bg-brand-600 text-white" : "bg-black/65 text-white hover:bg-brand-600"}`}
          onClick={() => (entry ? remove(media) : save(media))}
        >
          {entry ? (
            <Check className="size-4" />
          ) : (
            <Bookmark className="size-4" />
          )}
        </button>
      </div>
      <Link
        href={titleHref(media)}
        onPointerEnter={() => rememberTitle(media)}
        onFocus={() => rememberTitle(media)}
        onClick={() => rememberTitle(media)}
        className="media-title mt-3 block text-sm font-medium text-zinc-100 hover:text-brand-300"
      >
        {media.title}
      </Link>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        {media.year || "TBA"}
        <span className="mx-1.5 text-zinc-700">·</span>
        {media.total
          ? `${media.total} ${media.kind === "anime" ? "episodes" : "chapters"}`
          : media.status === "current"
            ? "Ongoing"
            : "Length unknown"}
      </p>
    </article>
  );
}
