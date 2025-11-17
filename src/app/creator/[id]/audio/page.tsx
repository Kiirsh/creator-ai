// src/app/creator/[id]/audio/page.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CreatorBits = {
  display_name: string;
  avatar_url: string | null;
};

export default function AudioPurchasePage({
  params,
}: {
  params: { id: string };
}) {
  const creatorId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [creator, setCreator] = React.useState<CreatorBits | null>(null);
  const [rateCents, setRateCents] = React.useState<number | null>(null);

  const [script, setScript] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Prefill from ?script=... if present
  React.useEffect(() => {
    const s = searchParams.get("script");
    if (s) setScript(s);
  }, [searchParams]);

  // Fetch display name (public view) + per-character rate from creators
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [{ data: viewRow, error: vErr }, { data: creatorRow, error: cErr }] =
          await Promise.all([
            supabase
              .from("public_creator_profile")
              .select("display_name, avatar_url")
              .eq("id", creatorId)
              .maybeSingle(),
            supabase
              .from("creators")
              .select("audio_char_rate_cents")
              .eq("id", creatorId)
              .maybeSingle(),
          ]);

        if (vErr) throw vErr;
        if (!viewRow) throw new Error("Creator not found");
        if (cErr) throw cErr;

        if (!cancelled) {
          setCreator({
            display_name: viewRow.display_name,
            avatar_url: viewRow.avatar_url ?? null,
          });
          setRateCents(
            typeof creatorRow?.audio_char_rate_cents === "number"
              ? creatorRow.audio_char_rate_cents
              : null
          );
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load creator");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  const charCount = [...script].length; // count Unicode code points
  const totalCents =
    rateCents != null && charCount > 0 ? rateCents * charCount : 0;

  function fmtMoney(cents: number | null | undefined, currency = "GBP") {
    const n = typeof cents === "number" ? cents : 0;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(n / 100);
  }

  async function submitAudioOrder() {
    setErr(null);

    if (!rateCents) {
      setErr("Audio pricing not set by this creator yet.");
      return;
    }
    if (!termsAccepted) {
      setErr("Please accept the purchase terms.");
      return;
    }
    if (charCount === 0) {
      setErr("Please paste a script.");
      return;
    }

    setSubmitting(true);
    try {
      // Server re-prices and computes char count; client_amount_cents is only a hint.
      const res = await fetch("/api/audio/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId,
          script_text: script,
          client_amount_cents: totalCents,
          termsAccepted: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Checkout failed");

      if (json?.url) {
        window.location.href = json.url; // Stripe Checkout
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold">AI Audio</h1>
        <p className="text-white/70 mt-2">Loading…</p>
      </main>
    );
  }

  if (err && !creator) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 space-y-3">
        <h1 className="text-2xl font-semibold">AI Audio</h1>
        <p className="text-red-400">{err}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        {creator?.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full border border-white/10 object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold">AI Audio</h1>
          <p className="text-white/70 text-sm">{creator?.display_name}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-neutral-900 p-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Script</label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste your script here…"
            className="mt-1 w-full min-h-[180px] rounded-xl bg-black/30 border border-white/10 p-3 outline-none focus:ring-1 focus:ring-white/30 text-white placeholder:text-white/40"
          />
          <div className="mt-1 text-xs text-white/60">
            {charCount.toLocaleString()} characters
            {typeof rateCents === "number" && (
              <>
                {" "}
                ×{" "}
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: "GBP",
                  maximumFractionDigits: 4,
                }).format(rateCents / 100)}{" "}
                per char
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-white/70 text-sm">Estimated total</div>
          <div className="text-lg font-semibold">
            {fmtMoney(totalCents, "GBP")}
          </div>
        </div>

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
              <a
                href="/terms/purchase"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                purchase terms
              </a>{" "}
              for AI audio, including usage of a licensed cloned voice and
              delivery in MP3 format.
            </span>
          </label>
        </div>

        {err ? <p className="text-sm text-red-400">{err}</p> : null}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border px-4 py-2 text-white/80 hover:bg-white/5"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submitAudioOrder}
            disabled={!termsAccepted || submitting || !rateCents || charCount === 0}
            className={`rounded-full px-4 py-2 font-medium ${
              !termsAccepted || submitting || !rateCents || charCount === 0
                ? "bg-white/20 text-white/50 cursor-not-allowed"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            {submitting ? "Opening Checkout…" : "Pay with Stripe"}
          </button>
        </div>
      </section>
    </main>
  );
}
