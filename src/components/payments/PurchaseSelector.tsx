"use client";

import { useMemo, useState } from "react";

type Rate = { id: string; label: string; price_cents: number; currency: string | null };

type Props = {
  creatorId: string;
  rates: Rate[];
  currency: string;          // e.g. "gbp"
  aiAudioCents?: number;     // from DB (creators.ai_audio_cents)
  initialRateId?: string | null; // from query (?rate=...)
  defaultAudioOn?: boolean;  // from query (?audio=1)
};

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100);
}

export default function PurchaseSelector({
  creatorId,
  rates,
  currency,
  aiAudioCents = 0,
  initialRateId = null,
  defaultAudioOn = false,
}: Props) {
  const [includeVideo, setIncludeVideo] = useState<boolean>(!!initialRateId || rates.length > 0);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(
    initialRateId ?? (rates[0]?.id ?? null)
  );
  const [includeAudio, setIncludeAudio] = useState<boolean>(!!defaultAudioOn);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedRate = useMemo(
    () => rates.find((r) => r.id === selectedRateId) || null,
    [rates, selectedRateId]
  );

  const videoCents = includeVideo && selectedRate ? selectedRate.price_cents || 0 : 0;
  const audioCents = includeAudio ? Math.max(0, aiAudioCents || 0) : 0;

  const total = videoCents + audioCents;

  async function checkout() {
    setErr(null);
    setLoading(true);
    try {
      if (!includeVideo && !includeAudio) {
        throw new Error("Please choose Video, AI Audio, or both.");
      }
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId,
          termsAccepted,
          products: {
            video_rate_id: includeVideo ? selectedRateId : null,
            ai_audio: includeAudio ? true : false,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Checkout failed");

      if (json?.url) {
        window.location.href = json.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Video */}
      <div className="rounded-xl bg-black/30 border border-white/10 p-3">
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">Video</span>
          <input
            type="checkbox"
            checked={includeVideo}
            onChange={(e) => setIncludeVideo(e.target.checked)}
          />
        </label>

        <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 ${!includeVideo ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <label className="text-sm">Choose rate</label>
            <select
              className="mt-1 w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2"
              value={selectedRateId ?? ""}
              onChange={(e) => setSelectedRateId(e.target.value || null)}
            >
              {rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {fmt(r.price_cents, currency)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:text-right">
            <div className="text-xs uppercase text-white/50">Price</div>
            <div className="text-base font-semibold">
              {fmt(videoCents, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* AI Audio */}
      <div className="rounded-xl bg-black/30 border border-white/10 p-3">
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">AI Audio</span>
          <input
            type="checkbox"
            checked={includeAudio}
            onChange={(e) => setIncludeAudio(e.target.checked)}
            disabled={!aiAudioCents}
          />
        </label>

        <div className={`mt-3 flex items-center justify-between ${!aiAudioCents ? "opacity-50" : ""}`}>
          <p className="text-sm text-white/70">
            Get a voice-over in the creator’s cloned voice. You’ll upload a script after payment.
          </p>
          <div className="text-base font-semibold">
            {aiAudioCents ? fmt(aiAudioCents, currency) : "N/A"}
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span className="text-white/80">
            I agree to the{" "}
            <a href="/terms/purchase" className="underline" target="_blank" rel="noreferrer">
              purchase terms
            </a>
            .
          </span>
        </label>
      </div>

      {/* Total + Pay */}
      <div className="flex items-center justify-between">
        <div className="text-white/70 text-sm">Total</div>
        <div className="text-lg font-semibold">{fmt(total, currency)}</div>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <button
        type="button"
        onClick={checkout}
        disabled={!termsAccepted || loading}
        className={`w-full rounded-full px-4 py-2 font-medium ${
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
