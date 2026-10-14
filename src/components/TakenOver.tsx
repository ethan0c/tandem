"use client";

/** Shown in a tab whose room was opened in another tab: only one tab is in the call at a time. */
export function TakenOver({ onUseHere, compact = false }: { onUseHere: () => void; compact?: boolean }) {
  return (
    <div role="alertdialog" aria-labelledby="taken-over-title" className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl border border-white/10 bg-ink-800 text-center text-white shadow-2xl ${compact ? "p-4" : "p-6"}`}>
        <h2 id="taken-over-title" className={`font-medium ${compact ? "text-sm" : "text-lg"}`}>Open in another tab</h2>
        <p className={`mt-1.5 text-zinc-400 ${compact ? "text-[11px]" : "text-sm"}`}>
          You joined this room from another tab, so the call moved there.
        </p>
        <button onClick={onUseHere} className={`btn3d btn3d-brand mt-4 ${compact ? "btn3d-sm" : "btn3d-md"}`}>
          Use here
        </button>
      </div>
    </div>
  );
}
