import {
  mediaKey,
  type CatalogTitle,
  type LibraryEntry,
  type LibraryStatus,
} from "./catalog-types";

export function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function matchTitle(name: string, titles: CatalogTitle[]) {
  const normalized = normalizeName(name);
  return titles.find((t) =>
    [t.title, t.originalTitle, ...t.aliases].some(
      (alias) => normalizeName(alias) === normalized,
    ),
  );
}
export interface ImportRow {
  title: string;
  progress: number;
  status: LibraryStatus;
}
/** Plain-text library exports: one title per line; optional chapter on that or the next line. */
export function parseLibraryText(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const ignored =
    /^(?:weeb\s?central|subscriptions?|my library|library|manga|search|home|log\s?(?:in|out)|settings|profile|next|previous|page\s+\d+|all|reading|completed|plan to read|sort(?: by)?|filter|status|updated|title|chapter|last read|notifications?|bookmark(?:s|ed)?)$/i;
  for (const raw of text.slice(0, 100_000).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || ignored.test(line) || /^https?:\/\//i.test(line)) continue;
    const onlyChapter = line.match(
      /^(?:last\s+read[:\s]*|read[:\s]*)?(?:chapter|ch\.?)\s*[:#]?\s*(\d+(?:\.\d+)?)(?:\s*\/.*)?$/i,
    );
    if (onlyChapter) {
      if (rows.length) rows[rows.length - 1].progress = Number(onlyChapter[1]);
      continue;
    }
    const chapter = line.match(
      /^(.*?)\s*(?:[|\t,;–—-]\s*)?(?:last\s+read[:\s]*)?(?:chapter|ch\.?)\s*[:#]?\s*(\d+(?:\.\d+)?)(?:\s*[|\t,;].*)?$/i,
    );
    const title = (chapter ? chapter[1] : line)
      .replace(/[|,;–—-]\s*$/, "")
      .trim();
    if (title.length < 2 || title.length > 250 || /^\d+(?:\.\d+)?$/.test(title))
      continue;
    rows.push({
      title,
      progress: chapter ? Number(chapter[2]) : 0,
      status: "current",
    });
    if (rows.length >= 100) break;
  }
  const unique = new Map<string, ImportRow>();
  for (const row of rows) {
    const key = normalizeName(row.title);
    const existing = unique.get(key);
    if (!existing || row.progress > existing.progress) unique.set(key, row);
  }
  return [...unique.values()];
}
export function isLibraryEntry(value: unknown): value is LibraryEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as LibraryEntry;
  const m = e.media;
  return (
    !!m &&
    (m.kind === "anime" || m.kind === "manga") &&
    typeof m.id === "string" &&
    /^\d{1,10}$/.test(m.id) &&
    typeof m.title === "string" &&
    Array.isArray(m.aliases) &&
    m.aliases.every((a) => typeof a === "string") &&
    typeof m.originalTitle === "string" &&
    Array.isArray(m.genres) &&
    m.genres.every((g) => typeof g === "string") &&
    typeof m.synopsis === "string" &&
    typeof m.poster === "string" &&
    typeof m.cover === "string" &&
    (m.total === null || (Number.isFinite(m.total) && m.total > 0)) &&
    ["current", "planned", "completed", "paused", "dropped"].includes(
      e.status,
    ) &&
    typeof e.progress === "number" &&
    Number.isFinite(e.progress) &&
    e.progress >= 0 &&
    e.progress <= 1_000_000 &&
    (!e.readingPosition ||
      (Number.isFinite(e.readingPosition.chapter) &&
        e.readingPosition.chapter >= 1 &&
        Number.isInteger(e.readingPosition.page) &&
        e.readingPosition.page >= 0 &&
        e.readingPosition.page < 500)) &&
    (!e.watchPosition ||
      (typeof e.watchPosition.unit === "string" &&
        e.watchPosition.unit.length < 80 &&
        Number.isFinite(e.watchPosition.seconds) &&
        e.watchPosition.seconds >= 0 &&
        e.watchPosition.seconds < 1_000_000)) &&
    typeof e.updatedAt === "number" &&
    Number.isFinite(e.updatedAt) &&
    typeof e.favorite === "boolean" &&
    typeof e.subscribed === "boolean"
  );
}
export function parseBackup(text: string): LibraryEntry[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data) || data.length > 5000 || !data.every(isLibraryEntry))
    throw new Error("Choose a valid Tandem JSON library export.");
  return data;
}
export function mergeEntries(
  existing: LibraryEntry[],
  incoming: LibraryEntry[],
) {
  const merged = new Map(existing.map((e) => [mediaKey(e.media), e]));
  for (const e of incoming) {
    const before = merged.get(mediaKey(e.media));
    if (!before || e.updatedAt > before.updatedAt)
      merged.set(mediaKey(e.media), e);
  }
  return [...merged.values()];
}
