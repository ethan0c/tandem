import type { CatalogTitle, MediaKind } from "./catalog-types";
import { matchesCatalogFormat } from "./catalog-formats";

export interface CatalogQuery {
  kind: MediaKind;
  q?: string;
  genre?: string;
  format?: string;
  status?: string;
  year?: string;
  sort?: string;
  page?: number;
}

/** Apply subtype at the provider, so every page and search has the same format constraint. */
export function catalogQueryParams(query: CatalogQuery) {
  const p = new URLSearchParams({ "page[limit]": "18", "page[offset]": String(((query.page || 1) - 1) * 18), include: "categories" });
  if (query.kind === "anime") p.set("filter[ageRating]", "G,PG,R");
  if (query.q) p.set("filter[text]", query.q);
  if (query.genre) p.set("filter[categories]", query.genre);
  if (query.format) p.set("filter[subtype]", query.format);
  if (query.status) p.set("filter[status]", query.status);
  if (query.year) p.set("filter[year]", query.year);
  p.set("sort", query.sort === "rating" ? "-averageRating" : query.sort === "newest" ? "-startDate" : "-userCount");
  return p;
}

export function fallbackCatalog(titles: CatalogTitle[], query: CatalogQuery) {
  const items = titles.filter((media) => media.kind === query.kind &&
    matchesCatalogFormat(media, query.format || "") &&
    (!query.q || [media.title, ...media.aliases].some((title) => title.toLowerCase().includes(query.q!.toLowerCase()))) &&
    (!query.genre || media.genres.some((genre) => genre.toLowerCase().replaceAll(" ", "-") === query.genre)) &&
    (!query.status || media.status === query.status) &&
    (!query.year || String(media.year) === query.year));
  if (query.sort === "rating") items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (query.sort === "newest") items.sort((a, b) => (b.year || 0) - (a.year || 0));
  return { items: (query.page || 1) === 1 ? items : [], hasMore: false, source: "cached" as const };
}
