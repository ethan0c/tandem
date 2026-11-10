import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TitleDetail } from "@/components/catalog/TitleDetail";
import { TitleSkeleton } from "@/components/catalog/LoadingStates";
export const metadata = { title: "Your next story" };
async function ResolvedPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if ((kind !== "anime" && kind !== "manga") || !/^\d{1,10}$/.test(id))
    notFound();
  return <TitleDetail key={`${kind}:${id}`} kind={kind} id={id} />;
}

export default function Page(props: {
  params: Promise<{ kind: string; id: string }>;
}) {
  return (
    <Suspense
      fallback={<TitleSkeleton />}
    >
      <ResolvedPage {...props} />
    </Suspense>
  );
}
