// src/components/payments/ConnectStripeButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  creatorId: string;
  email?: string | null;
  className?: string;
};

export default function ConnectStripeButton({ creatorId, email, className }: Props) {
  const [loading, setLoading] = useState(false);

  async function start() {
    if (loading) return;
    setLoading(true);
    try {
      if (!creatorId) {
        throw new Error("Missing creatorId");
      }

      const res = await fetch("/api/stripe/create-onboarding-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          creatorId,
          returnUrl: `${window.location.origin}/dashboard/profile` 
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Failed to start Stripe onboarding");
      }

      // Redirect to Stripe onboarding
      window.location.href = json.url as string;
    } catch (err: any) {
      toast.error("Stripe onboarding failed", {
        description: err?.message || String(err),
      });
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={start}
      disabled={loading}
      aria-busy={loading}
      aria-disabled={loading}
      className={className}
    >
      {loading ? "Opening Stripe…" : "Connect Stripe to get paid"}
    </Button>
  );
}
