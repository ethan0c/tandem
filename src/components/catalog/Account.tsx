"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button, ButtonLink } from "@/components/Button";
import { useLibrary } from "./LibraryProvider";
export function Account() {
  const { user, entries, notice } = useLibrary();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured || busy) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password") || "");
    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error("Accounts are unavailable.");
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
    <div className="mx-auto max-w-sm py-8 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        {user ? "Account" : mode === "signup" ? "Create an account" : mode === "reset" ? "Reset password" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {user
          ? "Your library and progress sync to this account."
          : "Sync your library across devices. Browsing and rooms work without an account."}
      </p>
      {!isSupabaseConfigured ? (
        <div className="mt-8">
          <p className="text-sm text-zinc-300">
            Accounts are not configured on this installation yet.
          </p>
          <p className="mt-3 text-xs leading-6 text-muted">
            You can still save a library in this browser and export a backup.
          </p>
          <ButtonLink href="/library" className="mt-5">
            Open local library
          </ButtonLink>
        </div>
      ) : user ? (
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-xs text-zinc-400">Signed in as</p>
          <p className="mt-1 break-all text-sm font-semibold">{user.email}</p>
          <p className="mt-3 text-xs text-muted">
            {entries.length} stories · {notice}
          </p>
          <ButtonLink href="/library" className="mt-6 w-full">
            Your library
          </ButtonLink>
          <Button
            variant="ghost"
            className="mt-4 w-full"
            onClick={async () => {
              const client = await getSupabase();
              await client?.auth.signOut();
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      ) : (
        <form
          className="mt-8 space-y-5"
          onSubmit={submit}
        >
          <label className="block text-sm font-medium text-zinc-300">
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
            <label className="block text-sm font-medium text-zinc-300">
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
          <Button className="w-full" size="lg" type="submit" disabled={busy}>
            {busy
              ? "Connecting…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            {mode === "signin" ? (
              <>
                <button type="button" className="min-h-11 text-zinc-400 hover:text-white" onClick={() => { setMode("reset"); setMessage(""); }}>
                  Forgot password?
                </button>
                <button type="button" className="min-h-11 font-semibold text-brand-300 hover:text-white" onClick={() => { setMode("signup"); setMessage(""); }}>
                  Create an account
                </button>
              </>
            ) : (
              <button type="button" className="min-h-11 text-zinc-400 hover:text-white" onClick={() => { setMode("signin"); setMessage(""); }}>
                Already have an account? <span className="font-semibold text-brand-300">Sign in</span>
              </button>
            )}
          </div>
          <p className="border-t border-white/10 pt-5 text-xs leading-5 text-zinc-400">
            Your guest library stays in this browser. To bring it along, export it from Library before signing in, then import it.
          </p>
        </form>
      )}
      {message && (
        <p role="status" className="mt-5 text-sm leading-6 text-brand-200">
          {message}
        </p>
      )}
    </div>
  );
}
export function ResetPassword() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isSupabaseConfigured || busy) return;
          setBusy(true);
          const password = String(
            new FormData(e.currentTarget).get("password"),
          );
          try {
            const client = await getSupabase();
            if (!client) throw new Error("Accounts are unavailable.");
            const { error } = await client.auth.updateUser({ password });
            if (error) throw error;
            setMessage("Password updated. You can return to your library.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Couldn’t connect. Try again.");
          } finally { setBusy(false); }
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
        <Button disabled={busy || !isSupabaseConfigured}>Update password</Button>
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
