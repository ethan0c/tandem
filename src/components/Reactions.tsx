"use client";

import { useCallback, useState } from "react";
import { Heart } from "lucide-react";
import { REACTIONS, type Member, type Reaction } from "@/lib/types";

interface Floating {
  id: string;
  emoji: Reaction;
  /** Horizontal start, as a percentage of the layer's width. */
  x: number;
}

/** Reactions currently floating up the screen. Each one removes itself when its animation ends. */
export function useFloatingReactions() {
  const [items, setItems] = useState<Floating[]>([]);
  const add = useCallback((id: string, emoji: Reaction) => {
    setItems((prev) => [...prev.slice(-24), { id, emoji, x: 15 + Math.random() * 70 }]);
  }, []);
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((r) => r.id !== id)), []);
  return { items, add, remove };
}

export function FloatingReactions({ items, onDone }: { items: Floating[]; onDone: (id: string) => void }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {items.map((r) => (
        <span
          key={r.id}
          onAnimationEnd={() => onDone(r.id)}
          className="reaction-float absolute bottom-4 text-3xl"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

/** One button per reaction. With `collapsed`, a heart that opens the row. */
export function ReactionBar({ onSend, collapsed = false }: { onSend: (emoji: Reaction) => void; collapsed?: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Reactions"
        title="Reactions"
        className="flex size-7 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
      >
        <Heart className="size-3.5" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Reactions">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSend(emoji)}
          aria-label={`React with ${emoji}`}
          className="flex size-7 items-center justify-center rounded-full text-base transition hover:scale-110 hover:bg-white/10 active:scale-95"
        >
          {emoji}
        </button>
      ))}
      {collapsed && (
        <button onClick={() => setOpen(false)} aria-label="Hide reactions" className="px-1 text-xs text-zinc-500 hover:text-white">
          ×
        </button>
      )}
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
