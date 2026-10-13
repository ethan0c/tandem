import { LogoMark } from "@/components/Logo";

export default function Loading() {
  return (
    <div className="flex h-64 items-center justify-center bg-ink">
      <LogoMark size={32} className="animate-pulse-soft" />
    </div>
  );
}
