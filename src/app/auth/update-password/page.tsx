"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"checking"|"ready"|"working"|"ok"|"error">("checking");
  const [err, setErr] = useState("");

  // When you arrive from the email link, Supabase puts you in a "recovery" session.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If there’s no session here, the link is invalid/expired.
      setStatus(session ? "ready" : "error");
      if (!session) setErr("This reset link is invalid or has expired.");
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErr("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr(error.message);
      setStatus("error");
      return;
    }
    setStatus("ok");
    router.replace("/onboarding"); // or /creators
  }

  if (status === "checking") {
    return <main className="mx-auto max-w-md px-4 py-10">Checking link…</main>;
  }

  if (status === "error") {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="text-red-400">{err}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 p-4">
        <label className="text-sm">New password</label>
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          required
        />
        <Button disabled={status==="working"} type="submit" className="w-full">
          {status==="working" ? "Saving…" : "Save password"}
        </Button>
      </form>
    </main>
  );
}
