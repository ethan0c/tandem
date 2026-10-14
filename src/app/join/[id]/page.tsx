import type { Metadata } from "next";
import { Invite } from "@/components/plan/Invite";

export const metadata: Metadata = {
  title: "You're invited",
  description: "Join a Tandem watch night: watch the same moment together with a video call beside the show.",
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function JoinPage({ params, searchParams }: PageProps<"/join/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const to = one(query.to);
  const at = Number(one(query.at));
  return (
    <Invite
      roomId={id.toLowerCase()}
      from={one(query.from)?.slice(0, 32) || null}
      what={one(query.what)?.slice(0, 120) || null}
      // Only ever send people on to a normal web page.
      to={to && /^https?:\/\//i.test(to) ? to : null}
      at={Number.isFinite(at) && at > 0 ? at : null}
      timeZone={one(query.tz)?.slice(0, 64) || null}
    />
  );
}
