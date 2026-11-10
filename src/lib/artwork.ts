/** Only public image hosts already allowed by the Next image optimizer. */
export function canOptimizeArtwork(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["media.kitsu.app", "media.kitsu.io", "images.unsplash.com"].includes(url.hostname);
  } catch { return false; }
}
