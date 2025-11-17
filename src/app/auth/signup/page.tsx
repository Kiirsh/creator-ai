"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle"|"working"|"error"|"ok">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // after sign-up/sign-in, we’ll send them to onboarding
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }

    // If "Confirm email" is OFF, you’re signed in immediately.
    // If it's ON, Supabase sent a confirmation email; we can still send them to signin page.
    setStatus("ok");
    router.replace("/onboarding");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 p-4">
        <label className="text-sm">Email</label>
        <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />

        <label className="text-sm">Password</label>
        <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />

        <Button disabled={status==="working"} type="submit" className="w-full">
          {status==="working" ? "Creating…" : "Create account"}
        </Button>

        {status==="error" && <p className="text-sm text-red-400">{errorMsg}</p>}
      </form>

      <p className="text-sm text-white/70">
        Already have an account?{" "}
        <a href="/auth/signin" className="underline">Sign in</a>
      </p>
    </main>
  );
}
