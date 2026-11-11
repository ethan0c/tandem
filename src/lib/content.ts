import "server-only";
import { getCatalogTitle, getExternalCatalogId } from "./catalog";
import { normalizeName } from "./library";
import { anivexaCatalog, anivexaConfigured, anivexaPlayback, reanimeCatalog, reanimePlayback, weebCatalog, weebPlayback } from "./content-providers";
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
async function matchManga(media: CatalogTitle): Promise<DexManga | null> {
  const p = new URLSearchParams({
    title: media.title,
    limit: "100",
    "contentRating[]": "safe",
  });
  p.append("contentRating[]", "suggestive");
  const [result, mal] = await Promise.all([
    dex<{ data: DexManga[] }>(`manga?${p}`),
    getExternalCatalogId("manga", media.id, "myanimelist/manga"),
  ]);
  const kitsu = result.data.filter((item) => item.attributes.links?.kt === media.id);
  if (kitsu.length === 1) return kitsu[0];
  if (mal) {
    const exact = result.data.filter(
      (item) => item.attributes.links?.mal === mal,
    );
    if (exact.length === 1) return exact[0];
  }
  const names = new Set(
    [media.title, media.originalTitle, ...media.aliases].map(normalizeName),
  );
  const matches = result.data.filter((item) =>
    Object.values(item.attributes.title)
      .concat(...item.attributes.altTitles.map(Object.values))
      .some((title) => names.has(normalizeName(title))),
  );
  if (matches.length === 1) return matches[0];
  const sameYear = matches.filter(
    (item) => item.attributes.year === media.year,
  );
  return sameYear.length === 1 ? sameYear[0] : null;
}
function officialMangaUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const hosts = ["kodansha.us", "kmanga.kodansha.com", "mangaplus.shueisha.co.jp", "www.viz.com", "www.webtoons.com", "tapas.io"];
    return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.hostname.toLowerCase())
      ? url.href
      : undefined;
  } catch { return undefined; }
}
const officialChapterCatalogs: Record<string, { url: string; label: string }> = {
  // Publisher chapter listings are useful when the connected reader only has a few pages.
  "53928": {
    url: "https://kmanga.kodansha.com/title/10008/episode/318776",
    label: "Blue Lock chapters on K MANGA",
  },
  "7176": {
    url: "https://www.viz.com/shonenjump/chapters/tokyo-ghoul",
    label: "Tokyo Ghoul chapters on VIZ",
  },
};
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
  if (kind === "anime" && anivexaConfigured) void getExternalCatalogId("anime", id, "anilist/anime");
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
        const connected = anivexaConfigured
          ? await anivexaCatalog(media, offset)
          : await reanimeCatalog(media, offset);
        if (connected) return connected;
      } catch (error) {
        return { media, source: anivexaConfigured ? "MKissa" : "ReAnime", units: [], total: 0, hasMore: false,
          notice: error instanceof Error ? error.message : "The anime source is temporarily unavailable.",
          externalUrl: anivexaConfigured ? "https://mkissa.to/" : "https://reanime.to/search" };
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
  let dexError: unknown;
  try {
    const manga = await matchManga(media);
    if (manga) {
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
        `manga/${manga.id}/feed?${p}`,
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
      const sparse = result.total <= 10 || (!!media.total && result.total < media.total * 0.7);
      const generalOfficialUrl = officialMangaUrl(manga.attributes.links?.engtl);
      const officialRelease = sparse
        ? officialChapterCatalogs[id] || (generalOfficialUrl
          ? { url: generalOfficialUrl, label: "Official English release" }
          : undefined)
        : undefined;
      if (language === "en" && sparse) {
        try {
          const alternate = await weebCatalog(media, offset, language);
          if (alternate && alternate.total > result.total && alternate.units.length > units.length)
            return alternate;
        } catch { /* Keep the MangaDex chapters when the alternate source is unavailable. */ }
      }
      return {
        media,
        source: "MangaDex",
        units,
        total: result.total,
        hasMore: offset + 100 < result.total,
        ...(officialRelease
          ? { externalUrl: officialRelease.url, externalLabel: officialRelease.label }
          : {}),
        ...(!units.length
          ? { notice: "No readable chapters were found in this language. Try another language or use your own images." }
          : sparse
            ? { notice: `MangaDex currently lists ${result.total} ${language === "en" ? "English " : ""}chapter${result.total === 1 ? "" : "s"} for this title.${media.total ? ` The catalog lists about ${media.total} chapters overall.` : ""} Other releases may not be available from this source.` }
            : {}),
      };
    }
  } catch (error) {
    dexError = error;
  }
  try {
    const connected = await weebCatalog(media, offset, language);
    if (connected) return connected;
  } catch { /* The structured source's error is more useful to show. */ }
  if (dexError) throw dexError;
  return {
    media,
    source: "MangaDex",
    units: [],
    total: 0,
    hasMore: false,
    notice: "No unambiguous match was found at the chapter source. You can still use your own page images in a reading room.",
  };
}
export async function getContentPlayback(
  kind: MediaKind,
  id: string,
  unitId: string,
  sourceId?: string,
): Promise<ContentPlayback | null> {
  if (kind === "manga" && directManga[id]?.unit.id === unitId)
    return directManga[id];
  if (kind === "anime") {
    const direct = directAnime[id];
    if (direct && unitId === "film") return { ...direct, unit: filmUnit };
    if (!/^(?:ra-\d{1,4}|av-mkissa-(?:sub|dub)-\d{1,4})$/.test(unitId)) return null;
    if (unitId.startsWith("av-")) return anivexaPlayback(id, unitId, sourceId);
    const media = await getCatalogTitle(kind, id);
    return media ? reanimePlayback(media, unitId) : null;
  }
  if (kind === "manga" && /^wc-[0-9A-HJKMNP-TV-Z]{26}$/i.test(unitId)) {
    const media = await getCatalogTitle(kind, id);
    return media ? weebPlayback(media, unitId) : null;
  }
  const playback = await mangaDexPlayback(id, unitId);
  return playback?.pages
    ? { ...playback, pages: playback.pages.map((_, page) => `/api/content/page?${new URLSearchParams({ id, unit: unitId, page: String(page) })}`) }
    : playback;
}

export async function mangaDexPageUrl(id: string, unitId: string, page: number): Promise<string | null> {
  if (!Number.isInteger(page) || page < 0 || page >= 500) return null;
  const playback = await mangaDexPlayback(id, unitId);
  return playback?.pages?.[page] || null;
}

async function mangaDexPlayback(id: string, unitId: string): Promise<ContentPlayback | null> {
  if (!/^[a-f0-9-]{36}$/i.test(unitId)) return null;
  const media = await getCatalogTitle("manga", id);
  if (!media) return null;
  const manga = await matchManga(media);
  if (!manga) return null;
  const { data: chapter } = await dex<{ data: DexChapter }>(
    `chapter/${unitId}?includes[]=scanlation_group`,
  );
  if (
    !chapter.relationships.some(
      (r) => r.type === "manga" && r.id === manga.id,
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
