import "server-only";
import { getExternalCatalogId } from "./catalog";
import type { CatalogTitle } from "./catalog-types";
import type { ContentCatalog, ContentPlayback, ContentUnit } from "./content-types";
import {
  parseReAnimeEpisodes,
  parseReAnimeSearch,
  parseReAnimeServers,
  parseWeebChapters,
  parseWeebPages,
  parseWeebSearch,
  pickExactTitle,
} from "./source-parsers";

const REANIME = (process.env.REANIME_ORIGIN || "https://reanime.to").replace(/\/$/, "");
const WEEBCENTRAL = (process.env.WEEBCENTRAL_ORIGIN || "https://weebcentral.com").replace(/\/$/, "");
const REANIME_BRIDGE = process.env.REANIME_API_URL?.replace(/\/$/, "");
const cache = new Map<string, { expires: number; value: unknown }>();

async function sourceRequest<T>(url: string, html = false, ttl = 120_000, headers: Record<string, string> = {}): Promise<T> {
  const saved = cache.get(url);
  if (ttl && saved && saved.expires > Date.now()) return saved.value as T;
  const response = await fetch(url, {
    headers: { Accept: html ? "text/html" : "application/json", ...headers },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error("The content source blocked Tandem's server (HTTP 403). Try again later or open the source site directly.");
    throw new Error(`The content source returned HTTP ${response.status}.`);
  }
  const value = html ? await response.text() : await response.json();
  if (ttl) {
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(url, { expires: Date.now() + ttl, value });
  }
  return value as T;
}

async function reanimeMatch(media: CatalogTitle) {
  const query = new URLSearchParams({ q: media.title, limit: "30" });
  const url = REANIME_BRIDGE ? `${REANIME_BRIDGE}/search?${query}` : `${REANIME}/api/search?${query}`;
  const results = parseReAnimeSearch(await sourceRequest<unknown>(url));
  const anilist = await getExternalCatalogId("anime", media.id, "anilist/anime");
  const byId = anilist ? results.filter((item) => item.anilist === anilist) : [];
  return byId.length === 1 ? byId[0] : pickExactTitle(media, results);
}

async function reanimeEpisodes(slug: string): Promise<ContentUnit[]> {
  const path = REANIME_BRIDGE ? `${REANIME_BRIDGE}/episodes/${slug}` : `${REANIME}/api/episodes/${slug}`;
  return parseReAnimeEpisodes(await sourceRequest<unknown>(path));
}

export async function reanimeCatalog(media: CatalogTitle, offset: number): Promise<ContentCatalog | null> {
  const match = await reanimeMatch(media);
  if (!match) return null;
  const all = await reanimeEpisodes(match.slug);
  return { media, source: "ReAnime", units: all.slice(offset, offset + 100), total: all.length, hasMore: offset + 100 < all.length };
}

export async function reanimePlayback(media: CatalogTitle, unitId: string): Promise<ContentPlayback | null> {
  const episode = Number(unitId.match(/^ra-(\d{1,4})$/)?.[1]);
  if (!Number.isInteger(episode) || episode < 1) return null;
  const match = await reanimeMatch(media);
  if (!match) return null;
  const unit = (await reanimeEpisodes(match.slug)).find((item) => item.number === episode);
  if (!unit) return null;
  let servers: { url: string; label: string }[];
  if (REANIME_BRIDGE) {
    servers = parseReAnimeServers(await sourceRequest<unknown>(`${REANIME_BRIDGE}/servers/${match.slug}/${episode}`, false, 30_000));
  } else {
    const watch = await sourceRequest<Record<string, unknown>>(`${REANIME}/api/watch/${match.slug}/${episode}`, false, 30_000);
    servers = parseReAnimeServers(watch);
    const anilist = match.anilist || String((watch.anime as Record<string, unknown> | undefined)?.anilist || "");
    if (servers.length === 0 && /^\d+$/.test(anilist)) {
      const flix = await sourceRequest<Record<string, unknown>>(`${REANIME}/api/flix/${anilist}/${episode}`, false, 30_000);
      servers = parseReAnimeServers(flix);
    }
  }
  if (!servers.length) throw new Error("ReAnime has no streaming server for this episode.");
  const sourceUrl = `${REANIME}/watch/${match.slug}/${episode}`;
  if (REANIME_BRIDGE) {
    for (const server of servers) {
      const url = `${REANIME_BRIDGE}/stream/from-link?${new URLSearchParams({ link: server.url })}`;
      try {
        const data = await sourceRequest<{ url?: string }>(url, false, 0);
        const stream = new URL(data.url || "");
        if (stream.protocol !== "https:") continue;
        return { source: "ReAnime", credit: `Stream supplied by ReAnime · ${server.label}`, sourceUrl, unit, streams: [{ url: stream.href, type: stream.pathname.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp4", label: server.label }] };
      } catch { /* try the next server */ }
    }
  }
  return { source: "ReAnime", credit: `Player supplied by ReAnime · ${servers[0].label}`, sourceUrl, unit, embedUrl: servers[0].url };
}

async function weebMatch(media: CatalogTitle) {
  const query = new URLSearchParams({ text: media.title, sort: "Best Match", order: "Ascending", official: "Any", display_mode: "Full Display", limit: "32" });
  const html = await sourceRequest<string>(`${WEEBCENTRAL}/search/data?${query}`, true, 120_000, { "HX-Request": "true" });
  return pickExactTitle(media, parseWeebSearch(html));
}

async function weebChapters(seriesId: string) {
  const html = await sourceRequest<string>(`${WEEBCENTRAL}/series/${seriesId}/full-chapter-list`, true, 120_000, { "HX-Request": "true" });
  return parseWeebChapters(html);
}

export async function weebCatalog(media: CatalogTitle, offset: number, language: string): Promise<ContentCatalog | null> {
  if (language !== "en") return null;
  const match = await weebMatch(media);
  if (!match) return null;
  const all = await weebChapters(match.id);
  return { media, source: "WeebCentral", units: all.slice(offset, offset + 100), total: all.length, hasMore: offset + 100 < all.length };
}

async function weebSourcePlayback(media: CatalogTitle, unitId: string): Promise<ContentPlayback | null> {
  const chapterId = unitId.match(/^wc-([0-9A-HJKMNP-TV-Z]{26})$/i)?.[1];
  if (!chapterId) return null;
  const match = await weebMatch(media);
  if (!match) return null;
  const unit = (await weebChapters(match.id)).find((item) => item.id === unitId);
  if (!unit) return null;
  const sourceUrl = `${WEEBCENTRAL}/chapters/${chapterId}`;
  const html = await sourceRequest<string>(`${sourceUrl}/images?reading_style=long_strip`, true, 30_000, { "HX-Request": "true", "HX-Current-URL": sourceUrl });
  const pages = parseWeebPages(html);
  if (!pages.length) throw new Error("WeebCentral returned no pages for this chapter.");
  return { source: "WeebCentral", credit: "Chapter pages supplied by WeebCentral", sourceUrl, unit, pages };
}

export async function weebPageUrl(media: CatalogTitle, unitId: string, page: number): Promise<string | null> {
  if (!Number.isInteger(page) || page < 0 || page >= 500) return null;
  const playback = await weebSourcePlayback(media, unitId);
  return playback?.pages?.[page] || null;
}

export async function weebPlayback(media: CatalogTitle, unitId: string): Promise<ContentPlayback | null> {
  const playback = await weebSourcePlayback(media, unitId);
  if (!playback?.pages) return playback;
  return { ...playback, pages: playback.pages.map((_, page) => `/api/content/page?${new URLSearchParams({ id: media.id, unit: unitId, page: String(page) })}`) };
}
