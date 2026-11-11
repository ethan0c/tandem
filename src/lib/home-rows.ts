import { cacheLife } from "next/cache";
import seed from "@/content/catalog.json";
import { browseCatalog } from "./catalog";
import type { CatalogTitle, MediaKind } from "./catalog-types";

export interface HomeRows {
  trending: CatalogTitle[];
  topAnime: CatalogTitle[];
  manga: CatalogTitle[];
  romance: CatalogTitle[];
  topManga: CatalogTitle[];
  action: CatalogTitle[];
}

/** Every home row in one cached server call, so the page arrives filled in instead of swapping posters after load. */
export async function getHomeRows(): Promise<HomeRows> {
  "use cache";
  cacheLife("hours");
  const row = (kind: MediaKind, sort = "popular", genre = "") =>
    browseCatalog({ kind, sort, genre, page: 1 }).then((result) => result.items);
  const [trending, topAnime, manga, romance, topManga, action] = await Promise.all([
    row("anime"),
    row("anime", "rating"),
    row("manga"),
    row("anime", "popular", "romance"),
    row("manga", "rating"),
    row("anime", "popular", "action"),
  ]);
  return { trending, topAnime, manga, romance, topManga, action };
}

/** The saved selection, shown at once if the live rows are still loading. */
export function savedHomeRows(): HomeRows {
  const titles = (seed as CatalogTitle[]).filter((t) => t.poster);
  const of = (kind: MediaKind) => titles.filter((t) => t.kind === kind);
  const byRating = (list: CatalogTitle[]) => [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const genre = (kind: MediaKind, name: string) => of(kind).filter((t) => t.genres.some((g) => g.toLowerCase() === name));
  return {
    trending: of("anime"),
    topAnime: byRating(of("anime")),
    manga: of("manga"),
    romance: genre("anime", "romance"),
    topManga: byRating(of("manga")),
    action: genre("anime", "action"),
  };
}
