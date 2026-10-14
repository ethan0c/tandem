"use client";

import { Analytics } from "@vercel/analytics/next";
import { cleanAnalyticsUrl } from "@/lib/analytics-url";

/** Cookieless page counts (Vercel Web Analytics), with anything personal taken out of the address. */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = cleanAnalyticsUrl(event.url);
        return url ? { ...event, url } : null;
      }}
    />
  );
}
