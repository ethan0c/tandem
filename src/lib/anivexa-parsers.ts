import type { ContentUnit } from "./content-types";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function confirmsAnivexaMapping(value: unknown, kitsuId: string, anilistId: string): boolean {
  const top = object(value);
  const mapping = object(top.mappings || top);
  return String(mapping.kitsuId) === kitsuId && String(mapping.aniId ?? mapping.id ?? mapping.anilistId) === anilistId;
}

export function parseAnivexaEpisodes(value: unknown): ContentUnit[] {
  const provider = object(object(value).mkissa);
  if (typeof provider.error === "string") throw new Error(`MKissa: ${provider.error}`);
  const episodes = object(provider.episodes);
  const sub = Array.isArray(episodes.sub) ? episodes.sub : [];
  const dub = Array.isArray(episodes.dub) ? episodes.dub : [];
  const units = new Map<string, ContentUnit>();
  for (const [audio, entries] of [["sub", sub], ["dub", dub]] as const) {
    for (const entry of entries) {
      const episode = object(entry);
      const number = episode.number;
      if (!Number.isInteger(number) || (number as number) < 1 || (number as number) > 10000) continue;
      // The episode number and audio track form our own stable ID; the AniList ID is resolved server-side.
      if (typeof episode.id !== "string" || !episode.id.endsWith(`/${audio}/mkissa-${number}`)) continue;
      const id = `av-mkissa-${audio}-${number}`;
      units.set(id, {
        id,
        number: number as number,
        label: `Episode ${number}`,
        title: typeof episode.title === "string" ? episode.title : "",
        language: audio === "sub" ? "ja" : "en",
        group: audio === "sub" ? "Sub" : "Dub",
      });
    }
  }
  return [...units.values()].sort((a, b) => a.number - b.number || (a.group === "Sub" ? -1 : 1));
}

export function parseAnivexaPlayback(value: unknown): { streams: { url: string; type: string; label: string }[]; embedUrl?: string } {
  const watch = object(value);
  if (typeof watch.error === "string") throw new Error(`MKissa: ${watch.error}`);
  const entries = Array.isArray(watch.sources) ? watch.sources : Array.isArray(watch.streams) ? watch.streams : [];
  const streams: { url: string; type: string; label: string; priority: number }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const source = object(entry);
    const url = httpsUrl(source.extractedUrl ?? source.url);
    const format = source.extractedType ?? source.type;
    const type = format === "hls" ? "application/vnd.apple.mpegurl" : format === "mp4" ? "video/mp4" : null;
    if (!url || !type || seen.has(url)) continue;
    seen.add(url);
    streams.push({ url, type, label: typeof source.name === "string" ? source.name : "MKissa", priority: typeof source.priority === "number" ? source.priority : 0 });
  }
  streams.sort((a, b) => b.priority - a.priority);
  return { streams: streams.map(({ url, type, label }) => ({ url, type, label })) };
}
