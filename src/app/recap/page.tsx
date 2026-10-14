import type { Metadata } from "next";
import { Recap } from "@/components/recap/Recap";

export const metadata: Metadata = {
  title: "Our story",
  description: "A card of your watch nights together, made from your Tandem history in your own browser.",
  // Personal: the numbers live in the link, never on the server.
  robots: { index: false, follow: false },
};

export default function RecapPage() {
  return <Recap />;
}
