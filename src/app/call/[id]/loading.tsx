import { Loader } from "@/components/Loader";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader label="Opening your call…" />
    </div>
  );
}
