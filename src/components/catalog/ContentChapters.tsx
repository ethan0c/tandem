"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { MediaKind } from "@/lib/catalog-types";
import { useContent } from "./useContent";
import { Button, ButtonLink } from "@/components/Button";

export function ContentChapters({ kind, id }: { kind: MediaKind; id: string }) {
  const [language, setLanguage] = useState("en"); const [offset, setOffset] = useState(0);
  const content = useContent(kind, id, language, offset);
  return <section className="content-chapters mt-10 border-t border-white/10 pt-7" id="episodes">
    <div className="section-heading"><h2>{kind === "anime" ? "Watch in Tandem" : "Chapters"}</h2>{kind === "manga" && <label><span className="sr-only">Chapter language</span><select className="field" value={language} onChange={e => { setLanguage(e.target.value); setOffset(0); }}>{[["en", "English"], ["es", "Spanish"], ["pt-br", "Portuguese (Brazil)"], ["fr", "French"], ["ja", "Japanese"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}</div>
    {content.pending ? <p className="py-4 text-sm text-zinc-400" role="status">Checking available {kind === "anime" ? "episodes" : "chapters"}…</p> : content.error ? <div className="space-y-4"><p role="status" className="text-sm text-zinc-400">{content.error}</p><Button variant="ghost" size="sm" onClick={content.retry}>Try again</Button></div> : <>
      {content.data?.source && <p className="mb-4 text-xs text-zinc-400">Source: {content.data.source}</p>}
      {content.data?.notice && <p className="text-sm leading-7 text-zinc-400">{content.data.notice}</p>}
      <div className="chapter-list">{content.data?.units.map(unit => <div key={unit.id} className="chapter-row"><div className="min-w-0"><h3 className="text-sm">{unit.label}</h3>{unit.title && unit.title !== unit.label && <p className="mt-1 text-xs leading-6 text-zinc-400">{unit.title}</p>}{unit.group && <p className="mt-1 text-xs text-zinc-500">{unit.group}</p>}</div><ButtonLink href={`/play/${kind}/${id}?${new URLSearchParams({ unit: unit.id, language })}`} variant="ghost" size="sm">{kind === "anime" ? "Watch" : "Read"}<ArrowRight className="size-3.5" /></ButtonLink></div>)}</div>
      {(offset > 0 || content.data?.hasMore) && <div className="mt-5 flex items-center justify-between gap-4"><Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0, n - 100))}>Previous chapters</Button><Button variant="ghost" size="sm" disabled={!content.data?.hasMore} onClick={() => setOffset(n => n + 100)}>More chapters</Button></div>}
    </>}
  </section>;
}
