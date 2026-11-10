"use client";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { ReadingSettings } from "./MangaReader";
const KEY = "tandem:reader-settings:v1";
const EVENT = "tandem:reader-settings";
const DEFAULTS: ReadingSettings = { mode: "page", direction: "ltr", fit: "height" };
const empty = () => "";
function read() { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } }
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === KEY) notify(); };
  window.addEventListener("storage", storage);
  window.addEventListener(EVENT, notify);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(EVENT, notify); };
}
export function useReadingSettings() {
  const raw = useSyncExternalStore(subscribe, read, empty);
  const [temporary, setTemporary] = useState<ReadingSettings | null>(null);
  const saved = useMemo(() => {
    try {
      const value = JSON.parse(raw);
      if (["page", "scroll"].includes(value.mode) && ["ltr", "rtl"].includes(value.direction) && ["height", "width"].includes(value.fit)) return value as ReadingSettings;
    } catch { /* A missing or outdated preference uses the standard reader. */ }
    return DEFAULTS;
  }, [raw]);
  const update = useCallback((settings: ReadingSettings) => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); setTemporary(null); window.dispatchEvent(new Event(EVENT)); }
    catch { setTemporary(settings); }
  }, []);
  return [temporary || saved, update] as const;
}
