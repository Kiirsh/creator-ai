import { supabase } from "@/lib/supabase";
import { money } from "@/lib/currency";
import { notFound } from "next/navigation";
import PurchaseOptions from "@/components/payments/PurchaseOptions";

export const revalidate = 60;

export default async function PurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const { id: creatorId } = await params;
  const sp = await searchParams;
  const rateId = typeof sp.rate === "string" ? sp.rate : null;

  // Creator (public)
  const { data: creator } = await supabase
    .from("public_creator_profile")
    .select("id,display_name,avatar_url,headline")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator) notFound();

  // Rate must be supplied
  const { data: rate } = await supabase
    .from("rate_cards")
    .select("id,label,price_cents,currency,creator_id")
    .eq("id", rateId)
    .maybeSingle();

  if (!rate) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 text-white space-y-3">
          <div className="text-lg font-semibold">{creator.display_name}</div>
          <div className="text-white/70">Pick a specific rate from the profile first.</div>
        </div>
      </main>
    );
  }

  // Add-on prices from creators
  const { data: creatorRow } = await supabase
    .from("creators")
    .select("brand_usage_cents, post_tiktok_cents")
    .eq("id", creatorId)
    .maybeSingle();

  const brandUsageCents = creatorRow?.brand_usage_cents ?? 0;
  const postTikTokCents = creatorRow?.post_tiktok_cents ?? 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 text-white space-y-4">
        <div className="text-lg font-semibold">{creator.display_name}</div>
        <div className="text-white/80">
          <div className="font-medium">{rate.label}</div>
          <div className="text-white/60">{money(rate.price_cents || 0)}</div>
        </div>

        {/* Add-on selector + terms + Pay button */}
        <PurchaseOptions
          creatorId={creatorId}
          rateId={rate.id}
          baseCents={rate.price_cents || 0}
          currency={(rate.currency || "gbp").toLowerCase()}
          brandUsageCents={brandUsageCents || undefined}
          postTikTokCents={postTikTokCents || undefined}
        />
      </div>
    </main>
  );
}
