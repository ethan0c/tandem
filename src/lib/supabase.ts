"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = !!(url && key);
export let supabase: SupabaseClient | null = null;
let pending: Promise<SupabaseClient | null> | null = null;
const listeners = new Set<(client: SupabaseClient) => void>();

/** Guests do not download the account/database SDK. Existing sessions initialize immediately. */
export function needsAccountClient() {
  if (!isSupabaseConfigured) return false;
  if (location.pathname.startsWith("/account") || /access_token=|refresh_token=|type=recovery/.test(location.hash)) return true;
  try {
    return !!localStorage.getItem(`sb-${new URL(url!).hostname.split(".")[0]}-auth-token`);
  } catch { return true; }
}

export function onSupabaseReady(listener: (client: SupabaseClient) => void) {
  listeners.add(listener);
  if (supabase) listener(supabase);
  return () => { listeners.delete(listener); };
}

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!url || !key) return Promise.resolve(null);
  if (supabase) return Promise.resolve(supabase);
  if (!pending) pending = import("@supabase/supabase-js").then(({ createClient }) => {
    supabase = createClient(url, key);
    for (const listener of listeners) listener(supabase);
    return supabase;
  }).catch((error) => { pending = null; throw error; });
  return pending;
}
