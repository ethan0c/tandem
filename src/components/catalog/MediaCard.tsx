"use client";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Check, Star } from "lucide-react";
import { mediaKey, titleHref, type CatalogTitle } from "@/lib/catalog-types";
import { useLibrary } from "./LibraryProvider";
export function MediaCard({
  media,
  rank,
}: {
  media: CatalogTitle;
  rank?: number;
}) {
  const { entries, save, remove, ready } = useLibrary();
  const entry = entries.find((e) => mediaKey(e.media) === mediaKey(media));
  return (
    <article className="media-card group min-w-0">
      <div className="relative">
        <Link
          href={titleHref(media)}
          className="poster-link relative block overflow-hidden rounded-xl bg-white/5"
          aria-label={`View ${media.title}`}
        >
          {media.poster ? (
            <Image
              src={media.poster}
              alt=""
              fill
              sizes="(max-width: 639px) 45vw, (max-width: 1023px) 28vw, 180px"
              unoptimized
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-brand-300">
              {media.title}
            </span>
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {rank && (
            <span className="absolute left-3 top-3 grid size-7 place-items-center rounded-lg bg-black/60 text-xs font-semibold backdrop-blur">
              {String(rank).padStart(2, "0")}
            </span>
          )}
          {media.rating && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1 text-xs font-semibold">
              <Star className="size-3 fill-amber-300 text-amber-300" />
              {media.rating.toFixed(1)}
            </span>
          )}
          <span className="absolute bottom-3 right-3 rounded bg-black/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {media.format}
          </span>
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
          className={`save-title absolute right-2 top-2 grid size-8 place-items-center rounded-lg border border-white/20 backdrop-blur ${entry ? "bg-brand-600 text-white" : "bg-black/65 text-white hover:bg-brand-600"}`}
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
        className="mt-3 block truncate text-sm font-medium text-zinc-100 hover:text-brand-300"
      >
        {media.title}
      </Link>
      <p className="mt-1 truncate text-xs text-zinc-500">
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
