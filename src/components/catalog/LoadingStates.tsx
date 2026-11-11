import type { MediaKind } from "@/lib/catalog-types";

export function CatalogSkeleton() {
  return <section aria-label="Loading catalog" aria-busy="true" role="status">
    <span className="sr-only">Loading stories…</span>
    <div aria-hidden="true" className="mb-8 space-y-3"><div className="loading-shape h-9 w-44" /><div className="loading-shape h-4 w-64 max-w-full" /></div>
    <div aria-hidden="true" className="media-grid">{Array.from({ length: 12 }, (_, index) => <div key={index} className="min-w-0"><div className="loading-shape aspect-[0.7] rounded-xl" /><div className="loading-shape mt-3 h-4 w-4/5" /><div className="loading-shape mt-2 h-3 w-1/2" /></div>)}</div>
  </section>;
}

export function TitleSkeleton() {
  return <section aria-label="Loading title" aria-busy="true" role="status">
    <span className="sr-only">Loading title details…</span>
    <div aria-hidden="true">
      <div className="loading-shape mb-4 h-4 w-28" />
      <div className="loading-shape h-36 rounded-2xl" />
      <div className="relative -mt-12 grid grid-cols-[96px_minmax(0,1fr)] items-end gap-4 sm:grid-cols-[128px_1fr] sm:gap-6 sm:px-5">
        <div className="loading-shape aspect-[0.7] w-24 rounded-xl sm:w-32" />
        <div className="min-w-0 space-y-3"><div className="loading-shape h-4 w-40" /><div className="loading-shape h-9 w-4/5" /><div className="loading-shape h-11 w-64 max-w-full" /></div>
      </div>
      <div className="mt-6 space-y-3"><div className="loading-shape h-4 w-full" /><div className="loading-shape h-4 w-5/6" /><div className="loading-shape h-4 w-2/3" /></div>
    </div>
  </section>;
}

export function ViewerSkeleton({ kind, title }: { kind?: MediaKind; title?: string }) {
  if (kind !== "manga") return <section className="viewer-opening" aria-label="Loading player" aria-busy="true" role="status">
    <div className="mb-7">
      <p className="eyebrow">Your watch session</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title || "Getting your episode ready"}</h1>
      <p className="mt-2 text-sm text-zinc-400">Checking the episode and video source…</p>
    </div>
    <div className="viewer-opening-screen">
      <div className="viewer-opening-message"><span className="viewer-opening-mark" aria-hidden="true">▶</span><span>Opening video…</span></div>
      <div className="viewer-opening-track" aria-hidden="true"><span /></div>
      <div className="viewer-opening-buttons" aria-hidden="true"><span /><span /><span /><i /><span /><span /></div>
    </div>
    <div className="mt-8">
      <div className="loading-shape mb-4 h-5 w-28" aria-hidden="true" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className="loading-shape aspect-[1.45] rounded-xl" key={index} />)}</div>
    </div>
  </section>;
  return <section aria-label={`Loading ${kind === "manga" ? "chapter" : "player"}`} aria-busy="true" role="status">
    <span className="sr-only">Opening your {kind === "manga" ? "chapter" : "video"}…</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="loading-shape h-4 w-28" />
      <div className="loading-shape h-9 w-80 max-w-full" />
      <div className="loading-shape h-4 w-48" />
      <div className={`loading-shape rounded-xl ${kind === "manga" ? "mx-auto aspect-[0.7] max-h-[75svh] max-w-[850px]" : "aspect-video"}`} />
      <div className="loading-shape mx-auto h-11 w-full max-w-[600px]" />
    </div>
  </section>;
}
