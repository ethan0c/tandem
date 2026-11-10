import "server-only";
import seed from "@/content/catalog.json";
import type { CatalogTitle, MediaKind } from "./catalog-types";

interface Resource {
  id: string;
  type: string;
  attributes: {
    canonicalTitle?: string;
    titles?: Record<string, string>;
    abbreviatedTitles?: string[];
    synopsis?: string;
    posterImage?: { medium?: string };
    coverImage?: { small?: string };
    startDate?: string;
    status?: string;
    subtype?: string;
    episodeCount?: number;
    chapterCount?: number;
    averageRating?: string;
    slug?: string;
    youtubeVideoId?: string;
    nsfw?: boolean;
    title?: string;
    url?: string;
    number?: number;
  };
  relationships?: { categories?: { data?: { id: string }[] } };
}
interface Payload {
  data: Resource[] | Resource;
  included?: Resource[];
  links?: { next?: string };
}
export function normalizeTitle(
  item: Resource,
  included: Resource[] = [],
): CatalogTitle {
  const a = item.attributes;
  const categoryIds = new Set(
    item.relationships?.categories?.data?.map((c) => c.id) ?? [],
  );
  return {
    id: item.id,
    kind: item.type as MediaKind,
    title: a.titles?.en || a.canonicalTitle || "Untitled",
    originalTitle: a.titles?.en_jp || a.canonicalTitle || "",
    aliases: Object.values(a.titles ?? {}).concat(a.abbreviatedTitles ?? []),
    synopsis: a.synopsis || "A description is not available yet.",
    poster: a.posterImage?.medium || "",
    cover: a.coverImage?.small || "",
    genres: included
      .filter((c) => c.type === "categories" && categoryIds.has(c.id))
      .map((c) => c.attributes.title || "")
      .filter(Boolean),
    year: a.startDate ? Number(a.startDate.slice(0, 4)) : null,
    status: a.status || "unknown",
    format: a.subtype || item.type,
    total: (item.type === "anime" ? a.episodeCount : a.chapterCount) || null,
    rating: a.averageRating ? Math.round(Number(a.averageRating)) / 10 : null,
    slug: a.slug || item.id,
    trailer:
      a.youtubeVideoId && /^[\w-]{11}$/.test(a.youtubeVideoId)
        ? a.youtubeVideoId
        : null,
  };
}
const cache = new Map<string, { expires: number; value: Payload }>();
const pending = new Map<string, Promise<Payload>>();
async function request(path: string): Promise<Payload> {
  const found = cache.get(path);
  if (found && found.expires > Date.now()) return found.value;
  const inflight = pending.get(path);
  if (inflight) return inflight;
  const promise = (async () => {
    const response = await fetch(`https://kitsu.io/api/edge/${path}`, {
      headers: { Accept: "application/vnd.api+json" },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok)
      throw new Error(`Catalog provider returned ${response.status}`);
    const value = (await response.json()) as Payload;
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(path, { expires: Date.now() + 15 * 60_000, value });
    return value;
  })();
  pending.set(path, promise);
  try {
    return await promise;
  } finally {
    pending.delete(path);
  }
}
export interface CatalogQuery {
  kind: MediaKind;
  q?: string;
  genre?: string;
  status?: string;
  year?: string;
  sort?: string;
  page?: number;
}
export async function browseCatalog(query: CatalogQuery) {
  const p = new URLSearchParams({
    "page[limit]": "18",
    "page[offset]": String(((query.page || 1) - 1) * 18),
    include: "categories",
  });
  if (query.kind === "anime") p.set("filter[ageRating]", "G,PG,R");
  if (query.q) p.set("filter[text]", query.q);
  if (query.genre) p.set("filter[categories]", query.genre);
  if (query.status) p.set("filter[status]", query.status);
  if (query.year) p.set("filter[year]", query.year);
  p.set(
    "sort",
    query.sort === "rating"
      ? "-averageRating"
      : query.sort === "newest"
        ? "-startDate"
        : "-userCount",
  );
  try {
    const data = await request(`${query.kind}?${p}`);
    const items = (Array.isArray(data.data) ? data.data : [data.data])
      .filter((i) => !i.attributes.nsfw)
      .map((i) => normalizeTitle(i, data.included));
    return { items, hasMore: !!data.links?.next, source: "live" as const };
  } catch {
    let items = (seed as CatalogTitle[]).filter((i) => i.kind === query.kind);
    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter((i) =>
        [i.title, ...i.aliases].some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (query.genre)
      items = items.filter((i) =>
        i.genres.some((g) => g.toLowerCase() === query.genre),
      );
    if (query.status) items = items.filter((i) => i.status === query.status);
    if (query.year) items = items.filter((i) => String(i.year) === query.year);
    if (query.sort === "rating")
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (query.sort === "newest")
      items.sort((a, b) => (b.year || 0) - (a.year || 0));
    return {
      items: (query.page || 1) === 1 ? items : [],
      hasMore: false,
      source: "cached" as const,
    };
  }
}
export async function getCatalogTitle(kind: MediaKind, id: string) {
  try {
    const data = await request(`${kind}/${id}?include=categories`);
    const item = data.data as Resource;
    return item.attributes.nsfw ? null : normalizeTitle(item, data.included);
  } catch {
    return (
      (seed as CatalogTitle[]).find((i) => i.kind === kind && i.id === id) ||
      null
    );
  }
}
export async function getProviders(id: string) {
  try {
    const data = await request(`anime/${id}/streaming-links`);
    const allowed = [
      "crunchyroll.com",
      "netflix.com",
      "hulu.com",
      "disneyplus.com",
      "primevideo.com",
      "hidive.com",
      "youtube.com",
      "tubi.tv",
      "amazon.com",
    ];
    return (data.data as Resource[]).flatMap((item) => {
      try {
        const url = new URL(item.attributes.url || "");
        const host = url.hostname.replace(/^www\./, "");
        return url.protocol === "https:" &&
          allowed.some((h) => host === h || host.endsWith(`.${h}`))
          ? [{ name: host, url: url.href }]
          : [];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
