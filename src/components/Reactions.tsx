"use client";

import { useCallback, useId, useState } from "react";
import { Heart } from "lucide-react";
import { REACTIONS, type Member, type Reaction } from "@/lib/types";

interface Floating {
  id: string;
  emoji: Reaction;
  /** Who sent it: "You" or their name. */
  from: string;
  /** Horizontal start, as a percentage of the layer's width. */
  x: number;
}

/** Reactions currently floating up the screen. Each one removes itself when its animation ends. */
export function useFloatingReactions() {
  const [items, setItems] = useState<Floating[]>([]);
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((r) => r.id !== id)), []);
  const add = useCallback(
    (id: string, emoji: Reaction, from: string) => {
      setItems((prev) => [...prev.slice(-24), { id, emoji, from, x: 15 + Math.random() * 70 }]);
      // Animations do not run in a background tab, so a reaction could wait there forever and burst out
      // with all the others on return. This way only the last few seconds' worth is still there.
      setTimeout(() => remove(id), 4_000);
    },
    [remove],
  );
  return { items, add, remove };
}

export function FloatingReactions({ items, onDone }: { items: Floating[]; onDone: (id: string) => void }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {items.map((r) => (
        <span
          key={r.id}
          onAnimationEnd={() => onDone(r.id)}
          className="reaction-float absolute bottom-4 flex flex-col items-center"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
          {r.from && <span className="reaction-name">{r.from}</span>}
        </span>
      ))}
    </div>
  );
}

/** The collapsed picker sits above its positioned call container's toolbar. */
export function ReactionBar({ onSend, collapsed = false }: { onSend: (emoji: Reaction) => void; collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const pickerId = useId();
  const picker = (
    <div
      id={pickerId}
      role="group"
      aria-label="Reactions"
      className={collapsed
        ? "absolute inset-x-2 bottom-12 z-20 flex flex-wrap items-center justify-center gap-1 rounded-xl border border-white/15 bg-ink-800/95 p-2 shadow-lg"
        : "flex min-w-0 flex-wrap items-center gap-0.5"}
      onKeyDown={(event) => {
        if (collapsed && event.key === "Escape") {
          setOpen(false);
          document.querySelector<HTMLButtonElement>(`[aria-controls="${pickerId}"]`)?.focus();
        }
      }}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSend(emoji)}
          aria-label={`React with ${emoji}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-base transition hover:scale-110 hover:bg-white/10 active:scale-95"
        >
          {emoji}
        </button>
      ))}
      {collapsed && (
        <button onClick={() => setOpen(false)} aria-label="Hide reactions" className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs text-zinc-400 hover:bg-white/10 hover:text-white">
          ×
        </button>
      )}
    </div>
  );
  if (!collapsed) return picker;
  return (
    <div className="flex shrink-0 items-center">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Reactions"
        aria-expanded={open}
        aria-controls={pickerId}
        title="Reactions"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
      >
        <Heart className="size-3.5" />
      </button>
      {open && picker}
    </div>
  );
}

/** What the other people in the room are up to, if anything stops the show. */
export function partnerNotice(members: Member[], selfId: string | null): string | null {
  const away = members.find((m) => m.id !== selfId && m.status === "away");
  if (away) return `${away.name} stepped away. Back soon.`;
  const ad = members.find((m) => m.id !== selfId && m.status === "ad");
  if (ad) return `Waiting for ${ad.name}’s ad to finish…`;
  return null;
}
