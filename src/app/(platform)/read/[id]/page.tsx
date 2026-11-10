import { Reader } from "@/components/catalog/Reader";
import { notFound } from "next/navigation";
export const metadata = { title: "Read together", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{4,24}$/i.test(id)) notFound();
  return <Reader roomId={id.toLowerCase()} />;
}
