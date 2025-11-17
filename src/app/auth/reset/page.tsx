"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"working"|"sent"|"error">("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErr("");

    const redirectTo =
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000") +
      "/auth/update-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo, // Supabase will email a link that lands on /auth/update-password
    });

    if (error) {
      setErr(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 p-4">
        <label className="text-sm">Email</label>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
        />
        <Button disabled={status==="working"} type="submit" className="w-full">
          {status==="working" ? "Sending…" : "Send reset link"}
        </Button>
        {status==="sent" && (
          <p className="text-sm text-green-400">Check your inbox for the reset link.</p>
        )}
        {status==="error" && <p className="text-sm text-red-400">{err}</p>}
      </form>
    </main>
  );
}
