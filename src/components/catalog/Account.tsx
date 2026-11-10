"use client";
import { useState } from "react";
import { Cloud, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, ButtonLink } from "@/components/Button";
import { useLibrary } from "./LibraryProvider";
export function Account() {
  const { user, entries, notice } = useLibrary();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password") || "");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/account/reset`,
        });
        if (error) throw error;
        setMessage("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/account` },
        });
        if (error) throw error;
        setMessage(
          data.session
            ? "You’re signed in."
            : "Check your email to confirm your account, then sign in.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Couldn’t connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-md py-6 sm:py-12">
      <span className="mb-6 grid size-14 place-items-center rounded-2xl border border-brand-400/20 bg-brand-500/10 text-brand-300">
        <Cloud className="size-6" />
      </span>
      <p className="eyebrow">Keep your stories with you</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">
        {user ? "Your corner of Tandem." : "Same library. Any screen."}
      </h1>
      <p className="mt-4 text-sm leading-7 text-zinc-400">
        {user
          ? "Your anime, manga, and progress are saved to your private account."
          : "Sign in to sync your library across devices. You can always browse and join rooms as a guest."}
      </p>
      {!supabase ? (
        <div className="mt-7 rounded-2xl border border-white/10 p-6">
          <p className="text-sm text-zinc-300">
            Accounts are not configured on this installation yet.
          </p>
          <p className="mt-3 text-xs leading-6 text-zinc-500">
            You can still save a library in this browser and export a backup.
          </p>
          <ButtonLink href="/library" className="mt-5">
            Open local library
          </ButtonLink>
        </div>
      ) : user ? (
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <p className="break-all text-sm">{user.email}</p>
          <p className="mt-3 text-xs text-zinc-500">
            {entries.length} stories · {notice}
          </p>
          <ButtonLink href="/library" className="mt-6 w-full">
            Your library
          </ButtonLink>
          <Button
            variant="ghost"
            className="mt-4 w-full"
            onClick={async () => {
              await supabase!.auth.signOut();
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      ) : (
        <form
          className="mt-7 space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6"
          onSubmit={submit}
        >
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              aria-pressed={mode === "signin"}
              className={mode === "signin" ? "text-white" : "text-zinc-500"}
              onClick={() => {
                setMode("signin");
                setMessage("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={mode === "signup"}
              className={mode === "signup" ? "text-white" : "text-zinc-500"}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Create account
            </button>
          </div>
          <label className="block text-xs text-zinc-400">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="field mt-2 w-full"
              placeholder="you@example.com"
            />
          </label>
          {mode !== "reset" && (
            <label className="block text-xs text-zinc-400">
              Password
              <input
                type="password"
                name="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={mode === "signup" ? 8 : undefined}
                required
                className="field mt-2 w-full"
              />
            </label>
          )}
          <Button className="w-full" type="submit" disabled={busy}>
            {busy
              ? "Connecting…"
              : mode === "signup"
                ? "Create your account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
          <button
            type="button"
            className="text-xs text-zinc-500 hover:text-brand-300"
            onClick={() => {
              setMode("reset");
              setMessage("");
            }}
          >
            Forgot your password?
          </button>
          <p className="text-[11px] leading-6 text-zinc-600">
            Your guest library stays in this browser. Export it before signing
            in, then import it into your account to bring it along.
          </p>
        </form>
      )}
      {message && (
        <p role="status" className="mt-5 text-sm leading-6 text-brand-200">
          {message}
        </p>
      )}
      <p className="mt-6 flex items-center gap-2 text-[11px] text-zinc-600">
        <ShieldCheck className="size-3.5" />
        Private by default. Your library is yours.
      </p>
    </div>
  );
}
export function ResetPassword() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-3xl">A fresh start.</h1>
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) return;
          setBusy(true);
          const password = String(
            new FormData(e.currentTarget).get("password"),
          );
          const { error } = await supabase.auth.updateUser({ password });
          setMessage(
            error
              ? error.message
              : "Password updated. You can return to your library.",
          );
          setBusy(false);
        }}
      >
        <label className="block text-sm">
          New password
          <input
            required
            minLength={8}
            name="password"
            type="password"
            autoComplete="new-password"
            className="field mt-2 w-full"
          />
        </label>
        <Button disabled={busy || !supabase}>Update password</Button>
      </form>
      <p className="mt-4 text-sm" role="status">
        {message}
      </p>
      <ButtonLink href="/library" variant="ghost" className="mt-6">
        Your library
      </ButtonLink>
    </div>
  );
}
