import { LoaderCircle } from "lucide-react";

export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 text-center">
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-zinc-400 motion-reduce:animate-none" />
      <span className="text-sm text-zinc-300">{label}</span>
    </div>
  );
}
