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
      <div className="loading-shape mb-6 h-4 w-28" />
      <div className="loading-shape h-64 rounded-2xl" />
      <div className="relative -mt-[90px] grid gap-7 sm:grid-cols-[180px_1fr] sm:gap-9 sm:px-7">
        <div className="loading-shape aspect-[0.7] w-32 rounded-2xl sm:w-full" />
        <div className="min-w-0 space-y-4 sm:pt-16"><div className="loading-shape h-4 w-40" /><div className="loading-shape h-10 w-4/5" /><div className="loading-shape h-11 w-64 max-w-full" /></div>
      </div>
      <div className="mt-10 space-y-3"><div className="loading-shape h-4 w-full" /><div className="loading-shape h-4 w-5/6" /><div className="loading-shape h-4 w-2/3" /></div>
    </div>
  </section>;
}

export function ViewerSkeleton({ kind }: { kind?: MediaKind }) {
  return <section aria-label={`Loading ${kind === "manga" ? "chapter" : "player"}`} aria-busy="true" role="status">
    <span className="sr-only">Opening your {kind === "manga" ? "chapter" : "video"}…</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="loading-shape h-4 w-28" />
      <div className="loading-shape h-9 w-80 max-w-full" />
      <div className="loading-shape h-4 w-48" />
      <div className={`loading-shape rounded-xl ${kind === "manga" ? "mx-auto h-[75svh] max-w-[850px]" : "aspect-video"}`} />
      <div className="loading-shape mx-auto h-11 w-full max-w-[600px]" />
    </div>
  </section>;
}
