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
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <section className="page-hero">
        <div className="page-hero-content">
          <div className="space-y-3">
            <span className="surface-kicker">Video checkout</span>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">Book a video with {creatorRow.display_name}</h1>
              <p className="text-base text-muted-foreground">
                Choose the right video rate and complete a secure Stripe checkout. Audio options stay disabled so we can focus on the best video experience.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="pill bg-secondary text-secondary-foreground">Video only</span>
              <span className="pill">Stripe protected</span>
            </div>
          </div>
          <div className="section-shell p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <img
                src={creatorRow.avatar_url || "/demo/creator.jpg"}
                alt=""
                className="h-12 w-12 rounded-full border object-cover"
              />
              <div>
                <div className="text-lg font-semibold text-slate-900">{creatorRow.display_name}</div>
                <p className="text-sm text-muted-foreground">Custom videos delivered fast</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Select a rate to see your checkout summary. We never store payment details.
            </div>
          </div>
        </div>
      </section>

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
