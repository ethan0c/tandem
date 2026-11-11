import { Suspense } from "react";
import { Discover } from "@/components/catalog/Discover";
import { getHomeRows, savedHomeRows } from "@/lib/home-rows";

async function LiveHome() {
  return <Discover rows={await getHomeRows()} />;
}

export default function Page() {
  // Normally the live rows are part of the prebuilt page; the saved selection covers a cold cache.
  return (
    <Suspense fallback={<Discover rows={savedHomeRows()} />}>
      <LiveHome />
    </Suspense>
  );
}
