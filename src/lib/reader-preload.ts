/** At most two speculative image requests. Changing pages replaces the waiting batch. */
export function createPagePreloader(createImage: () => HTMLImageElement = () => new Image()) {
  const loaded = new Set<string>();
  const active = new Map<string, HTMLImageElement>();
  let queue: string[] = [];
  let disposed = false;
  function pump() {
    while (!disposed && active.size < 2 && queue.length) {
      const url = queue.shift()!;
      if (loaded.has(url) || active.has(url)) continue;
      const image = createImage();
      active.set(url, image);
      image.referrerPolicy = "no-referrer";
      image.fetchPriority = "low";
      image.decoding = "async";
      const finish = (success: boolean) => {
        if (disposed) return;
        if (success) loaded.add(url);
        active.delete(url);
        image.onload = image.onerror = null;
        pump();
      };
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = url;
    }
  }
  return {
    setTargets(urls: string[]) { queue = [...new Set(urls)]; pump(); },
    dispose() {
      disposed = true;
      queue = [];
      for (const image of active.values()) {
        image.onload = image.onerror = null;
        image.removeAttribute("src");
      }
      active.clear();
      loaded.clear();
    },
  };
}
