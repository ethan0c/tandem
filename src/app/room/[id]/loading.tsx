import { LogoMark } from "@/components/Logo";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-ink">
      <LogoMark size={40} className="animate-pulse-soft" />
    </div>
  );
}
