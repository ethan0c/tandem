/**
 * What analytics may see of a page address. Room codes, invite details (names, what you are watching,
 * the episode link) and story-card numbers are personal, so they never leave the browser: paths keep
 * their shape with ids replaced, and query strings and hashes are dropped. The extension's panel runs
 * inside streaming sites and is not counted at all.
 */
export function cleanAnalyticsUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.pathname.startsWith("/overlay")) return null;
  const path = url.pathname.replace(/^\/(room|join|call)\/[^/]+/, "/$1/[id]");
  return `${url.origin}${path}`;
}
