import type { Metadata } from "next";
import { LibraryProvider } from "@/components/catalog/LibraryProvider";
import { Room } from "@/components/room/Room";

export const metadata: Metadata = { title: "Room" };

export default async function RoomPage({ params }: PageProps<"/room/[id]">) {
  const { id } = await params;
  return <LibraryProvider><Room roomId={id.toLowerCase()} /></LibraryProvider>;
}
