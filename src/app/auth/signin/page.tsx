// src/app/auth/signin/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "password" | "magic";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");

  // shared
  const [email, setEmail] = useState("");

  // password mode
  const [password, setPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "working" | "error">("idle");
  const [pwError, setPwError] = useState("");

  // magic link mode
  const [mlStatus, setMlStatus] = useState<"idle" | "working" | "sent" | "error">("idle");
  const [mlError, setMlError] = useState("");

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus("working");
    setPwError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setPwError(error.message);
      setPwStatus("error");
      return;
    }
    // Redirect to dashboard profile (not onboarding)
    router.replace("/dashboard/profile");
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMlStatus("working");
    setMlError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // When the user clicks the email link, they'll end up here
        emailRedirectTo: `${window.location.origin}/dashboard/profile`,
      },
    });

    if (error) {
      setMlError(error.message);
      setMlStatus("error");
      return;
    }
    setMlStatus("sent");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {/* mode switch */}
      <div className="inline-flex rounded-full border border-white/10 p-1 text-sm">
        <button
          type="button"
          className={`px-3 py-1 rounded-full ${mode === "password" ? "bg-white text-black" : ""}`}
          onClick={() => setMode("password")}
        >
          Email & password
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded-full ${mode === "magic" ? "bg-white text-black" : ""}`}
          onClick={() => setMode("magic")}
        >
          Magic link
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={signInWithPassword} className="space-y-3 rounded-2xl border border-white/10 p-4">
          <label className="text-sm">Email</label>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="text-sm">Password</label>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button disabled={pwStatus === "working"} type="submit" className="w-full">
            {pwStatus === "working" ? "Signing in…" : "Sign in"}
          </Button>

          {pwStatus === "error" && <p className="text-sm text-red-400">{pwError}</p>}

          <div className="flex items-center justify-between text-sm text-white/70">
            <a href="/auth/signup" className="underline">Create account</a>
            <a href="/auth/reset" className="underline">Forgot your password?</a>
          </div>
        </form>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3 rounded-2xl border border-white/10 p-4">
          <label className="text-sm">Email</label>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button disabled={mlStatus === "working"} type="submit" className="w-full">
            {mlStatus === "working" ? "Sending…" : "Send magic link"}
          </Button>

          {mlStatus === "sent" && (
            <p className="text-sm text-green-400">Check your inbox for the sign-in link.</p>
          )}
          {mlStatus === "error" && <p className="text-sm text-red-400">{mlError}</p>}
        </form>
      )}
    </main>
  );
}
