import type { CatalogTitle } from "./catalog-types";

export interface ContentUnit {
  id: string;
  number: number;
  label: string;
  title: string;
  language: string;
  group?: string;
}
export interface ContentCatalog {
  media: CatalogTitle;
  source: string;
  units: ContentUnit[];
  total: number;
  hasMore: boolean;
  notice?: string;
  externalUrl?: string;
}
export interface ContentPlayback {
  source: string;
  credit: string;
  sourceUrl: string;
  unit: ContentUnit;
  streams?: { url: string; type: string; label: string }[];
  embedUrl?: string;
  pages?: string[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  malId?: number;
}

/** Exact, public-domain video URLs. Room participants cannot supply arbitrary media URLs. */
export const directAnime: Record<
  string,
  {
    title: string;
    source: string;
    credit: string;
    sourceUrl: string;
    streams: NonNullable<ContentPlayback["streams"]>;
  }
> = {
  "4650": {
    title: "Namakura Gatana",
    source: "Internet Archive / Wikimedia Commons",
    credit:
      "Namakura Gatana (1917), Jun’ichi Kōuchi. Public-domain silent film; restored version.",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Kouichi_Jun%27ichi_-_Namakura_Gatana_(1917)_-_4-minute_restored_version.webm",
    streams: [
      {
        url: "https://archive.org/download/namakura-gatana-1917/Namakura%20Gatana%201917%20restoration.ia.mp4",
        type: "video/mp4",
        label: "MP4",
      },
      {
        url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/bf/Kouichi_Jun%27ichi_-_Namakura_Gatana_%281917%29_-_4-minute_restored_version.webm/Kouichi_Jun%27ichi_-_Namakura_Gatana_%281917%29_-_4-minute_restored_version.webm.480p.vp9.webm",
        type: "video/webm",
        label: "WebM · 480p",
      },
    ],
  },
};
export function approvedVideo(mediaId: string, url: string) {
  if (
    typeof mediaId !== "string" ||
    typeof url !== "string" ||
    !Object.hasOwn(directAnime, mediaId)
  )
    return false;
  return (
    directAnime[mediaId]?.streams.some((stream) => stream.url === url) === true
  );
}
export const directManga: Record<string, ContentPlayback> = {
  "24249": {
    source: "Ubunchu! translation project",
    credit:
      "Ubunchu! by Hiroshi Seo, first published by ASCII Media Works. English translation: Tarek Saier. Cleaning and typesetting: PublicDesert. Original: CC BY-NC-SA 2.1 JP; English translation: CC BY-NC-SA 4.0. Pages resized to WebP for reading. Non-commercial use only.",
    sourceUrl: "https://github.com/publicdesert/ubunchu_english#attribution",
    unit: {
      id: "ubunchu-12",
      number: 12,
      label: "Chapter 12",
      title: "Ubunchu!",
      language: "en",
    },
    pages: Array.from(
      { length: 16 },
      (_, index) =>
        `/reader/ubunchu/12/${String(index + 1).padStart(3, "0")}.webp`,
    ),
  },
};
export function safePageBase(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "uploads.mangadex.org" ||
        url.hostname.endsWith(".mangadex.network"))
      ? `${url.origin}${url.pathname.replace(/\/$/, "")}`
      : null;
  } catch {
    return null;
  }
}
