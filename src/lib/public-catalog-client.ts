import type { CatalogTitle, MediaKind } from "./catalog-types";

// Public metadata only. Playback URLs, sessions and libraries never enter this cache.
const responses = new Map<string, { value: unknown; expires: number }>();
const requests = new Map<string, Promise<unknown>>();
const previews = new Map<string, CatalogTitle>();
const listeners = new Set<() => void>();
const RESPONSE_LIMIT = 24;
const PREVIEW_LIMIT = 96;

export async function fetchPublicCatalog<T>(url: string, refresh = false): Promise<T> {
  if (!/^\/api\/(?:catalog|content)\?/.test(url) || new URL(url, "https://tandem.invalid").searchParams.has("unit")) throw new Error("Only public catalog metadata can be cached.");
  const cached = responses.get(url);
  if (!refresh && cached && cached.expires > Date.now()) return cached.value as T;
  const active = requests.get(url);
  if (active) return active as Promise<T>;
  const request = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000), ...(refresh ? { cache: "no-cache" } : {}) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "This source could not be loaded. Try again.");
    responses.delete(url);
    responses.set(url, { value, expires: Date.now() + 60_000 });
    while (responses.size > RESPONSE_LIMIT) responses.delete(responses.keys().next().value!);
    return value;
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
