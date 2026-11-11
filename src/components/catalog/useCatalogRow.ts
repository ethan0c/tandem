"use client";
import { useEffect, useState } from "react";
import seed from "@/content/catalog.json";
import type { CatalogTitle, MediaKind } from "@/lib/catalog-types";
import { fetchPublicCatalog } from "@/lib/public-catalog-client";

/** One page of the public catalog for a home row. Starts from the saved selection, then swaps in live results. */
export function useCatalogRow(kind: MediaKind, options: { sort?: string; genre?: string; status?: string } = {}) {
  const { sort = "popular", genre = "", status = "" } = options;
  const [items, setItems] = useState<CatalogTitle[]>(() => fallback(kind, sort, genre));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    // Same parameter order as the browse page, so the first page is shared through the client cache.
    const params = new URLSearchParams({ kind, q: "", genre, format: "", sort, status, year: "", page: "1" });
    fetchPublicCatalog<{ items: CatalogTitle[] }>(`/api/catalog?${params}`)
      .then((data) => { if (!cancelled && data.items?.length) setItems(data.items); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind, sort, genre, status]);
  return { items, loading };
}

function fallback(kind: MediaKind, sort: string, genre: string) {
  const titles = (seed as CatalogTitle[]).filter((t) => t.kind === kind && t.poster &&
    (!genre || t.genres.some((g) => g.toLowerCase().replaceAll(" ", "-") === genre)));
  return sort === "rating" ? [...titles].sort((a, b) => (b.rating || 0) - (a.rating || 0)) : titles;
}
