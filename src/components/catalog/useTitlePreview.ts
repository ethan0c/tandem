"use client";
import { useSyncExternalStore } from "react";
import type { MediaKind } from "@/lib/catalog-types";
import { getTitlePreview, subscribeTitlePreviews } from "@/lib/public-catalog-client";
const empty = () => null;
export function useTitlePreview(kind: MediaKind, id: string) {
  return useSyncExternalStore(subscribeTitlePreviews, () => getTitlePreview(kind, id), empty);
}
