import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteAnalytics } from "@/components/SiteAnalytics";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ilovemygf.site"),
  title: { default: "Tandem — watch anime together", template: "%s · Tandem" },
  description:
    "Watch your favorite shows together with a video call beside the show. Create a room, share the link, and press play.",
  openGraph: { type: "website", siteName: "Tandem" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
