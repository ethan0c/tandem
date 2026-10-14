import type { Metadata } from "next";
import { Invite } from "@/components/plan/Invite";

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

/** The link preview in chat apps says who is inviting you, to what, and when. */
export async function generateMetadata({ searchParams }: PageProps<"/join/[id]">): Promise<Metadata> {
  const query = await searchParams;
  const from = one(query.from)?.slice(0, 32);
  const what = one(query.what)?.slice(0, 120);
  const at = Number(one(query.at));
  const title = `${from ?? "Someone"} invited you to watch ${what ?? "together"}`;
  const when = Number.isFinite(at) && at > 0 ? "A watch night is planned. Open to see the time in your time zone. " : "";
  const description = `${when}Watch the same moment together, with a video call beside the show. Free, no account.`;
  return {
    title,
    description,
    // An invite is personal: keep it out of search results.
    robots: { index: false, follow: false },
    // Setting openGraph here replaces the root's, so the site name and preview image come along explicitly.
    openGraph: { type: "website", siteName: "Tandem", title, description, images: ["/opengraph-image.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/twitter-image.png"] },
  };
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
