import { test } from "node:test";
import assert from "node:assert/strict";
import seed from "../src/content/catalog.json";
import type { CatalogTitle } from "../src/lib/catalog-types";
import { canonicalCatalogFormat, catalogFormatLabel, catalogFormats, matchesCatalogFormat } from "../src/lib/catalog-formats";
import { catalogQueryParams, fallbackCatalog } from "../src/lib/catalog-query";

const base = seed.find((media) => media.kind === "manga") as CatalogTitle;
test("format validation is scoped to the media kind and preserves provider enum spelling", () => {
  for (const option of catalogFormats.manga) assert.equal(canonicalCatalogFormat("manga", option.value), option.value);
  assert.equal(canonicalCatalogFormat("anime", "tv"), "TV");
  assert.equal(canonicalCatalogFormat("manga", "MANHWA"), "manhwa");
  assert.equal(canonicalCatalogFormat("manga", "TV"), undefined);
  assert.equal(canonicalCatalogFormat("anime", "manhwa"), undefined);
  assert.equal(canonicalCatalogFormat("manga", "unverified-category"), undefined);
  assert.equal(canonicalCatalogFormat("manga", ""), "");
});
test("format filters are sent upstream together with search and pagination", () => {
  const p = catalogQueryParams({ kind: "manga", format: "manhwa", q: "Solo", genre: "action", status: "current", year: "2024", sort: "rating", page: 3 });
  assert.equal(p.get("filter[subtype]"), "manhwa");
  assert.equal(p.get("filter[text]"), "Solo");
  assert.equal(p.get("filter[categories]"), "action");
  assert.equal(p.get("filter[status]"), "current");
  assert.equal(p.get("filter[year]"), "2024");
  assert.equal(p.get("page[offset]"), "36");
  assert.equal(p.get("sort"), "-averageRating");
  assert.equal(catalogQueryParams({ kind: "manga" }).has("filter[subtype]"), false);
});
test("saved selections and library filters use metadata formats, not names or chapter labels", () => {
  const items = [
    { ...base, id: "1", title: "Manhwa in the title", format: "manga", genres: ["Action"], status: "current", year: 2024 },
    { ...base, id: "2", title: "A Korean comic", aliases: ["Alias"], format: "manhwa", genres: ["Science Fiction"], status: "current", year: 2024 },
    { ...base, id: "3", title: "A Chinese comic", format: "manhua" },
    { ...base, id: "4", title: "A novel", format: "novel" },
  ];
  const result = fallbackCatalog(items, { kind: "manga", format: "manhwa", q: "alias", genre: "science-fiction", status: "current", year: "2024" });
  assert.deepEqual(result.items.map((media) => media.id), ["2"]);
  assert.equal(result.source, "cached");
  assert.equal(matchesCatalogFormat(items[0], "manhwa"), false);
  assert.equal(matchesCatalogFormat(items[1], "MANHWA"), true);
  assert.equal(catalogFormatLabel(items[1]), "Manhwa");
  assert.equal(catalogFormatLabel(items[3]), "Novel");
  assert.equal(matchesCatalogFormat({ format: undefined } as unknown as CatalogTitle, "manhwa"), false);
});
