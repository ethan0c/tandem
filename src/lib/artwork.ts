/** Only public image hosts already allowed by the Next image optimizer. */
export function canOptimizeArtwork(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["media.kitsu.app", "media.kitsu.io", "images.unsplash.com"].includes(url.hostname);
  } catch { return false; }
}

/** Kitsu serves several sizes of each image; heroes ask for the large cover instead of the stored small one. */
export function largeArtwork(src: string) {
  return /^https:\/\/media\.kitsu\.(app|io)\/(anime|manga)\/(cover|poster)_images\/\d+\/(small|medium|tiny)\./.test(src)
    ? src.replace(/\/(small|medium|tiny)\.(\w+)(\?.*)?$/, "/large.$2$3")
    : src;
}
