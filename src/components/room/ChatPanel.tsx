"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SendHorizontal, X } from "lucide-react";
import { CHAT_MAX_LENGTH, type ChatMessage } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  selfId: string | null;
  onSend: (text: string) => void;
}

/** Messages from the same person within this gap share one name label. */
const GROUP_GAP_MS = 2 * 60 * 1000;

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** A simple room chat that slides in on the right, so people can react without talking over the show. */
export function ChatPanel({ open, onClose, messages, selfId, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Opening the panel puts the cursor in the box.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Follow new messages unless the reader has scrolled up to re-read something.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  function onScroll() {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
    stickToBottom.current = true;
  }

  return (
    <aside
      aria-label="Chat"
      aria-hidden={!open}
      className={`absolute inset-y-0 right-0 z-40 flex w-full flex-col border-l border-white/10 bg-ink-800/95 text-white shadow-2xl shadow-black/50 backdrop-blur transition-transform duration-200 sm:w-80 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 pl-4 pr-2">
        <h2 className="text-sm font-semibold">Chat</h2>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="flex size-8 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div ref={listRef} onScroll={onScroll} role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm leading-relaxed text-zinc-500">
            Say hi. Messages stay in the room and go away when everyone leaves.
          </p>
        ) : (
          <ol className="space-y-1">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const grouped = !!prev && prev.from === m.from && m.at - prev.at < GROUP_GAP_MS;
              const mine = m.from === selfId;
              return (
                <li key={m.id} data-testid="chat-message" data-from={m.from} className={grouped ? "" : "pt-3 first:pt-0"}>
                  {!grouped && (
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className={`text-xs font-semibold ${mine ? "text-brand-300" : "text-zinc-200"}`}>{mine ? "You" : m.name}</span>
                      <time dateTime={new Date(m.at).toISOString()} className="text-[10px] text-zinc-500">
                        {timeFormat.format(m.at)}
                      </time>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-snug text-zinc-100">{m.text}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="Send a message"
          aria-label="Message"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </aside>
  );
}
