import { notFound } from "next/navigation";
import { TitleDetail } from "@/components/catalog/TitleDetail";
export const metadata = { title: "Your next story" };
export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if ((kind !== "anime" && kind !== "manga") || !/^\d{1,10}$/.test(id))
    notFound();
  return <TitleDetail key={`${kind}:${id}`} kind={kind} id={id} />;
}
