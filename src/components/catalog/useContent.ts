"use client";
import { useEffect, useState } from "react";
import type { MediaKind } from "@/lib/catalog-types";
import type { ContentCatalog } from "@/lib/content-types";

export function useContent(kind: MediaKind, id: string, language = "en", offset = 0) {
  const [data, setData] = useState<ContentCatalog | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const load = async () => {
      setPending(true); setError("");
      try {
        const response = await fetch(`/api/content?${new URLSearchParams({ kind, id, language, offset: String(offset) })}`, { signal: controller.signal });
        const value = await response.json(); if (!response.ok) throw new Error(value.error || "This source could not be loaded.");
        if (!controller.signal.aborted) setData(value);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "This source is unavailable."); }
      finally { if (!controller.signal.aborted) setPending(false); }
    };
    void load(); return () => controller.abort();
  }, [kind, id, language, offset, retry]);
  return { data, error, pending, retry: () => setRetry(value => value + 1) };
}
