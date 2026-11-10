import * as cheerio from "cheerio";
import { normalizeName } from "./library";
import type { CatalogTitle } from "./catalog-types";
import type { ContentUnit } from "./content-types";

type ObjectValue = Record<string, unknown>;
const record = (value: unknown): ObjectValue => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
function firstList(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const root = record(value);
  for (const key of keys) {
    const nested = root[key];
    if (Array.isArray(nested)) return nested;
    const item = record(nested);
    for (const name of ["data", "results", "items", "episodes"]) if (Array.isArray(item[name])) return item[name] as unknown[];
  }
  return [];
}
const string = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const number = (value: unknown): number => typeof value === "number" ? value : Number(value);

export function pickExactTitle<T extends { title: string; year?: number | null }>(media: CatalogTitle, results: T[]): T | null {
  const names = new Set([media.title, media.originalTitle, ...media.aliases].map(normalizeName).filter(Boolean));
  const exact = results.filter((item) => names.has(normalizeName(item.title)));
  if (exact.length === 1) return exact[0];
  const sameYear = exact.filter((item) => item.year && item.year === media.year);
  return sameYear.length === 1 ? sameYear[0] : null;
}

export function parseReAnimeSearch(value: unknown): { slug: string; title: string; year: number | null; anilist: string }[] {
  const entries = firstList(value, ["data", "results", "anime", "items"]);
  return entries.flatMap((entry) => {
    const item = record(entry);
    const slug = string(item.slug || item.id);
    const title = string(item.title || item.name || record(item.titles).en || item.english_title);
    if (!/^[a-z0-9][a-z0-9_-]{0,69}$/i.test(slug) || !title) return [];
    const year = number(item.year || item.release_year);
    return [{ slug, title, year: Number.isInteger(year) && year > 1900 ? year : null, anilist: String(item.anilist || item.anilist_id || "") }];
  });
}

export function parseReAnimeEpisodes(value: unknown): ContentUnit[] {
  const entries = firstList(value, ["data", "episodes", "results"]);
  return entries.flatMap((entry) => {
    const item = record(entry);
    const n = number(item.number ?? item.episode_number ?? item.episodeNumber ?? item.episode ?? item.ep);
    if (!Number.isInteger(n) || n < 1 || n > 10000) return [];
    return [{ id: `ra-${n}`, number: n, label: `Episode ${n}`, title: string(item.title || item.name), language: "ja" }];
  }).sort((a, b) => a.number - b.number);
}

export function parseReAnimeServers(value: unknown): { url: string; label: string }[] {
  const item = record(value);
  const links = [...list(item.sub), ...list(item.dub), ...list(item.episode_links), ...list(item.servers)];
  const seen = new Set<string>();
  return links.flatMap((entry) => {
    const server = record(entry);
    const raw = string(server.dataLink || server.link || server.url);
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.hostname !== "flixcloud.cc" || !/^\/e\/[a-z0-9_-]+$/i.test(url.pathname) || !/^[12]$/.test(url.searchParams.get("v") || "")) return [];
      if (seen.has(url.href)) return [];
      seen.add(url.href);
      return [{ url: url.href, label: `${string(server.dataType || server.type) || "sub"} · ${string(server.serverName || server.name) || "server"}` }];
    } catch { return []; }
  });
}

const weebId = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
export function parseWeebSearch(html: string): { id: string; title: string }[] {
  const $ = cheerio.load(html);
  const found = new Map<string, string>();
  $('a[href*="/series/"]').each((_, element) => {
    const id = ($(element).attr("href") || "").match(/\/series\/([0-9A-HJKMNP-TV-Z]{26})/i)?.[1];
    const title = $(element).find(".text-ellipsis").first().text().trim() || $(element).find("img").first().attr("alt")?.trim() || $(element).text().trim();
    if (id && weebId.test(id) && title && !found.has(id)) found.set(id, title);
  });
  return [...found].map(([id, title]) => ({ id, title }));
}

export function parseWeebChapters(html: string): ContentUnit[] {
  const $ = cheerio.load(html);
  const found = new Map<string, ContentUnit>();
  $('a[href*="/chapters/"]').each((_, element) => {
    const id = ($(element).attr("href") || "").match(/\/chapters\/([0-9A-HJKMNP-TV-Z]{26})/i)?.[1];
    if (!id || !weebId.test(id) || found.has(id)) return;
    const title = $(element).text().replace(/\s+/g, " ").trim();
    const match = title.match(/(?:chapter|ch\.?|episode|ep\.?)\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return;
    const n = Number(match[1]);
    found.set(id, { id: `wc-${id}`, number: n, label: `Chapter ${n}`, title, language: "en" });
  });
  return [...found.values()].sort((a, b) => a.number - b.number);
}

export function parseWeebPages(html: string): string[] {
  const $ = cheerio.load(html);
  const found = new Set<string>();
  $("img").each((_, element) => {
    const image = $(element);
    if (!/^page\s*\d+/i.test(image.attr("alt") || "")) return;
    const raw = image.attr("data-url") || image.attr("data-src") || image.attr("src") || "";
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" && !url.username && !url.password) found.add(url.href);
    } catch { /* skip invalid image */ }
  });
  return [...found].slice(0, 500);
}
