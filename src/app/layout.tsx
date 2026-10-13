import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ilovemygf.site"),
  title: { default: "Tandem — watch anime together", template: "%s · Tandem" },
  description:
    "Synced video playback and a live video call in one tab. Create a room, share the link, press play together.",
  openGraph: { type: "website", siteName: "Tandem" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
