import { FormEvent, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface Props {
  session: Session | null;
}

type Mode = "signin" | "signup";

export function AuthPanel({ session }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session) setOpen(false);
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (session) {
    return (
      <div className="auth-bar">
        <button
          type="button"
          className="auth-link"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email for a confirmation link, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  return (
    <>
      <div className="auth-bar">
        <button type="button" className="auth-link" onClick={() => setOpen(true)}>
          Sign in
        </button>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
            onClick={(e) => e.stopPropagation()}
          >
            <form className="auth-form" onSubmit={submit}>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={mode === "signin" ? "active" : ""}
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={mode === "signup" ? "active" : ""}
                  onClick={() => switchMode("signup")}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  className="auth-close"
                  aria-label="Close sign-in"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
              {error && <p className="auth-error">{error}</p>}
              {notice && <p className="auth-notice">{notice}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
