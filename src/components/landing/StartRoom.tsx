"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { newRoomId, parseRoomCode } from "@/lib/room-id";

export function StartRoom() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function create() {
    setCreating(true);
    router.push(`/room/${newRoomId()}`);
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseRoomCode(code);
    if (!parsed) {
      setError("Paste a room link or an 8-character code.");
      return;
    }
    router.push(`/room/${parsed}`);
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row">
      <button
        onClick={create}
        disabled={creating}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-70"
      >
        <Plus className="size-4" />
        {creating ? "Creating…" : "Create a room"}
      </button>
      <form onSubmit={join} className="flex flex-1 flex-col gap-1">
        <div className="flex h-12 items-center rounded-xl border border-zinc-200 bg-white pl-4 pr-1.5 shadow-sm transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="Paste a room link or code"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            aria-label="Room link or code"
          />
          <button
            type="submit"
            className="inline-flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-white transition hover:bg-brand-600"
            aria-label="Join room"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
        {error && <p className="px-1 text-xs text-red-600">{error}</p>}
      </form>
    </div>
  );
}
