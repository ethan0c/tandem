import Image from "next/image";
import { Mic, Pause, RotateCcw, RotateCw, Video, Volume2 } from "lucide-react";

const STAGE = "https://images.unsplash.com/photo-1559628233-100c798642d4?w=1600&q=80";
const PARTNER = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=450&fit=crop&crop=faces&q=80";
const ME = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=225&fit=crop&crop=faces&q=80";

/** Static mock of the room UI used on the landing page. */
export function Preview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl animate-fade-up [animation-delay:200ms]">
      <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-b from-brand-300/50 via-brand-200/30 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-zinc-200 border-b-[6px] bg-zinc-950 shadow-2xl shadow-brand-900/20">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-500" />
            room <span className="font-mono text-zinc-200">k3f9-x2qa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">in sync · 0.04s</span>
            <span className="hidden rounded-full bg-white/10 px-2 py-0.5 sm:inline">2 watching</span>
          </div>
        </div>
        <div className="relative aspect-video">
          <Image src={STAGE} alt="Scene from the episode playing in the room" fill sizes="(max-width: 896px) 100vw, 896px" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />
          <div className="absolute left-4 top-4 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] text-white/90 backdrop-blur">
            <span className="text-brand-300">EP 07</span> · The Promise
          </div>
          {/* floating call */}
          <div className="absolute bottom-16 right-4 w-32 overflow-hidden rounded-xl border border-white/15 bg-zinc-900/90 shadow-xl backdrop-blur sm:w-48">
            <div className="relative aspect-[4/3]">
              <Image src={PARTNER} alt="Partner on camera" fill sizes="192px" className="object-cover" />
              <div className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">Mia</div>
              <div className="absolute bottom-2 right-2 hidden h-11 w-14 overflow-hidden rounded-md border border-white/25 sm:block">
                <Image src={ME} alt="You on camera" fill sizes="56px" className="object-cover" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white"><Mic className="size-3" /></span>
              <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white"><Video className="size-3" /></span>
            </div>
          </div>
          {/* controls */}
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
            <div className="h-1 w-full rounded-full bg-white/20">
              <div className="relative h-1 w-[38%] rounded-full bg-brand-500">
                <span className="absolute -right-1.5 -top-1 size-3 rounded-full border-2 border-brand-500 bg-white" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-white">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 shadow-[0_3px_0_#5b21b6]"><Pause className="size-4" /></span>
              <RotateCcw className="size-4 text-zinc-300" />
              <RotateCw className="size-4 text-zinc-300" />
              <span className="font-mono text-[11px] text-zinc-300">08:51 / 23:40</span>
              <span className="ml-auto"><Volume2 className="size-4 text-zinc-300" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
