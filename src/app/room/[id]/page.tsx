import type { Metadata } from "next";
import { Room } from "@/components/room/Room";

export const metadata: Metadata = { title: "Room" };

export default async function RoomPage({ params }: PageProps<"/room/[id]">) {
  const { id } = await params;
  return <Room roomId={id.toLowerCase()} />;
}
