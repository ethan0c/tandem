import { Loader } from "@/components/Loader";

export default function Loading() {
  return (
    <div className="flex h-64 items-center justify-center bg-ink">
      <Loader label="Connecting to your room…" />
    </div>
  );
}
