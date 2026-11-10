import { getCatalogTitle } from "@/lib/catalog";
import { weebPageUrl } from "@/lib/content-providers";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "";
  const unit = params.get("unit") || "";
  const page = Number(params.get("page"));
  if (!/^\d{1,10}$/.test(id) || !/^wc-[0-9A-HJKMNP-TV-Z]{26}$/i.test(unit) || !Number.isInteger(page) || page < 0 || page >= 500)
    return new Response("Invalid page.", { status: 400 });
  try {
    const media = await getCatalogTitle("manga", id);
    if (!media) return new Response("Title not found.", { status: 404 });
    const source = await weebPageUrl(media, unit, page);
    if (!source) return new Response("Page not found.", { status: 404 });
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname))
      return new Response("Unsupported page source.", { status: 502 });
    const image = await fetch(url, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif", Referer: "https://weebcentral.com/" },
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
