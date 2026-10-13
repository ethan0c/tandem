"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/Button";
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
      <Button size="lg" onClick={create} disabled={creating} className="sm:min-w-44">
        <Plus className="size-4" />
        {creating ? "Creating…" : "Create a room"}
      </Button>
      <form onSubmit={join} className="flex flex-1 flex-col gap-1">
        <div className="flex h-[3.25rem] items-center rounded-2xl border-2 border-zinc-200 bg-white pl-4 pr-1.5 shadow-[0_4px_0_#e4e4e7] transition focus-within:border-brand-400 focus-within:shadow-[0_4px_0_var(--color-brand-200)]">
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
            className="btn3d btn3d-dark btn3d-icon !h-9 !w-9 !rounded-xl"
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
