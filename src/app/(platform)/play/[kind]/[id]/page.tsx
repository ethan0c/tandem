import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContentViewer } from "@/components/catalog/ContentViewer";
import { ViewerSkeleton } from "@/components/catalog/LoadingStates";
export const metadata = {
  title: "Watch and read",
  robots: { index: false, follow: false },
};
async function ResolvedPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if ((kind !== "anime" && kind !== "manga") || !/^\d{1,10}$/.test(id))
    notFound();
  return <ContentViewer key={`${kind}:${id}`} kind={kind} id={id} />;
}

export default function Page(props: {
  params: Promise<{ kind: string; id: string }>;
}) {
  return (
    <Suspense
      fallback={<ViewerSkeleton />}
    >
      <ResolvedPage {...props} />
    </Suspense>
  );
}
