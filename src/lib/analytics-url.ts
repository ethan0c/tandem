/**
 * What analytics may see of a page address. Room codes, invite details (names, what you are watching,
 * the episode link) and story-card numbers are personal, so they never leave the browser: paths keep
 * their shape with ids replaced, and hashes and query strings are dropped (except utm_ campaign tags). The extension's panel runs
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
  // Campaign tags say which listing or link sent someone; they are not personal, so they stay.
  const campaign = new URLSearchParams([...url.searchParams].filter(([key]) => key.startsWith("utm_")));
  return `${url.origin}${path}${campaign.size ? `?${campaign}` : ""}`;
}
