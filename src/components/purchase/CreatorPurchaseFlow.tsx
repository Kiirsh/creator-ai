// src/components/purchase/CreatorPurchaseFlow.tsx
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Creator = {
  id: string;
  name: string;
  avatarUrl?: string;
};

type VideoPlan = {
  rateId: string;
  label: string;
  price_cents: number;
  currency: string; // lower-case like "gbp"
};

type Props = {
  creator: Creator;
  videoPlans: VideoPlan[];
};

function formatMoney(cents: number, currency: string = "gbp") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100);
}

export default function CreatorPurchaseFlow({
  creator,
  videoPlans,
}: Props) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [selectedRateId, setSelectedRateId] = React.useState<string | null>(
    videoPlans[0]?.rateId ?? null
  );

  // TERMS / UX
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const selectedPlan = React.useMemo(
    () => videoPlans.find((p) => p.rateId === selectedRateId) || null,
    [videoPlans, selectedRateId]
  );

  const canContinueStep2 = !!selectedPlan;

  async function handleCheckout() {
    setErr(null);

    if (!selectedPlan) {
      setErr("Please choose a video rate to continue.");
      return;
    }

    if (!termsAccepted) {
      setErr("Please accept the purchase terms.");
      return;
    }
    try {
      setLoading(true);

      // Video-only checkout (audio temporarily disabled)
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId: creator.id,
          rateId: selectedRateId,
          termsAccepted,
          addons: { usage_cents: 0, creator_post_cents: 0 },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setErr(message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src={creator.avatarUrl || "/demo/creator.jpg"}
          alt=""
          className="h-10 w-10 rounded-full border border-white/10 object-cover"
        />
        <div className="text-lg font-semibold text-white">{creator.name}</div>
      </div>

      <Card className="bg-neutral-900 border-white/10">
        <CardContent className="p-6 space-y-6 text-white">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-white/60">
            <div className={cn("h-1 rounded-full bg-white/20 w-full", step >= 1 && "bg-white/70")} />
            <div className={cn("h-1 rounded-full bg-white/20 w-full", step >= 2 && "bg-white/70")} />
          </div>

          {/* STEP 1 - choose video rate */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl">Step 1: Choose a video rate</CardTitle>
              </CardHeader>

              <div className="space-y-3">
                {videoPlans.length === 0 ? (
                  <p className="text-sm text-white/60">No rates available yet.</p>
                ) : (
                  videoPlans.map((p) => (
                    <button
                      key={p.rateId}
                      className={cn(
                        "w-full rounded-xl border p-4 bg-black/20 text-left transition",
                        "border-white/10 hover:bg-white/5",
                        selectedRateId === p.rateId && "ring-2 ring-white/60"
                      )}
                      onClick={() => setSelectedRateId(p.rateId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{p.label}</div>
                          <p className="text-xs text-white/60 mt-1">Creator fulfills a custom video.</p>
                        </div>
                        <div className="text-right">
                          <div className="text-white/80">
                            {formatMoney(p.price_cents, p.currency)}
                          </div>
                          <div className="text-[11px] text-white/50">includes creator payment</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between mt-6 text-sm text-white/60">
                <span>Secure checkout via Stripe in the next step.</span>
                <Button disabled={!canContinueStep2} onClick={() => setStep(2)}>
                  Continue →
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 - confirm */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl">Step 2: Confirm & Checkout</CardTitle>
              </CardHeader>

              <div className="space-y-2 text-white/80">
                <div className="flex items-center justify-between rounded-lg bg-black/30 border border-white/10 p-3">
                  <div>
                    <p className="text-sm text-white/60">Format</p>
                    <p className="font-semibold">Video</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">Selected rate</p>
                    <p className="font-semibold">{selectedPlan?.label ?? "—"}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-black/40 border border-white/10 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Video rate</span>
                    <span className="font-medium">
                      {selectedPlan ? formatMoney(selectedPlan.price_cents, selectedPlan.currency) : "—"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-white/60">
                    Payment is handled by Stripe; we never see your card details.
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-black/30 border border-white/10 p-3 mt-4">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span className="text-white/80">
                    I agree to the{" "}
                    <a
                      href="/terms/purchase"
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      purchase terms
                    </a>
                    .
                  </span>
                </label>
              </div>

              {err && <p className="text-sm text-red-400 mt-2">{err}</p>}

              <div className="flex justify-between mt-6">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button
                  className="font-semibold"
                  disabled={
                    loading ||
                    !termsAccepted ||
                    !selectedPlan
                  }
                  onClick={handleCheckout}
                >
                  {loading ? "Opening checkout…" : "Proceed to Checkout →"}
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className="text-gray-400 text-xs mt-6">
        ❌ No adult • ❌ No mean stuff • ❌ No politics
      </div>
    </div>
  );
}
