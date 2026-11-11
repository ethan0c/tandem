"use client";
import { useEffect, useState } from "react";
import type { MediaKind } from "@/lib/catalog-types";
import type { ContentCatalog } from "@/lib/content-types";
import { fetchPublicCatalog, readStoredContentCatalog } from "@/lib/public-catalog-client";

export function useContent(
  kind: MediaKind,
  id: string,
  language = "en",
  offset = 0,
) {
  const [data, setData] = useState<ContentCatalog | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const url = `/api/content?${new URLSearchParams({ kind, id, language, offset: String(offset) })}`;
    const stored = readStoredContentCatalog(url);
    if (stored) setData(stored);
    const load = async () => {
      setPending(!stored);
      setError("");
      try {
        const value = await fetchPublicCatalog<ContentCatalog>(url, retry > 0 || !!stored);
        if (!controller.signal.aborted) setData(value);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "This source is unavailable.",
          );
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [kind, id, language, offset, retry]);
  return { data, error, pending, retry: () => setRetry((value) => value + 1) };
}
