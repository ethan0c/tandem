"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Member } from "@/lib/types";

export function Participants({ members, selfId, hostId, compact = false }: { members: Member[]; selfId: string | null; hostId?: string | null; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const self = members.find((m) => m.id === selfId) ?? members[0];
  const avatarSize = compact ? "size-6" : "size-7";
  useLayoutEffect(() => {
    const element = dialog.current;
    return () => element?.close();
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="View participants"
        aria-haspopup="dialog"
        title="View participants"
        onClick={() => { if (!dialog.current?.open) dialog.current?.showModal(); }}
        className="flex shrink-0 items-center rounded-full transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-2"
      >
        <span className={`${compact ? "flex" : "hidden sm:flex"} -space-x-2`}>
          {members.map((m) => (
            <span key={m.id} title={m.name} className={`flex ${avatarSize} items-center justify-center rounded-full border-2 border-ink text-[11px] font-semibold ${m.id === selfId ? "bg-brand-600" : "bg-brand-900"}`}>
              {m.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </span>
        {!compact && <span aria-hidden="true" className={`flex ${avatarSize} items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold sm:hidden`}>{self?.name.slice(0, 1).toUpperCase() ?? "?"}</span>}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onClose={() => { if (trigger.current?.getClientRects().length) trigger.current.focus(); }}
        onKeyDown={(event) => {
          if (event.key === "Tab") { event.preventDefault(); closeButton.current?.focus(); }
        }}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm overflow-visible rounded-2xl border border-white/10 bg-ink-800 p-0 text-white shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm"
      >
        <div className="overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div><h2 id={headingId} className="text-base font-medium">Participants</h2><p className="mt-0.5 text-xs text-zinc-400">{members.length} {members.length === 1 ? "person" : "people"} in this room</p></div>
            <button ref={closeButton} type="button" aria-label="Close participants" onClick={() => dialog.current?.close()} className="flex size-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-400"><X className="size-4" /></button>
          </div>
          <ul className="max-h-[50dvh] overflow-y-auto p-3">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-3">
                <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${m.id === selfId ? "bg-brand-600" : "bg-brand-900"}`}>{m.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1 break-words text-sm">{m.name}{m.id === selfId && <span className="ml-2 text-xs text-zinc-400">You</span>}</span>
                {m.id === hostId && <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-400">Host</span>}
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
