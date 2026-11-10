"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  mediaKey,
  type CatalogTitle,
  type LibraryEntry,
} from "@/lib/catalog-types";
import { isLibraryEntry, mergeEntries } from "@/lib/library";
import { getSupabase, needsAccountClient, onSupabaseReady, supabase } from "@/lib/supabase";

const KEY = "tandem:library:v1";
interface LibraryContext {
  entries: LibraryEntry[];
  ready: boolean;
  user: User | null;
  notice: string;
  save: (
    media: CatalogTitle,
    changes?: Partial<Omit<LibraryEntry, "media" | "updatedAt">>,
  ) => void;
  remove: (media: CatalogTitle) => void;
  importEntries: (entries: LibraryEntry[]) => void;
  sync: () => Promise<void>;
}
const Context = createContext<LibraryContext | null>(null);
function read(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isLibraryEntry) : [];
  } catch {
    return [];
  }
}
interface PendingWrite {
  entry: LibraryEntry;
  deleted: boolean;
}
function readOutbox(key: string): PendingWrite[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${key}:outbox`) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (r: PendingWrite) =>
            isLibraryEntry(r?.entry) && typeof r.deleted === "boolean",
        )
      : [];
  } catch {
    return [];
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const current = useRef<LibraryEntry[]>([]);
  const storageKey = useRef(KEY);
  const userRef = useRef<User | null>(null);
  const syncGeneration = useRef(0);
  const outbox = useRef<PendingWrite[]>([]);
  const uploading = useRef<Promise<boolean> | null>(null);

  const storeOutbox = useCallback(() => {
    try {
      localStorage.setItem(
        `${storageKey.current}:outbox`,
        JSON.stringify(outbox.current),
      );
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your library to keep a copy.",
      );
    }
  }, []);
  const flush = useCallback(async (): Promise<boolean> => {
    if (uploading.current) {
      await uploading.current;
      if (!outbox.current.length) return true;
    }
    const client = supabase;
    const activeUser = userRef.current;
    if (!client || !activeUser) return false;
    const run = (async () => {
      while (outbox.current.length && userRef.current?.id === activeUser.id) {
        const writes = [...outbox.current];
        const { error } = await client.from("library_entries").upsert(
          writes.map(({ entry, deleted }) => ({
            user_id: activeUser.id,
            media_key: mediaKey(entry.media),
            entry,
            deleted,
            updated_at: new Date(entry.updatedAt).toISOString(),
          })),
          { onConflict: "user_id,media_key" },
        );
        if (userRef.current?.id !== activeUser.id) return false;
        if (error) {
          setNotice(
            "Saved in this browser. Cloud sync failed; try Sync again.",
          );
          return false;
        }
        outbox.current = outbox.current.filter(
          (row) =>
            !writes.some(
              (w) =>
                mediaKey(w.entry.media) === mediaKey(row.entry.media) &&
                w.entry.updatedAt === row.entry.updatedAt,
            ),
        );
        storeOutbox();
      }
      setNotice("Saved to your library.");
      return true;
    })();
    uploading.current = run;
    try {
      return await run;
    } finally {
      if (uploading.current === run) uploading.current = null;
    }
  }, [storeOutbox]);

  const persist = useCallback((next: LibraryEntry[]) => {
    current.current = next;
    setEntries(next);
    try {
      localStorage.setItem(storageKey.current, JSON.stringify(next));
    } catch {
      setNotice(
        "Browser storage is full or unavailable. Export your library to keep a copy.",
      );
    }
  }, []);
  const sync = useCallback(async () => {
    const activeUser = userRef.current;
    if (!supabase || !activeUser) return;
    const generation = ++syncGeneration.current;
    const uploaded = await flush();
    if (
      generation !== syncGeneration.current ||
      userRef.current?.id !== activeUser.id
    )
      return;
    const { data, error } = await supabase
      .from("library_entries")
      .select("entry, deleted, updated_at")
      .eq("user_id", activeUser.id);
    if (generation !== syncGeneration.current) return;
    if (error) {
      setNotice(
        "Saved in this browser. Cloud sync is unavailable; check Supabase setup.",
      );
      return;
    }
    const tombstones = new Map<string, number>();
    const valid: LibraryEntry[] = [];
    for (const row of data || []) {
      if (!isLibraryEntry(row.entry)) continue;
      if (row.deleted)
        tombstones.set(mediaKey(row.entry.media), Date.parse(row.updated_at));
      else valid.push(row.entry);
    }
    for (const row of outbox.current) {
      if (row.deleted)
        tombstones.set(mediaKey(row.entry.media), row.entry.updatedAt);
    }
    const merged = mergeEntries(current.current, valid).filter(
      (e) => (tombstones.get(mediaKey(e.media)) || 0) < e.updatedAt,
    );
    persist(merged);
    if (uploaded) setNotice("Library synced across your devices.");
  }, [persist, flush]);

  useEffect(() => {
    let mounted = true;
    const restoreAccount = needsAccountClient();
    queueMicrotask(() => {
      if (mounted && !restoreAccount) {
        persist(read(storageKey.current));
        setReady(true);
      }
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey.current) {
        persist(read(storageKey.current));
        outbox.current = readOutbox(storageKey.current);
      }
    };
    window.addEventListener("storage", onStorage);
    let unsubscribeAuth: (() => void) | undefined;
    const unsubscribeClient = onSupabaseReady((client) => {
      const subscription = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const next = session?.user || null;
      if (next?.id === userRef.current?.id) {
        if (_event === "INITIAL_SESSION") { persist(read(storageKey.current)); setReady(true); }
        return;
      }
      ++syncGeneration.current;
      userRef.current = next;
      storageKey.current = next ? `${KEY}:${next.id}` : KEY;
      outbox.current = readOutbox(storageKey.current);
      setUser(next);
      persist(read(storageKey.current));
      setReady(true);
      if (next) {
        setNotice("Syncing your library…");
        queueMicrotask(() => void sync());
      } else setNotice("");
      });
      unsubscribeAuth = () => subscription.data.subscription.unsubscribe();
    });
    if (restoreAccount) void getSupabase().catch(() => {
      if (mounted) { persist(read(storageKey.current)); setReady(true); setNotice("Account connection is unavailable. Try signing in again."); }
    });
    const onFocus = () => {
      void sync();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      mounted = false;
      unsubscribeClient();
      unsubscribeAuth?.();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [persist, sync]);

  const upload = useCallback(
    (rows: LibraryEntry[], deleted = false) => {
      if (!supabase || !userRef.current || !rows.length) return;
      const merged = new Map(
        outbox.current.map((row) => [mediaKey(row.entry.media), row]),
      );
      for (const entry of rows)
        merged.set(mediaKey(entry.media), { entry, deleted });
      outbox.current = [...merged.values()];
      storeOutbox();
      void flush();
    },
    [storeOutbox, flush],
  );
  const save = useCallback(
    (
      media: CatalogTitle,
      changes: Partial<Omit<LibraryEntry, "media" | "updatedAt">> = {},
    ) => {
      const existing = current.current.find(
        (e) => mediaKey(e.media) === mediaKey(media),
      );
      const entry: LibraryEntry = {
        status: "planned",
        progress: 0,
        favorite: false,
        subscribed: false,
        ...existing,
        ...changes,
        media,
        updatedAt: Date.now(),
      };
      entry.progress = Math.max(
        0,
        Math.min(
          media.total || 1_000_000,
          Number.isFinite(entry.progress) ? entry.progress : 0,
        ),
      );
      persist([
        ...current.current.filter((e) => mediaKey(e.media) !== mediaKey(media)),
        entry,
      ]);
      upload([entry]);
    },
    [persist, upload],
  );
  const remove = useCallback(
    (media: CatalogTitle) => {
      const existing = current.current.find(
        (e) => mediaKey(e.media) === mediaKey(media),
      );
      persist(
        current.current.filter((e) => mediaKey(e.media) !== mediaKey(media)),
      );
      if (existing) upload([{ ...existing, updatedAt: Date.now() }], true);
    },
    [persist, upload],
  );
  const importEntries = useCallback(
    (incoming: LibraryEntry[]) => {
      persist(mergeEntries(current.current, incoming));
      upload(incoming);
    },
    [persist, upload],
  );
  return (
    <Context.Provider
      value={{
        entries,
        ready,
        user,
        notice,
        save,
        remove,
        importEntries,
        sync,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLibrary() {
  const value = useContext(Context);
  if (!value) throw new Error("LibraryProvider is required");
  return value;
}
