import { cacheLife } from "next/cache";
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
