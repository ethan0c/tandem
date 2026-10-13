import type { Metadata } from "next";
import { Overlay } from "@/components/overlay/Overlay";

export const metadata: Metadata = { title: "Overlay" };

export default async function OverlayPage({ params }: PageProps<"/overlay/[id]">) {
  const { id } = await params;
  return <Overlay roomId={id.toLowerCase()} />;
}
