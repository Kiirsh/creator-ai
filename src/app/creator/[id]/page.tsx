// src/app/creator/[id]/page.tsx
import React from "react";
import { supabase } from "@/lib/supabase";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StickyCTA } from "@/components/profile/StickyCTA";
import { money } from "@/lib/currency";
import Link from "next/link";
import { notFound } from "next/navigation";
import StartConversationButton from "@/components/chat/StartConversationButton";
import OwnerBanner from "@/components/profile/OwnerBanner";
import { Instagram, Youtube, Music2, Sparkles } from "lucide-react";
import BuyRateButton from "@/components/checkout/BuyRateButton";

export const revalidate = 60;
export const dynamic = "force-dynamic";

function looksLikeUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = (await params).id;
  const key = decodeURIComponent(raw || "");

  // 1) Load profile (by id if uuid-looking, else by slug)
  let profileRow: any = null;
  if (looksLikeUuid(key)) {
    const { data, error } = await supabase
      .from("public_creator_profile")
      .select("*")
      .eq("id", key)
      .maybeSingle();
    if (error) console.error("[creator page] view by id error:", error.message);
    profileRow = data ?? null;
  } else {
    const { data, error } = await supabase
      .from("public_creator_profile")
      .select("*")
      .eq("slug", key)
      .maybeSingle();
    if (error) console.error("[creator page] view by slug error:", error.message);
    profileRow = data ?? null;
  }

  if (!profileRow) {
    console.error("[creator page] not found for key:", key);
    notFound();
  }

  const creator = profileRow as {
    id: string;
    slug: string | null;
    display_name: string;
    avatar_url: string | null;
    headline: string | null;
    base_rate_cents: number | null;
    is_verified: boolean | null;

    instagram_handle: string | null;
    instagram_followers: number | null;
    youtube_handle: string | null;
    youtube_followers: number | null;
    tiktok_handle: string | null;
    tiktok_followers: number | null;
    sora2_handle: string | null;
    sora2_followers: number | null;
  };

  // 2) Rates
  const { data: rates } = await supabase
    .from("rate_cards")
    .select("id,label,price_cents,currency")
    .eq("creator_id", creator.id)
    .order("price_cents", { ascending: true });

  const rateCards:
    | {
        id: string;
        label: string;
        price_cents: number;
        currency: string | null;
      }[] = (rates as any) || [];

  // 3) No-nos
  const { data: nn } = await supabase
    .from("creator_no_nos")
    .select("tag")
    .eq("creator_id", creator.id)
    .order("tag");
  const noNos = ((nn as any) || []).map((r: any) => r.tag as string);

  const formatFollowers = (n?: number | null) =>
    typeof n === "number" ? new Intl.NumberFormat().format(n) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <OwnerBanner creatorId={creator.id} />

      <ProfileHeader
        name={creator.display_name}
        subtitle={creator.headline || "Creator"}
        avatarUrl={creator.avatar_url || "/demo/creator.jpg"}
        verified={!!creator.is_verified}
      />

      {/* Price card */}
      <div className="rounded-3xl bg-neutral-900 text-white p-5 md:p-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/90">
          <div>
            <div className="text-xs uppercase text-white/50">From</div>
            <div className="text-lg font-semibold">
              {money(creator.base_rate_cents || 0)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-white/50">Reviews</div>
            <div className="text-lg font-semibold">
              <Link href="#reviews">⭐ 5.00 (170)</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Choose your format */}
      <section className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="text-lg font-semibold mb-3">Choose your format</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Video card */}
          <div className="rounded-xl border border-white/10 p-4 bg-black/20">
            <div className="font-semibold">Video</div>
            <p className="text-sm text-white/70 mt-1">
              Book a custom video from this creator. Extras (brand usage, TikTok post) are picked on the next screen.
            </p>
            <div className="mt-3 flex justify-end">
              <Link
                href={`/creator/${creator.id}/purchase`}
                className="rounded-full border px-4 py-2 transition hover:bg-white hover:text-black"
              >
                Choose Video
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Socials */}
      <section className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="text-lg font-semibold mb-3">Socials</h2>
        <ul className="space-y-3 text-white/90">
          {creator.instagram_handle ? (
            <li className="flex items-center gap-3">
              <Instagram className="h-5 w-5 text-white/80" />
              <div>
                <span className="text-white/60 text-sm">Instagram</span>
                <div className="font-medium">{creator.instagram_handle}</div>
                {creator.instagram_followers != null && (
                  <div className="text-white/60 text-sm">
                    {formatFollowers(creator.instagram_followers)} followers
                  </div>
                )}
              </div>
            </li>
          ) : null}

          {creator.youtube_handle ? (
            <li className="flex items-center gap-3">
              <Youtube className="h-5 w-5 text-white/80" />
              <div>
                <span className="text-white/60 text-sm">YouTube</span>
                <div className="font-medium">{creator.youtube_handle}</div>
                {creator.youtube_followers != null && (
                  <div className="text-white/60 text-sm">
                    {formatFollowers(creator.youtube_followers)} subscribers
                  </div>
                )}
              </div>
            </li>
          ) : null}

          {creator.tiktok_handle ? (
            <li className="flex items-center gap-3">
              <Music2 className="h-5 w-5 text-white/80" />
              <div>
                <span className="text-white/60 text-sm">TikTok</span>
                <div className="font-medium">{creator.tiktok_handle}</div>
                {creator.tiktok_followers != null && (
                  <div className="text-white/60 text-sm">
                    {formatFollowers(creator.tiktok_followers)} followers
                  </div>
                )}
              </div>
            </li>
          ) : null}

          {creator.sora2_handle ? (
            <li className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-white/80" />
              <div>
                <span className="text-white/60 text-sm">Sora 2</span>
                <div className="font-medium">{creator.sora2_handle}</div>
                {creator.sora2_followers != null && (
                  <div className="text-white/60 text-sm">
                    {formatFollowers(creator.sora2_followers)} followers
                  </div>
                )}
              </div>
            </li>
          ) : null}
        </ul>

        {!creator.instagram_handle &&
          !creator.youtube_handle &&
          !creator.tiktok_handle &&
          !creator.sora2_handle && (
            <p className="text-sm text-white/60">No socials added yet.</p>
          )}
      </section>

      {/* Rates — one Buy button per rate */}
      <section id="rates" className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="text-lg font-semibold mb-1">Rates</h2>
        <p className="mb-3 text-xs text-white/60">
          Extras are selected at checkout: <span className="text-white/70">Brand usage license</span> and{" "}
          <span className="text-white/70">Creator TikTok post</span>.
        </p>

        {rateCards.length === 0 ? (
          <p className="text-white/70 text-sm">No rates available yet.</p>
        ) : (
          <ul className="space-y-2">
            {rateCards.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">{r.label}</div>
                  <div className="text-white/70 text-sm">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: r.currency || "GBP",
                    }).format(r.price_cents / 100)}
                  </div>
                </div>

                <BuyRateButton
                  creatorId={creator.id}
                  rateId={r.id}
                  className="rounded-full border px-4 py-2 transition hover:bg-white hover:text-black"
                >
                  Buy this
                </BuyRateButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* My no-nos */}
      <section className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="text-lg font-semibold mb-3">My no-nos</h2>
        {noNos.length === 0 ? (
          <p className="text-white/70 text-sm">None listed.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {noNos.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1.5 text-sm border bg-neutral-900 text-white/80 border-white/15"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Desktop CTAs — Message only */}
      <div className="hidden md:flex gap-3 sticky bottom-4 justify-end">
        <StartConversationButton
          creatorId={creator.id}
          className="rounded-full border border-white/20 px-5 py-3 text-white transition-colors duration-200 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Message this creator"
        >
          Message
        </StartConversationButton>
      </div>

      {/* Mobile sticky CTA */}
      <StickyCTA creatorId={creator.id} />
    </main>
  );
}
