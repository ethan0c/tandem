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
  progressNote?: string;
}
function sourceProgress(value: string) {
  if (/^(?:none|never|not\s+read(?:\s+yet)?)$/i.test(value)) return { progress: 0 };
  const match = value.match(/^(?:(?:s(?:eason)?\s*\d+)\s*[-:–—]?\s*)?(?:chapter|ch\.?|episode|ep\.?|mag(?:azine)?\s+version)\s*[:#]?\s*(\d+(?:\.\d+)?)\s*$/i) || value.match(/^(\d+(?:\.\d+)?)$/);
  const progress = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(progress) || progress < 0 || progress > 1_000_000) return { progress: 0, progressNote: "No usable Last Read value was found. Check the chapter number before importing." };
  return {
    progress,
    ...(/^s(?:eason)?\s*\d+/i.test(value) ? { progressNote: `Last Read: ${value}. This uses season numbering; check the chapter number used by this catalog before selecting it.` } : {}),
  };
}
function subscriptionBlocks(lines: string[]): ImportRow[] | null {
  const latest = lines.flatMap((line, index) => /^latest\s*:/i.test(line) ? [index] : []);
  if (!latest.length || !lines.some((line) => /^(?:last\s+read|status)\s*:/i.test(line))) return null;
  const rows: ImportRow[] = [];
  for (let index = 0; index < latest.length; index++) {
    const start = latest[index], end = latest[index + 1] ?? lines.length;
    const title = lines[start - 1] || "";
    if (!title || title.length > 250 || /^(?:cover|home|search|my subscriptions(?:\s*\(\d+\))?|latest|last read|status|ongoing|complete|hiatus)\s*:?$/i.test(title)) continue;
    const block = lines.slice(start + 1, end);
    const readIndex = block.findIndex((line) => /^last\s+read\s*:/i.test(line));
    const inline = readIndex >= 0 ? block[readIndex].replace(/^last\s+read\s*:\s*/i, "") : "";
    const lastRead = inline || (readIndex >= 0 ? block[readIndex + 1] || "" : "");
    const parsed = sourceProgress(lastRead);
    rows.push({ title, ...parsed, status: parsed.progress > 0 ? "current" : "planned" });
    if (rows.length >= 100) break;
  }
  return rows;
}
function uniqueImportRows(rows: ImportRow[]) {
  const unique = new Map<string, ImportRow>();
  for (const row of rows) {
    const key = normalizeName(row.title), existing = unique.get(key);
    if (!existing || row.progress > existing.progress) unique.set(key, row);
  }
  return [...unique.values()];
}
/** Plain-text library exports: one title per line; optional chapter on that or the next line. */
export function parseLibraryText(text: string): ImportRow[] {
  const lines = text.slice(0, 100_000).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const subscriptions = subscriptionBlocks(lines);
  if (subscriptions) return uniqueImportRows(subscriptions);
  const rows: ImportRow[] = [];
  const ignored =
    /^(?:weeb\s?central|subscriptions?|my library|library|manga|search|home|log\s?(?:in|out)|settings|profile|next|previous|page\s+\d+|all|reading|completed|plan to read|sort(?: by)?|filter|status|updated|title|chapter|last read|notifications?|bookmark(?:s|ed)?)$/i;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || ignored.test(line) || /^https?:\/\//i.test(line)) continue;
    const onlyChapter = line.match(
      /^(?:last\s+read[:\s]*|read[:\s]*)?(?:chapter|ch\.?|episode|ep\.?)\s*[:#]?\s*(\d+(?:\.\d+)?)(?:\s*\/.*)?$/i,
    );
    if (onlyChapter) {
      if (rows.length) rows[rows.length - 1].progress = Number(onlyChapter[1]);
      continue;
    }
    const chapter = line.match(
      /^(.*?)\s*(?:[|\t,;–—-]\s*)?(?:last\s+read[:\s]*)?(?:chapter|ch\.?|episode|ep\.?)\s*[:#]?\s*(\d+(?:\.\d+)?)(?:\s*[|\t,;].*)?$/i,
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
  return uniqueImportRows(rows);
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
