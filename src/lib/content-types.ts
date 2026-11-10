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
}
export interface ContentPlayback {
  source: string;
  credit: string;
  sourceUrl: string;
  unit: ContentUnit;
  streams?: { url: string; type: string; label: string }[];
  pages?: string[];
}

/** Exact, public-domain video URLs. Room participants cannot supply arbitrary media URLs. */
export const directAnime: Record<string, { title: string; source: string; credit: string; sourceUrl: string; streams: NonNullable<ContentPlayback["streams"]> }> = {
  "4650": {
    title: "Namakura Gatana",
    source: "Internet Archive / Wikimedia Commons",
    credit: "Namakura Gatana (1917), Jun’ichi Kōuchi. Public-domain silent film; restored version.",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kouichi_Jun%27ichi_-_Namakura_Gatana_(1917)_-_4-minute_restored_version.webm",
    streams: [
      { url: "https://archive.org/download/namakura-gatana-1917/Namakura%20Gatana%201917%20restoration.ia.mp4", type: "video/mp4", label: "MP4" },
      { url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/bf/Kouichi_Jun%27ichi_-_Namakura_Gatana_%281917%29_-_4-minute_restored_version.webm/Kouichi_Jun%27ichi_-_Namakura_Gatana_%281917%29_-_4-minute_restored_version.webm.480p.vp9.webm", type: "video/webm", label: "WebM · 480p" },
    ],
  },
};
export function approvedVideo(mediaId: string, url: string) {
  return directAnime[mediaId]?.streams.some(stream => stream.url === url) === true;
}
export function safePageBase(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && (url.hostname === "uploads.mangadex.org" || url.hostname.endsWith(".mangadex.network")) ? url.origin : null;
  } catch { return null; }
}
