// src/components/payments/PurchaseOptions.tsx
"use client";

import { useMemo, useState } from "react";

type Props = {
  creatorId: string;
  rateId: string;
  baseCents: number;
  currency: string; // e.g. "gbp"
  brandUsageCents?: number; // from DB
  postTikTokCents?: number; // from DB
};

function fmtMoney(cents: number, currency: string) {
  const curr = (currency || "gbp").toUpperCase();
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: curr,
  }).format((Number(cents) || 0) / 100);
}

export default function PurchaseOptions({
  creatorId,
  rateId,
  baseCents,
  currency,
  brandUsageCents = 0,
  postTikTokCents = 0,
}: Props) {
  const [wantUsage, setWantUsage] = useState(false);
  const [wantCreatorPost, setWantCreatorPost] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = useMemo(() => {
    let sum = Number(baseCents) || 0;
    if (wantUsage) sum += Number(brandUsageCents) || 0;
    if (wantCreatorPost) sum += Number(postTikTokCents) || 0;
    return sum;
  }, [baseCents, wantUsage, brandUsageCents, wantCreatorPost, postTikTokCents]);

  async function checkout() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId,
          rateId,
          termsAccepted, // server enforces this
          addons: {
            usage_cents: wantUsage ? brandUsageCents : 0,
            creator_post_cents: wantCreatorPost ? postTikTokCents : 0,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Checkout failed");
      if (!json?.url) throw new Error("No checkout URL returned");
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  const usageDisabled = !brandUsageCents;
  const postDisabled = !postTikTokCents;

  return (
    <div className="space-y-4">
      {/* Add-ons */}
      <div className="space-y-2">
        <label className={`flex items-start gap-3 ${usageDisabled ? "opacity-60" : ""}`}>
          <input
            type="checkbox"
            className="mt-1"
            aria-label="Add brand usage license"
            checked={wantUsage}
            onChange={(e) => setWantUsage(e.target.checked)}
            disabled={usageDisabled}
          />
          <div>
            <div className="font-medium">
              Brand usage license{" "}
              <span className="text-white/60">
                ({brandUsageCents ? fmtMoney(brandUsageCents, currency) : "N/A"})
              </span>
            </div>
            <p className="text-sm text-white/70">
              Permission to share the video organically on your social channels.
            </p>
          </div>
        </label>

        <label className={`flex items-start gap-3 ${postDisabled ? "opacity-60" : ""}`}>
          <input
            type="checkbox"
            className="mt-1"
            aria-label="Add creator TikTok post"
            checked={wantCreatorPost}
            onChange={(e) => setWantCreatorPost(e.target.checked)}
            disabled={postDisabled}
          />
          <div>
            <div className="font-medium">
              Creator TikTok post{" "}
              <span className="text-white/60">
                ({postTikTokCents ? fmtMoney(postTikTokCents, currency) : "N/A"})
              </span>
            </div>
            <p className="text-sm text-white/70">
              The creator will post the video on their TikTok account.
            </p>
          </div>
        </label>
      </div>

      {/* Terms */}
      <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5"
            aria-label="Accept purchase terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span className="text-white/80">
            I agree to the{" "}
            <a href="/terms/purchase" className="underline" target="_blank" rel="noreferrer">
              purchase terms
            </a>
            , including the add-on rules above.
          </span>
        </label>
      </div>

      {/* Total + Pay */}
      <div className="flex items-center justify-between">
        <div className="text-white/70 text-sm">Total</div>
        <div className="text-lg font-semibold">{fmtMoney(total, currency)}</div>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <button
        type="button"
        onClick={checkout}
        disabled={!termsAccepted || loading}
        className={`w-full rounded-full px-4 py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
          !termsAccepted || loading
            ? "bg-white/20 text-white/50 cursor-not-allowed"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        {loading ? "Opening Checkout…" : "Pay with Stripe"}
      </button>
    </div>
  );
}
