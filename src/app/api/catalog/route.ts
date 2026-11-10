import { browseCatalog, getCatalogTitle, getProviders } from "@/lib/catalog";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const kind = p.get("kind") || "anime";
  if (kind !== "anime" && kind !== "manga")
    return Response.json({ error: "Choose anime or manga." }, { status: 400 });
  const id = p.get("id");
  if (id) {
    if (!/^\d{1,10}$/.test(id))
      return Response.json({ error: "Invalid title." }, { status: 400 });
    const title = await getCatalogTitle(kind, id);
    if (!title)
      return Response.json({ error: "Title not found." }, { status: 404 });
    return Response.json({
      title,
      providers: kind === "anime" ? await getProviders(id) : [],
    });
  }
  const result = await browseCatalog({
    kind,
    q: (p.get("q") || "").slice(0, 150),
    genre: (p.get("genre") || "").slice(0, 40),
    status: ["current", "finished", "upcoming"].includes(p.get("status") || "")
      ? p.get("status")!
      : "",
    year: /^\d{4}$/.test(p.get("year") || "") ? p.get("year")! : "",
    sort: p.get("sort") || "popular",
    page: Math.min(100, Math.max(1, Number(p.get("page")) || 1)),
  });
  return Response.json(result);
}
