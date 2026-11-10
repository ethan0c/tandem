import type { CatalogTitle, MediaKind } from "./catalog-types";

export const catalogFormats = {
  manga: [
    { value: "manga", label: "Manga" },
    { value: "manhwa", label: "Manhwa" },
    { value: "manhua", label: "Manhua" },
    { value: "novel", label: "Novels" },
    { value: "oneshot", label: "One-shots" },
    { value: "doujin", label: "Doujinshi" },
    { value: "oel", label: "English originals" },
  ],
  anime: [
    { value: "TV", label: "TV series" },
    { value: "movie", label: "Movies" },
    { value: "OVA", label: "OVA" },
    { value: "ONA", label: "ONA" },
    { value: "special", label: "Specials" },
    { value: "music", label: "Music" },
  ],
} as const;
const singularLabels: Readonly<Record<string, string>> = { novel: "Novel", oneshot: "One-shot", oel: "English original", movie: "Movie", special: "Special" };

export function isCatalogFormat(kind: MediaKind, format: string) {
  return !format || catalogFormats[kind].some((option) => option.value.toLowerCase() === format.toLowerCase());
}
export function canonicalCatalogFormat(kind: MediaKind, format: string) {
  return !format ? "" : catalogFormats[kind].find((option) => option.value.toLowerCase() === format.toLowerCase())?.value;
}
export function matchesCatalogFormat(media: Pick<CatalogTitle, "format">, format: string) {
  return !format || (typeof media.format === "string" && media.format.toLowerCase() === format.toLowerCase());
}
export function catalogFormatLabel(media: Pick<CatalogTitle, "kind" | "format">) {
  const format = catalogFormats[media.kind].find((option) => matchesCatalogFormat(media, option.value));
  return format ? singularLabels[format.value] || format.label : typeof media.format === "string" && media.format ? media.format : "Unknown format";
}
