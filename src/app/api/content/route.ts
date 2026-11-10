import { getContentCatalog, getContentPlayback } from "@/lib/content";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const kind = p.get("kind"); const id = p.get("id") || "";
  if ((kind !== "anime" && kind !== "manga") || !/^\d{1,10}$/.test(id)) return Response.json({ error: "Invalid title." }, { status: 400 });
  const unit = p.get("unit");
  if (unit && unit !== "film" && !/^[a-f0-9-]{36}$/i.test(unit)) return Response.json({ error: "Invalid episode or chapter." }, { status: 400 });
  const language = p.get("language") || "en";
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(language)) return Response.json({ error: "Invalid language." }, { status: 400 });
  const offset = Math.max(0, Math.min(9900, Math.floor((Number(p.get("offset")) || 0) / 100) * 100));
  try {
    const data = unit ? await getContentPlayback(kind, id, unit) : await getContentCatalog(kind, id, offset, language);
    return data ? Response.json(data, { headers: { "Cache-Control": unit ? "private, no-store" : "public, max-age=60" } }) : Response.json({ error: "This episode or chapter is unavailable." }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "This source is temporarily unavailable." }, { status: 503 }); }
}
