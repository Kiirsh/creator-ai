"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  creatorId: string;
  rateCardId: string;
  className?: string;
  // NEW: optional add-on flags
  brandUsage?: boolean;
  postTikTok?: boolean;
  children?: React.ReactNode;
};

export default function StartCheckoutButton({
  creatorId,
  rateCardId,
  className,
  brandUsage = false,
  postTikTok = false,
  children,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function go() {
    try {
      setLoading(true);
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId,
          rateCardId,
          brandUsage,
          postTikTok,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start checkout");
      window.location.href = json.url;
    } catch (e: any) {
      alert(e.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={go} disabled={loading} className={className}>
      {loading ? "Redirecting…" : children ?? "Pay with Stripe"}
    </Button>
  );
}
