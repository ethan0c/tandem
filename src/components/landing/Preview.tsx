import { Mic, Pause, SkipBack, SkipForward, Video, Volume2 } from "lucide-react";

/** Static mock of the room UI used on the landing page. */
export function Preview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl animate-fade-up [animation-delay:200ms]">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-b from-brand-200/60 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-2xl shadow-brand-900/20">
        {/* top bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-500" />
            room <span className="font-mono text-zinc-200">k3f9-x2qa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">in sync · 0.04s</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5">2 watching</span>
          </div>
        </div>
        {/* stage */}
        <div className="relative aspect-video bg-[radial-gradient(80%_60%_at_50%_30%,#3b2a66_0%,#120b22_55%,#09060f_100%)]">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-[11px] uppercase tracking-[0.3em] text-brand-300/70">now playing</div>
            <div className="mt-1 text-lg font-medium text-white/90">Episode 07 · The Promise</div>
          </div>
          {/* floating call */}
          <div className="absolute bottom-16 right-4 w-44 overflow-hidden rounded-xl border border-white/15 bg-zinc-900/90 shadow-xl backdrop-blur">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-700/60 to-zinc-800">
              <div className="absolute left-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white">Mia</div>
              <div className="absolute bottom-2 right-2 h-12 w-16 rounded-md border border-white/20 bg-gradient-to-br from-zinc-700 to-zinc-900" />
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white"><Mic className="size-3" /></span>
              <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white"><Video className="size-3" /></span>
            </div>
          </div>
          {/* controls */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10">
            <div className="h-1 w-full rounded-full bg-white/20">
              <div className="h-1 w-[38%] rounded-full bg-brand-500" />
            </div>
            <div className="mt-2 flex items-center gap-3 text-white">
              <SkipBack className="size-4 text-zinc-300" />
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-600"><Pause className="size-4" /></span>
              <SkipForward className="size-4 text-zinc-300" />
              <span className="font-mono text-[11px] text-zinc-300">08:51 / 23:40</span>
              <span className="ml-auto"><Volume2 className="size-4 text-zinc-300" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
