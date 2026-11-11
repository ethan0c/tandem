import { Browse } from "@/components/catalog/Browse";
import { CatalogSkeleton } from "@/components/catalog/LoadingStates";
import { Suspense } from "react";
export const metadata = { title: "Explore manga" };
export default function Page() {
  return <Suspense fallback={<CatalogSkeleton />}><Browse kind="manga" /></Suspense>;
}
