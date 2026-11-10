export type MediaKind = "anime" | "manga";
export interface CatalogTitle {
  id: string;
  kind: MediaKind;
  title: string;
  originalTitle: string;
  aliases: string[];
  synopsis: string;
  poster: string;
  cover: string;
  genres: string[];
  year: number | null;
  status: string;
  format: string;
  total: number | null;
  rating: number | null;
  slug: string;
  trailer: string | null;
}
export type LibraryStatus =
  | "current"
  | "planned"
  | "completed"
  | "paused"
  | "dropped";
export interface LibraryEntry {
  media: CatalogTitle;
  status: LibraryStatus;
  progress: number;
  favorite: boolean;
  subscribed: boolean;
  updatedAt: number;
  readingPosition?: { chapter: number; page: number };
}
export function mediaKey(media: Pick<CatalogTitle, "kind" | "id">) {
  return `${media.kind}:${media.id}`;
}
export function titleHref(media: Pick<CatalogTitle, "kind" | "id">) {
  return `/title/${media.kind}/${media.id}`;
}
export const libraryStatuses: Record<LibraryStatus, string> = {
  current: "In progress",
  planned: "For later",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
};
