"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/**
 * Creates (or reuses) a conversation between the current user and the creator.
 * If the user is not signed in, sends them to /auth/signin.
 */
export default function StartConversationButton({
  creatorId,
  className,
  children,
}: {
  creatorId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    // 1) Must be logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    // 2) Determine if the user is a brand or a creator (brand users will DM creators)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.role) {
      router.push("/onboarding");
      return;
    }

    // If the viewer is a creator, they can also message brands later; for now we assume
    // creators message creators is not supported. So require brand here:
    if (profile.role !== "brand") {
      // You can relax this later to allow creators to message brands.
      // For now, send creators to creators directory or show onboarding.
      router.push("/creators");
      return;
    }

    // 3) Try to create a conversation; if it already exists (unique constraint), fetch it
    let convId: string | null = null;

    const insertRes = await supabase
      .from("conversations")
      .insert({ brand_id: user.id, creator_id: creatorId })
      .select("id")
      .maybeSingle();

    if (insertRes.data?.id) {
      convId = insertRes.data.id;
    } else {
      // If insert failed (likely duplicate), fetch existing
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", user.id)
        .eq("creator_id", creatorId)
        .maybeSingle();

      convId = existing?.id ?? null;
    }

    setLoading(false);

    if (convId) {
      router.push(`/dashboard/inbox/${convId}`);
    } else {
      // Fallback: go to inbox list
      router.push("/dashboard/inbox");
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Opening…" : children ?? "Message"}
    </Button>
  );
}
