"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  creatorId: string;
  rateId: string;
  baseAmountCents: number;
  currency: string; // e.g. 'gbp'
};

const DEFAULT_ADDONS = {
  usage_cents: 5000,        // £50 — Brand usage license
  creator_post_cents: 10000 // £100 — Creator posts the video
};

export default function PurchaseExtrasButton({
  creatorId,
  rateId,
  baseAmountCents,
  currency,
}: Props) {
  const [usage, setUsage] = useState(false);
  const [creatorPost, setCreatorPost] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addons = useMemo(() => {
    return {
      usage_cents: usage ? DEFAULT_ADDONS.usage_cents : 0,
      creator_post_cents: creatorPost ? DEFAULT_ADDONS.creator_post_cents : 0,
    };
  }, [usage, creatorPost]);

  const totalCents = baseAmountCents + addons.usage_cents + addons.creator_post_cents;

  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);

  const start = async () => {
    setErr(null);
    if (!accepted) {
      setErr("Please confirm you agree to the purchase terms.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId,
          rateId,
          addons,
          termsAccepted: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to start checkout");
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Add-ons */}
      <div className="space-y-2">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={usage}
            onChange={(e) => setUsage(e.target.checked)}
          />
          <span>
            <span className="font-medium">Brand usage license</span>{" "}
            <span className="text-white/70">(share on your social channels)</span>{" "}
            <span className="text-white/80">· {fmt(DEFAULT_ADDONS.usage_cents)}</span>
          </span>
        </label>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={creatorPost}
            onChange={(e) => setCreatorPost(e.target.checked)}
          />
          <span>
            <span className="font-medium">Creator TikTok post</span>{" "}
            <span className="text-white/70">(creator posts this video)</span>{" "}
            <span className="text-white/80">· {fmt(DEFAULT_ADDONS.creator_post_cents)}</span>
          </span>
        </label>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          className="mt-1"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <a href="/terms/checkout" className="underline" target="_blank" rel="noreferrer">
            purchase terms
          </a>{" "}
          including usage rights for any selected add-ons.
        </span>
      </label>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm border-t border-white/10 pt-2">
        <span className="text-white/70">Total</span>
        <span className="font-semibold">{fmt(totalCents)}</span>
      </div>

      {/* CTA */}
      <Button
        onClick={start}
        disabled={loading || !accepted}
        className="w-full rounded-full"
      >
        {loading ? "Redirecting…" : "Pay with Stripe"}
      </Button>

      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
