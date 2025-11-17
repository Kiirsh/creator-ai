import { supabase } from "@/lib/supabase";
import CreatorPurchaseFlow from "@/components/purchase/CreatorPurchaseFlow";
import { isAudioLikeLabel } from "@/lib/rates";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: creatorId } = await params;

  // Creator display (name & avatar)
  const { data: creatorRow } = await supabase
    .from("public_creator_profile")
    .select("id, display_name, avatar_url")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creatorRow) notFound();

  // Video plans (rate cards)
  const { data: rates } = await supabase
    .from("rate_cards")
    .select("id,label,price_cents,currency")
    .eq("creator_id", creatorId)
    .order("price_cents", { ascending: true });

  const videoPlans =
    (rates || [])
      .filter((r) => !isAudioLikeLabel(r.label))
      .map((r) => ({
        rateId: r.id as string,
        label: (r.label as string) || "Custom video",
        price_cents: Number(r.price_cents || 0),
        currency: (r.currency as string | null)?.toLowerCase() || "gbp",
      })) ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <CreatorPurchaseFlow
        creator={{
          id: creatorRow.id,
          name: creatorRow.display_name || "Creator",
          avatarUrl: creatorRow.avatar_url || undefined,
        }}
        videoPlans={videoPlans}
      />
    </main>
  );
}
