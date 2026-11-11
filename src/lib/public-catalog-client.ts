import type { CatalogTitle, MediaKind } from "./catalog-types";
import type { ContentCatalog } from "./content-types";

// Public metadata only. Playback URLs, sessions and libraries never enter this cache.
const responses = new Map<string, { value: unknown; expires: number }>();
const requests = new Map<string, Promise<unknown>>();
const previews = new Map<string, CatalogTitle>();
const listeners = new Set<() => void>();
const RESPONSE_LIMIT = 24;
const PREVIEW_LIMIT = 96;
const CONTENT_PREFIX = "tandem:public-content:v1:";
const CONTENT_INDEX = `${CONTENT_PREFIX}index`;
const CONTENT_TTL = 24 * 60 * 60_000;

function contentKey(url: string): string | null {
  if (!url.startsWith("/api/content?")) return null;
  const params = new URL(url, "https://tandem.invalid").searchParams;
  const kind = params.get("kind"), id = params.get("id");
  if ((kind !== "anime" && kind !== "manga") || !id || !/^\d{1,10}$/.test(id) || params.has("unit")) return null;
  return `${CONTENT_PREFIX}${kind}:${id}:${params.get("language") || "en"}:${params.get("offset") || "0"}`;
}

function isContentCatalog(value: unknown): value is ContentCatalog {
  if (!value || typeof value !== "object") return false;
  const catalog = value as ContentCatalog;
  return !!catalog.media && (catalog.media.kind === "anime" || catalog.media.kind === "manga") &&
    /^\d{1,10}$/.test(catalog.media.id) && typeof catalog.media.title === "string" &&
    typeof catalog.source === "string" && (catalog.sourceId === undefined || /^\d{1,10}$/.test(catalog.sourceId)) &&
    Array.isArray(catalog.units) && catalog.units.length <= 100 &&
    catalog.units.every((unit) => unit && typeof unit.id === "string" && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(unit.id) && Number.isFinite(unit.number) && typeof unit.label === "string") &&
    Number.isInteger(catalog.total) && catalog.total >= 0 && typeof catalog.hasMore === "boolean";
}

export function readStoredContentCatalog(url: string): ContentCatalog | null {
  const key = contentKey(url);
  if (!key || typeof localStorage === "undefined") return null;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null") as { expires?: number; value?: unknown } | null;
    const expected = new URL(url, "https://tandem.invalid").searchParams;
    return saved && typeof saved.expires === "number" && saved.expires > Date.now() && isContentCatalog(saved.value) &&
      saved.value.media.id === expected.get("id") && saved.value.media.kind === expected.get("kind") ? saved.value : null;
  } catch { return null; }
}

export function stableContentCatalog(previous: ContentCatalog | null, incoming: ContentCatalog): ContentCatalog {
  if (!previous || previous.media.id !== incoming.media.id || previous.media.kind !== incoming.media.kind ||
      previous.source !== incoming.source || previous.units.length <= incoming.units.length) return incoming;
  return previous;
}

function storeContentCatalog(url: string, value: ContentCatalog) {
  const key = contentKey(url);
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ expires: Date.now() + CONTENT_TTL, value }));
    const index = JSON.parse(localStorage.getItem(CONTENT_INDEX) || "[]") as unknown;
    const keys = Array.isArray(index) ? index.filter((item): item is string => typeof item === "string" && item.startsWith(CONTENT_PREFIX) && item !== CONTENT_INDEX && item !== key) : [];
    keys.push(key);
    for (const old of keys.slice(0, -40)) localStorage.removeItem(old);
    localStorage.setItem(CONTENT_INDEX, JSON.stringify(keys.slice(-40)));
  } catch { /* Storage is optional; the in-memory cache still works. */ }
}

export async function fetchPublicCatalog<T>(url: string, refresh = false): Promise<T> {
  if (!/^\/api\/(?:catalog|content)\?/.test(url) || new URL(url, "https://tandem.invalid").searchParams.has("unit")) throw new Error("Only public catalog metadata can be cached.");
  const cached = responses.get(url);
  if (!refresh && cached && cached.expires > Date.now()) return cached.value as T;
  const active = requests.get(url);
  if (active) return active as Promise<T>;
  const request = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000), ...(refresh ? { cache: "no-cache" } : {}) });
    const value: unknown = await response.json();
    if (!response.ok) {
      const error = value && typeof value === "object" && "error" in value ? String(value.error) : "";
      throw new Error(error || "This source could not be loaded. Try again.");
    }
    const stable = isContentCatalog(value) && contentKey(url)
      ? stableContentCatalog(readStoredContentCatalog(url), value)
      : value;
    if (isContentCatalog(stable)) storeContentCatalog(url, stable);
    responses.delete(url);
    responses.set(url, { value: stable, expires: Date.now() + 60_000 });
    while (responses.size > RESPONSE_LIMIT) responses.delete(responses.keys().next().value!);
    return stable as T;
  })();
  requests.set(url, request);
  try { return await request; }
  finally { if (requests.get(url) === request) requests.delete(url); }
}

export function rememberTitle(media: CatalogTitle) {
  if (typeof window === "undefined") return;
  const key = `${media.kind}:${media.id}`;
  if (previews.get(key) === media) return;
  previews.delete(key);
  previews.set(key, media);
  while (previews.size > PREVIEW_LIMIT) previews.delete(previews.keys().next().value!);
  for (const listener of listeners) listener();
}
export const getTitlePreview = (kind: MediaKind, id: string) => previews.get(`${kind}:${id}`) || null;
export function subscribeTitlePreviews(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
