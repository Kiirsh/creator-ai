"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/** Shows a small banner when the viewer is the owner of this creator profile */
export default function OwnerBanner({ creatorId }: { creatorId: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(!!user && user.id === creatorId);
    })();
  }, [creatorId]);

  if (!isOwner) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900 p-3 text-sm">
      You’re viewing your profile. Go to your{" "}
      <Link href="/dashboard/inbox" className="underline">Inbox</Link>.
    </div>
  );
}
