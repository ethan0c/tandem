import "server-only";
import { getExternalCatalogId } from "./catalog";
import type { CatalogTitle } from "./catalog-types";
import type { ContentCatalog, ContentPlayback, ContentUnit } from "./content-types";
import { confirmsAnivexaMapping, parseAnivexaEpisodes, parseAnivexaPlayback } from "./anivexa-parsers";
import { skipWindow } from "./skip-times";
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
const ANIVEXA = process.env.ANIVEXA_API_URL?.replace(/\/$/, "");
const cache = new Map<string, { expires: number; value: unknown }>();
const episodeCache = new Map<string, { expires: number; units: ContentUnit[] }>();
const episodePending = new Map<string, Promise<ContentUnit[]>>();

async function sourceRequest<T>(url: string, html = false, ttl = 120_000, headers: Record<string, string> = {}): Promise<T> {
  const saved = cache.get(url);
  if (ttl && saved && saved.expires > Date.now()) return saved.value as T;
  const response = await fetch(url, {
    headers: { Accept: html ? "text/html" : "application/json", ...headers },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error("The content source blocked Tandem's server (HTTP 403). The source site may still work in your browser.");
    throw new Error(`The content source returned HTTP ${response.status}.`);
  }
  const value = html ? await response.text() : await response.json();
  if (ttl) {
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(url, { expires: Date.now() + ttl, value });
  }
  return value as T;
}

export const anivexaConfigured = Boolean(ANIVEXA);

async function anivexaId(kitsuId: string, savedId?: string): Promise<string> {
  if (!ANIVEXA) throw new Error("Anivexa is not configured.");
  const anilist = await getExternalCatalogId("anime", kitsuId, "anilist/anime");
  if (anilist && /^\d{1,10}$/.test(anilist)) return anilist;
  if (savedId && /^\d{1,10}$/.test(savedId)) {
    const response = await sourceRequest<unknown>(`${ANIVEXA}/map/${savedId}`, false, 60 * 60_000);
    if (confirmsAnivexaMapping(response, kitsuId, savedId)) return savedId;
  }
  throw new Error("The title mapping is temporarily unavailable. Try again shortly.");
}

async function anivexaEpisodes(media: CatalogTitle, anilist: string): Promise<ContentUnit[]> {
  const saved = episodeCache.get(anilist);
  if (saved && saved.expires > Date.now()) return saved.units;
  const running = episodePending.get(anilist);
  if (running) return running;
  const request = (async () => {
    try {
      // Anivexa can return a provider error or a short list inside HTTP 200.
      const response = await sourceRequest<unknown>(`${ANIVEXA}/episodes/mkissa/${anilist}?map=false`, false, 0);
      const units = parseAnivexaEpisodes(response);
      const best = saved && saved.units.length > units.length ? saved.units : units;
      const episodeCount = Math.max(...["Sub", "Dub"].map((track) => new Set(best.filter((unit) => unit.group === track).map((unit) => unit.number)).size));
      const suspiciouslyShort = best === units && !!media.total && media.total >= 5 && episodeCount < media.total * 0.7;
      if (best.length) episodeCache.set(anilist, { units: best, expires: Date.now() + (suspiciouslyShort ? 15_000 : 5 * 60_000) });
      return best;
    } catch (error) {
      if (saved?.units.length) return saved.units;
      throw error;
    }
  })();
  episodePending.set(anilist, request);
  try { return await request; }
  finally { if (episodePending.get(anilist) === request) episodePending.delete(anilist); }
}

export async function anivexaCatalog(media: CatalogTitle, offset: number): Promise<ContentCatalog> {
  const anilist = await anivexaId(media.id);
  const units = await anivexaEpisodes(media, anilist);
  return {
    media, source: "MKissa", sourceId: anilist, units: units.slice(offset, offset + 100), total: units.length,
    hasMore: offset + 100 < units.length,
    ...(!units.length ? { notice: "MKissa has no episodes for this title." } : {}),
  };
}

export async function anivexaPlayback(kitsuId: string, unitId: string, savedId?: string): Promise<ContentPlayback | null> {
  const match = /^av-mkissa-(sub|dub)-(\d{1,4})$/.exec(unitId);
  if (!match || Number(match[2]) < 1) return null;
  const anilist = await anivexaId(kitsuId, savedId);
  const [response, mal] = await Promise.all([
    sourceRequest<unknown>(`${ANIVEXA}/watch/mkissa/${anilist}/${match[1]}/mkissa-${match[2]}`, false, 0),
    getExternalCatalogId("anime", kitsuId, "myanimelist/anime"),
  ]);
  const playback = parseAnivexaPlayback(response);
  const watch = response && typeof response === "object" && !Array.isArray(response) ? response as Record<string, unknown> : {};
  if (watch.anilistId !== Number(anilist) || watch.episode !== Number(match[2]) || watch.audio !== match[1])
    throw new Error("MKissa returned an episode that did not match this title.");
  if (!playback.streams.length) throw new Error("MKissa returned no playable video for this episode.");
  const unit: ContentUnit = {
    id: unitId, number: Number(match[2]), label: `Episode ${match[2]}`, title: "",
    language: match[1] === "sub" ? "ja" : "en", group: match[1] === "sub" ? "Sub" : "Dub",
  };
  return {
    source: "MKissa", sourceId: anilist, credit: "Episode supplied by MKissa via Anivexa.",
    sourceUrl: "https://mkissa.to/", unit, streams: playback.streams,
    intro: skipWindow(watch.intro), outro: skipWindow(watch.outro),
    malId: mal && /^\d{1,10}$/.test(mal) ? Number(mal) : undefined,
  };
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
  const html = await sourceRequest<string>(`${sourceUrl}/images?is_prev=False&reading_style=long_strip`, true, 30_000, { "HX-Request": "true", "HX-Current-URL": sourceUrl });
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
