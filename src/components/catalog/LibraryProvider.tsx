"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { mediaKey, type CatalogTitle, type LibraryEntry } from "@/lib/catalog-types";
import { isLibraryEntry, mergeEntries } from "@/lib/library";
import { supabase } from "@/lib/supabase";

const KEY = "tandem:library:v1";
interface LibraryContext {
  entries: LibraryEntry[]; ready: boolean; user: User | null; notice: string;
  save: (media: CatalogTitle, changes?: Partial<Omit<LibraryEntry, "media" | "updatedAt">>) => void;
  remove: (media: CatalogTitle) => void; importEntries: (entries: LibraryEntry[]) => void;
  sync: () => Promise<void>;
}
const Context = createContext<LibraryContext | null>(null);
function read(key: string) { try { const parsed = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(parsed) ? parsed.filter(isLibraryEntry) : []; } catch { return []; } }

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const current = useRef<LibraryEntry[]>([]);
  const storageKey = useRef(KEY);
  const userRef = useRef<User | null>(null);
  const syncGeneration = useRef(0);

  const persist = useCallback((next: LibraryEntry[]) => {
    current.current = next;
    setEntries(next);
    try { localStorage.setItem(storageKey.current, JSON.stringify(next)); } catch { setNotice("Browser storage is full or unavailable. Export your library to keep a copy."); }
  }, []);
  const sync = useCallback(async () => {
    const activeUser = userRef.current;
    if (!supabase || !activeUser) return;
    const generation = ++syncGeneration.current;
    const { data, error } = await supabase.from("library_entries").select("entry, deleted, updated_at").eq("user_id", activeUser.id);
    if (generation !== syncGeneration.current) return;
    if (error) { setNotice("Saved in this browser. Cloud sync is unavailable; check Supabase setup."); return; }
    const tombstones = new Map<string, number>();
    const valid: LibraryEntry[] = [];
    for (const row of data || []) {
      if (!isLibraryEntry(row.entry)) continue;
      if (row.deleted) tombstones.set(mediaKey(row.entry.media), Date.parse(row.updated_at));
      else valid.push(row.entry);
    }
    const merged = mergeEntries(current.current, valid).filter(e => (tombstones.get(mediaKey(e.media)) || 0) < e.updatedAt);
    persist(merged);
    setNotice("Library synced across your devices.");
  }, [persist]);

  useEffect(() => {
    persist(read(KEY)); setReady(true);
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey.current) persist(read(storageKey.current)); };
    window.addEventListener("storage", onStorage);
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      const next = session?.user || null;
      if (next?.id === userRef.current?.id) return;
      ++syncGeneration.current;
      userRef.current = next;
      storageKey.current = next ? `${KEY}:${next.id}` : KEY;
      setUser(next); persist(read(storageKey.current));
      if (next) { setNotice("Syncing your library…"); queueMicrotask(() => void sync()); }
      else setNotice("");
    });
    const onFocus = () => { void sync(); };
    window.addEventListener("focus", onFocus);
    return () => { subscription?.data.subscription.unsubscribe(); window.removeEventListener("storage", onStorage); window.removeEventListener("focus", onFocus); };
  }, [persist, sync]);

  const upload = useCallback((rows: LibraryEntry[], deleted = false) => {
    if (!supabase || !userRef.current || !rows.length) return;
    const id = userRef.current.id;
    void supabase.from("library_entries").upsert(rows.map(entry => ({ user_id: id, media_key: mediaKey(entry.media), entry, deleted, updated_at: new Date(entry.updatedAt).toISOString() })), { onConflict: "user_id,media_key" }).then(({ error }) => setNotice(error ? "Saved in this browser. Cloud sync failed; try Sync again." : "Saved to your library."));
  }, []);
  const save = useCallback((media: CatalogTitle, changes: Partial<Omit<LibraryEntry, "media" | "updatedAt">> = {}) => {
    const existing = current.current.find(e => mediaKey(e.media) === mediaKey(media));
    const entry: LibraryEntry = { status: "planned", progress: 0, favorite: false, subscribed: false, ...existing, ...changes, media, updatedAt: Date.now() };
    entry.progress = Math.max(0, Math.min(media.total || 1_000_000, Number.isFinite(entry.progress) ? entry.progress : 0));
    persist([...current.current.filter(e => mediaKey(e.media) !== mediaKey(media)), entry]); upload([entry]);
  }, [persist, upload]);
  const remove = useCallback((media: CatalogTitle) => {
    const existing = current.current.find(e => mediaKey(e.media) === mediaKey(media));
    persist(current.current.filter(e => mediaKey(e.media) !== mediaKey(media)));
    if (existing) upload([{ ...existing, updatedAt: Date.now() }], true);
  }, [persist, upload]);
  const importEntries = useCallback((incoming: LibraryEntry[]) => { persist(mergeEntries(current.current, incoming)); upload(incoming); }, [persist, upload]);
  return <Context.Provider value={{ entries, ready, user, notice, save, remove, importEntries, sync }}>{children}</Context.Provider>;
}
export function useLibrary() { const value = useContext(Context); if (!value) throw new Error("LibraryProvider is required"); return value; }
