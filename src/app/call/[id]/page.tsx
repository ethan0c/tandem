import type { Metadata } from "next";
import { Call } from "@/components/call/Call";

export const metadata: Metadata = { title: "Call" };

export default async function CallPage({ params }: PageProps<"/call/[id]">) {
  const { id } = await params;
  return <Call roomId={id.toLowerCase()} />;
}
