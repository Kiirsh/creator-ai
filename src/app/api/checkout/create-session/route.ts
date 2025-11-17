// src/app/api/checkout/create-session/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type Stripe from "stripe";

export const runtime = "nodejs";

type Body = {
  creatorId?: string;
  rateId?: string;
  addons?: {
    usage_cents?: number;          // client hint; treated as flag only
    creator_post_cents?: number;   // client hint; treated as flag only
  };
  termsAccepted?: boolean;
};

export async function POST(req: Request) {
  try {
    const { creatorId, rateId, addons, termsAccepted } = (await req.json()) as Body;

    if (!creatorId || !rateId) {
      return NextResponse.json({ error: "creatorId and rateId are required" }, { status: 400 });
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: "Please accept the purchase terms" }, { status: 400 });
    }

    // 1) Rate must belong to the creator
    const { data: rate, error: rateErr } = await supabaseAdmin
      .from("rate_cards")
      .select("id,label,price_cents,currency,creator_id")
      .eq("id", rateId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (rateErr) return NextResponse.json({ error: rateErr.message }, { status: 500 });
    if (!rate) {
      return NextResponse.json({ error: "Rate not found for this creator" }, { status: 404 });
    }

    // 2) Creator must be onboarded + authoritative add-on prices
    const { data: creator, error: creatorErr } = await supabaseAdmin
      .from("creators")
      .select("id, stripe_account_id, platform_fee_bps, brand_usage_cents, post_tiktok_cents")
      .eq("id", creatorId)
      .maybeSingle();

    if (creatorErr) return NextResponse.json({ error: creatorErr.message }, { status: 500 });
    if (!creator?.stripe_account_id) {
      return NextResponse.json({ error: "Creator not onboarded to Stripe Connect" }, { status: 400 });
    }

    const currency = String(rate.currency || "gbp").toLowerCase();
    const baseCents = Math.max(0, Number(rate.price_cents) || 0);

    // Client values act only as flags; we price from DB
    const wantUsage = (addons?.usage_cents ?? 0) > 0;
    const wantCreatorPost = (addons?.creator_post_cents ?? 0) > 0;

    const usageCents = wantUsage ? Math.max(0, Number(creator.brand_usage_cents) || 0) : 0;
    const postCents = wantCreatorPost ? Math.max(0, Number(creator.post_tiktok_cents) || 0) : 0;

    const totalCents = baseCents + usageCents + postCents;

    // Platform fee (default 25%) applied on the final total
    const feeBps =
      typeof creator.platform_fee_bps === "number" ? creator.platform_fee_bps : 2500;
    const appFee = Math.min(totalCents, Math.floor((totalCents * feeBps) / 10000));
    const net = totalCents - appFee;

    // 3) Create an order row (status: created)
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        creator_id: creatorId,
        rate_id: rate.id,
        amount_cents: totalCents,
        currency,
        status: "created",
        fee_cents: appFee,
        net_cents: net,
        platform_fee_bps: feeBps,
        // If you added an addons_json column, you could snapshot here:
        // addons_json: { brand_usage: wantUsage, post_tiktok: wantCreatorPost }
      })
      .select("id")
      .maybeSingle();

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 4) Success/cancel URLs
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || (req.headers.get("origin") ?? "http://localhost:3000");

    const successUrl = `${origin}/checkout/success?order=${orderRow.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/checkout/cancel?order=${orderRow.id}`;

    // 5) Clear line items for Stripe receipt
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency,
          unit_amount: baseCents,
          product_data: {
            name: rate.label || "Custom video",
            description: "Creator video booking",
          },
        },
        quantity: 1,
      },
    ];

    if (usageCents > 0) {
      lineItems.push({
        price_data: {
          currency,
          unit_amount: usageCents,
          product_data: {
            name: "Brand usage license",
            description: "Permission to share on your social channels",
          },
        },
        quantity: 1,
      });
    }

    if (postCents > 0) {
      lineItems.push({
        price_data: {
          currency,
          unit_amount: postCents,
          product_data: {
            name: "Creator TikTok post",
            description: "Creator will post this video on TikTok",
          },
        },
        quantity: 1,
      });
    }

    // 6) Create Checkout Session with Connect split
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: appFee,
        transfer_data: { destination: creator.stripe_account_id },
      },
      metadata: {
        order_id: orderRow.id,
        creator_id: creatorId,
        rate_id: rate.id,
        add_usage_cents: String(usageCents),
        add_creator_post_cents: String(postCents),
        terms_accepted: String(Boolean(termsAccepted)),
      },
      customer_creation: "always",
    });

    // 7) Save the session id on the order
    await supabaseAdmin.from("orders").update({ stripe_session_id: session.id }).eq("id", orderRow.id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("create-session error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
