import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContentViewer } from "@/components/catalog/ContentViewer";
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
      fallback={
        <p className="py-16 text-sm text-zinc-400">Opening your story…</p>
      }
    >
      <ResolvedPage {...props} />
    </Suspense>
  );
}
