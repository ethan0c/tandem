import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

/** Only the public pages. Rooms, invites and calls are private links and stay out of search. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/plan`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
