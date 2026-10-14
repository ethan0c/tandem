import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

export default function robots(): MetadataRoute.Robots {
  return {
    // Rooms, invites, phone calls and the extension's panel are private, one-off links.
    rules: { userAgent: "*", allow: "/", disallow: ["/room/", "/join/", "/call/", "/overlay/", "/api/", "/recap"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
