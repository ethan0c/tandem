import { Suspense } from "react";
import { Reader } from "@/components/catalog/Reader";
import { notFound } from "next/navigation";
export const metadata = {
  title: "Read together",
  robots: { index: false, follow: false },
};
async function ResolvedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{4,24}$/i.test(id)) notFound();
  return <Reader roomId={id.toLowerCase()} />;
}

export default function Page(props: { params: Promise<{ id: string }> }) {
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
