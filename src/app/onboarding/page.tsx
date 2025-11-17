// src/app/onboarding/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Phase = "loading" | "choose" | "saving" | "done" | "error";

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.replace("/auth/signin");
        return;
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (existing?.role === "creator") {
        router.replace(`/creator/${user.id}`);
        return;
      }
      if (existing?.role === "brand") {
        router.replace(`/creators`);
        return;
      }

      setPhase("choose");
    })();
  }, [router]);

  async function selectRole(role: "creator" | "brand") {
    setPhase("saving");
    setErrorMsg("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/signin");
      return;
    }

    const displayName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      (user.email?.split("@")[0] ?? "User");

    const avatarUrl =
      (user.user_metadata?.avatar_url as string) ||
      (user.user_metadata?.picture as string) ||
      null;

    const { error: pErr } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        role,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" }
    );
    if (pErr) {
      setErrorMsg(pErr.message);
      setPhase("error");
      return;
    }

    if (role === "creator") {
      const { error: cErr } = await supabase.from("creators").upsert(
        {
          id: user.id,
          headline: "Creator",
          base_rate_cents: 0,
          categories: [],
          follower_counts: {},
          socials: {},
          is_verified: false,
        },
        { onConflict: "id" }
      );
      if (cErr) {
        setErrorMsg(cErr.message);
        setPhase("error");
        return;
      }
      router.replace(`/creator/${user.id}`);
      return;
    } else {
      const { error: bErr } = await supabase.from("brands").upsert(
        {
          id: user.id,
          company_name: "",
          website: "",
        },
        { onConflict: "id" }
      );
      if (bErr) {
        setErrorMsg(bErr.message);
        setPhase("error");
        return;
      }
      router.replace("/creators");
      return;
    }
  }

  if (phase === "loading" || phase === "saving") {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-white/80">
            {phase === "loading" ? "Checking your account…" : "Saving your choices…"}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 space-y-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-red-400">{errorMsg}</p>
        <Button onClick={() => setPhase("choose")}>Try again</Button>
      </main>
    );
  }

  // phase === "choose"
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <h1 className="text-3xl font-semibold">Tell us who you are</h1>
      <p className="text-white/70">Choose one — you can add the other later in settings.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 p-6 bg-neutral-900">
          <h2 className="text-xl font-semibold mb-2">I’m a Creator</h2>
          <p className="text-white/70 mb-4">Get booked by brands, set your rates, and message clients.</p>
          <Button className="w-full" onClick={() => selectRole("creator")}>
            Continue as Creator
          </Button>
        </div>

        <div className="rounded-2xl border border-white/10 p-6 bg-neutral-900">
          <h2 className="text-xl font-semibold mb-2">I’m a Brand</h2>
          <p className="text-white/70 mb-4">Browse creators, message them, and book safely with Stripe.</p>
          <Button variant="secondary" className="w-full" onClick={() => selectRole("brand")}>
            Continue as Brand
          </Button>
        </div>
      </div>
    </main>
  );
}
