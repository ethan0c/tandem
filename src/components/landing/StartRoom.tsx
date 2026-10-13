"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import { newRoomId, parseRoomCode } from "@/lib/room-id";

export function StartRoom({ tone = "light" }: { tone?: "light" | "dark" | "brand" }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const dark = tone !== "light";

  // Next.js preserves this page with Activity; clear transient state when hidden.
  useLayoutEffect(() => {
    return () => setCreating(false);
  }, []);

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
      <Button size="lg" onClick={create} disabled={creating} className="sm:min-w-48">
        {creating ? "Creating…" : "Create a room"}
        <ChevronRight className="-mr-1 size-5" strokeWidth={2.5} />
      </Button>
      <form onSubmit={join} className="flex flex-1 flex-col gap-1">
        <div
          className={`room-link-field flex h-14 items-center rounded-2xl border-2 pl-4 pr-1.5 transition ${
            dark ? "border-white/20 bg-white/10 focus-within:border-white/60" : "border-ink/15 bg-white focus-within:border-ink/40"
          }`}
        >
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="…or paste a room link"
            className={`min-w-0 flex-1 bg-transparent text-sm focus:outline-none ${
              dark ? "text-white placeholder:text-white/60" : "text-ink placeholder:text-zinc-500"
            }`}
            aria-label="Room link or code"
            aria-invalid={!!error}
          />
          <button type="submit" className={`btn3d ${dark ? "btn3d-ghost" : "btn3d-dark"} btn3d-icon !h-9 !w-9 !rounded-xl`} aria-label="Join room">
            <ArrowRight className="size-4" />
          </button>
        </div>
        {error && <p role="alert" className={`form-error px-1 text-xs ${dark ? "text-red-200" : "text-red-600"}`}>{error}</p>}
      </form>
    </div>
  );
}
