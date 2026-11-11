import { getCatalogTitle } from "@/lib/catalog";
import { weebPageUrl } from "@/lib/content-providers";
import { mangaDexPageUrl } from "@/lib/content";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "";
  const unit = params.get("unit") || "";
  const page = Number(params.get("page"));
  const weeb = /^wc-[0-9A-HJKMNP-TV-Z]{26}$/i.test(unit);
  const mangaDex = /^[a-f0-9-]{36}$/i.test(unit);
  if (!/^\d{1,10}$/.test(id) || (!weeb && !mangaDex) || !Number.isInteger(page) || page < 0 || page >= 500)
    return new Response("Invalid page.", { status: 400 });
  try {
    const media = await getCatalogTitle("manga", id);
    if (!media) return new Response("Title not found.", { status: 404 });
    const source = weeb ? await weebPageUrl(media, unit, page) : await mangaDexPageUrl(id, unit, page);
    if (!source) return new Response("Page not found.", { status: 404 });
    const url = new URL(source);
    const allowedHosts = weeb
      ? (process.env.WEEBCENTRAL_IMAGE_HOSTS || "official.lowee.us,temp.compsci88.com")
          .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean)
      : [];
    const allowed = weeb
      ? allowedHosts.includes(url.hostname.toLowerCase())
      : url.hostname === "uploads.mangadex.org" || url.hostname.endsWith(".mangadex.network");
    if (url.protocol !== "https:" || url.username || url.password || !allowed)
      return new Response("Unsupported page source.", { status: 502 });
    const image = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
        ...(weeb ? { Referer: `${process.env.WEEBCENTRAL_ORIGIN || "https://weebcentral.com"}/` } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!image.ok) return new Response("Page source unavailable.", { status: 502 });
    const type = image.headers.get("content-type")?.split(";")[0] || "";
    if (!["image/avif", "image/webp", "image/png", "image/jpeg", "image/gif"].includes(type))
      return new Response("Unsupported page image.", { status: 502 });
    const length = Number(image.headers.get("content-length"));
    if (Number.isFinite(length) && length > 20_000_000) return new Response("Page image is too large.", { status: 502 });
    return new Response(image.body, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Page source unavailable.", { status: 503 });
  }
}
