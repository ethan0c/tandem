import "server-only";
import { getCatalogTitle, getExternalCatalogId } from "./catalog";
import { normalizeName } from "./library";
import { reanimeCatalog, reanimePlayback, weebCatalog, weebPlayback } from "./content-providers";
import type { CatalogTitle, MediaKind } from "./catalog-types";
import {
  directAnime,
  directManga,
  safePageBase,
  type ContentCatalog,
  type ContentPlayback,
  type ContentUnit,
} from "./content-types";

interface DexManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    year: number;
    contentRating: string;
    links?: Record<string, string>;
  };
}
interface DexChapter {
  id: string;
  attributes: {
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    externalUrl: string | null;
    pages: number;
    isUnavailable?: boolean;
    readableAt: string;
  };
  relationships: { id: string; type: string; attributes?: { name?: string } }[];
}
const cache = new Map<string, { until: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
let queue: Promise<void> = Promise.resolve();
let nextRequest = 0;
async function dex<T>(path: string, ttl = 5 * 60_000): Promise<T> {
  const saved = cache.get(path);
  if (saved && saved.until > Date.now()) return saved.data as T;
  const pending = inflight.get(path);
  if (pending) return pending as Promise<T>;
  const task = (async () => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const delay = Math.max(0, nextRequest - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequest = Date.now() + 300;
    release();
    const response = await fetch(`https://api.mangadex.org/${path}`, {
      headers: {
        "User-Agent": "Tandem/0.1 (https://www.ilovemygf.site)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 404
          ? "This chapter is no longer available from its source. Please choose a different chapter."
          : response.status === 429
            ? "The chapter source is busy. Please try again shortly."
            : "The chapter source is temporarily unavailable.",
      );
    const data = await response.json();
    if (cache.size >= 300) cache.delete(cache.keys().next().value!);
    cache.set(path, { until: Date.now() + ttl, data });
    return data as T;
  })();
  inflight.set(path, task);
  try {
    return await task;
  } finally {
    inflight.delete(path);
  }
}
async function matchManga(media: CatalogTitle): Promise<string | null> {
  const p = new URLSearchParams({
    title: media.title,
    limit: "20",
    "contentRating[]": "safe",
  });
  p.append("contentRating[]", "suggestive");
  const result = await dex<{ data: DexManga[] }>(`manga?${p}`);
  const mal = await getExternalCatalogId(
    "manga",
    media.id,
    "myanimelist/manga",
  );
  if (mal) {
    const exact = result.data.filter(
      (item) => item.attributes.links?.mal === mal,
    );
    if (exact.length === 1) return exact[0].id;
  }
  const names = new Set(
    [media.title, media.originalTitle, ...media.aliases].map(normalizeName),
  );
  const matches = result.data.filter((item) =>
    Object.values(item.attributes.title)
      .concat(...item.attributes.altTitles.map(Object.values))
      .some((title) => names.has(normalizeName(title))),
  );
  if (matches.length === 1) return matches[0].id;
  const sameYear = matches.filter(
    (item) => item.attributes.year === media.year,
  );
  return sameYear.length === 1 ? sameYear[0].id : null;
}
function chapterUnit(chapter: DexChapter): ContentUnit {
  const n = Number(chapter.attributes.chapter);
  return {
    id: chapter.id,
    number: Number.isFinite(n) && n >= 0 ? n : 0,
    label: chapter.attributes.chapter
      ? `Chapter ${chapter.attributes.chapter}`
      : "Special chapter",
    title: chapter.attributes.title || "",
    language: chapter.attributes.translatedLanguage,
    group: chapter.relationships.find((r) => r.type === "scanlation_group")
      ?.attributes?.name,
  };
}
const filmUnit: ContentUnit = {
  id: "film",
  number: 1,
  label: "Full film",
  title: "Namakura Gatana",
  language: "Silent",
};
export async function getContentCatalog(
  kind: MediaKind,
  id: string,
  offset = 0,
  language = "en",
): Promise<ContentCatalog | null> {
  const media = await getCatalogTitle(kind, id);
  if (!media) return null;
  const manga = kind === "manga" ? directManga[id] : null;
  if (manga)
    return {
      media,
      source: manga.source,
      units:
        language === manga.unit.language && offset === 0 ? [manga.unit] : [],
      total: 1,
      hasMore: false,
      ...(language !== manga.unit.language
        ? { notice: "This source is available in English." }
        : {}),
    };
  if (kind === "anime") {
    const direct = directAnime[id];
    if (!direct) {
      try {
        const connected = await reanimeCatalog(media, offset);
        if (connected) return connected;
      } catch (error) {
        return { media, source: "ReAnime", units: [], total: 0, hasMore: false,
          notice: error instanceof Error ? error.message : "ReAnime is temporarily unavailable." };
      }
    }
    return {
      media,
      source: direct?.source || "",
      units: direct ? [filmUnit] : [],
      total: direct ? 1 : 0,
      hasMore: false,
      ...(!direct
        ? {
            notice:
              "In-site episodes aren’t available from a connected source for this title yet. You can still save it or watch together using your own source.",
          }
        : {}),
    };
  }
  try {
    const connected = await weebCatalog(media, offset, language);
    if (connected) return connected;
  } catch {
    // Keep the existing MangaDex source available when WeebCentral blocks a request.
  }
  const mangaId = await matchManga(media);
  if (!mangaId)
    return {
      media,
      source: "MangaDex",
      units: [],
      total: 0,
      hasMore: false,
      notice:
        "No unambiguous match was found at the chapter source. You can still use your own page images in a reading room.",
    };
  const p = new URLSearchParams({
    limit: "100",
    offset: String(offset),
    "translatedLanguage[]": language,
    "order[chapter]": "asc",
    includeEmptyPages: "0",
    includeExternalUrl: "0",
    "includes[]": "scanlation_group",
  });
  const result = await dex<{ data: DexChapter[]; total: number }>(
    `manga/${mangaId}/feed?${p}`,
  );
  const units = result.data
    .filter(
      (c) =>
        !c.attributes.externalUrl &&
        !c.attributes.isUnavailable &&
        c.attributes.pages > 0 &&
        Date.parse(c.attributes.readableAt) <= Date.now(),
    )
    .map(chapterUnit);
  return {
    media,
    source: "MangaDex",
    units,
    total: result.total,
    hasMore: offset + 100 < result.total,
    ...(!units.length
      ? {
          notice:
            "No readable chapters were found in this language. Try another language or use your own images.",
        }
      : {}),
  };
}
export async function getContentPlayback(
  kind: MediaKind,
  id: string,
  unitId: string,
): Promise<ContentPlayback | null> {
  if (kind === "manga" && directManga[id]?.unit.id === unitId)
    return directManga[id];
  if (kind === "anime") {
    const direct = directAnime[id];
    if (direct && unitId === "film") return { ...direct, unit: filmUnit };
    if (!/^ra-\d{1,4}$/.test(unitId)) return null;
    const media = await getCatalogTitle(kind, id);
    return media ? reanimePlayback(media, unitId) : null;
  }
  if (kind === "manga" && /^wc-[0-9A-HJKMNP-TV-Z]{26}$/i.test(unitId)) {
    const media = await getCatalogTitle(kind, id);
    return media ? weebPlayback(media, unitId) : null;
  }
  if (!/^[a-f0-9-]{36}$/i.test(unitId)) return null;
  const media = await getCatalogTitle(kind, id);
  if (!media) return null;
  const mangaId = await matchManga(media);
  if (!mangaId) return null;
  const { data: chapter } = await dex<{ data: DexChapter }>(
    `chapter/${unitId}?includes[]=scanlation_group`,
  );
  if (
    !chapter.relationships.some(
      (r) => r.type === "manga" && r.id === mangaId,
    ) ||
    chapter.attributes.externalUrl ||
    chapter.attributes.isUnavailable ||
    chapter.attributes.pages < 1 ||
    Date.parse(chapter.attributes.readableAt) > Date.now()
  )
    return null;
  const server = await dex<{
    baseUrl: string;
    chapter: { hash: string; data: string[]; dataSaver: string[] };
  }>(`at-home/server/${unitId}?forcePort443=true`, 60_000);
  const base = safePageBase(server.baseUrl);
  if (!base || !/^[a-f0-9]+$/i.test(server.chapter.hash))
    throw new Error("The source returned an unsupported page server.");
  const saver = server.chapter.dataSaver?.length > 0;
  const files = saver ? server.chapter.dataSaver : server.chapter.data;
  if (
    !files?.length ||
    files.length > 500 ||
    files.some((file) => !/^[\w.-]+$/.test(file))
  )
    throw new Error("The chapter pages could not be loaded.");
  return {
    source: "MangaDex",
    credit:
      chapter.relationships
        .filter((r) => r.type === "scanlation_group")
        .map((r) => r.attributes?.name)
        .filter(Boolean)
        .join(" · ") || "Pages supplied by MangaDex",
    sourceUrl: `https://mangadex.org/chapter/${unitId}`,
    unit: chapterUnit(chapter),
    pages: files.map(
      (file) =>
        `${base}/${saver ? "data-saver" : "data"}/${server.chapter.hash}/${file}`,
    ),
  };
}
