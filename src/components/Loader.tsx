import { LogoMark } from "@/components/Logo";

export function Loader({ label = "Loading…", size = 64 }: { label?: string; size?: number }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 text-center">
      <LogoMark size={size} color="#a78bfa" className="tandem-loader" />
      <span className="text-sm text-zinc-300">{label}</span>
    </div>
  );
}
