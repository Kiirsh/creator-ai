import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Body = {
  creatorId?: string;
  script_text?: string;       // full script from the client
  termsAccepted?: boolean;    // same pattern as video
};

export async function POST(req: Request) {
  try {
    const { creatorId, script_text, termsAccepted } = (await req.json()) as Body;

    if (!creatorId || typeof script_text !== "string" || script_text.trim().length === 0) {
      return NextResponse.json({ error: "creatorId and script_text are required" }, { status: 400 });
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: "Please accept the purchase terms" }, { status: 400 });
    }

    // Authoritative creator pricing + destination
    const { data: creator, error: cErr } = await supabaseAdmin
      .from("creators")
      .select("id, stripe_account_id, platform_fee_bps, audio_price_per_char_cents")
      .eq("id", creatorId)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    if (!creator.stripe_account_id) {
      return NextResponse.json({ error: "Creator not onboarded to Stripe Connect" }, { status: 400 });
    }

    const perCharCents = Math.max(0, Number(creator.audio_price_per_char_cents) || 0);
    if (perCharCents === 0) {
      return NextResponse.json({ error: "Creator has not set an audio price" }, { status: 400 });
    }

    const cleanScript = script_text.normalize("NFC");
    const charCount = cleanScript.length;
    const baseCents = perCharCents * charCount;
    const currency = "gbp";

    // Platform fee on total (default 25%)
    const feeBps = typeof creator.platform_fee_bps === "number" ? creator.platform_fee_bps : 2500;
    const appFee = Math.min(baseCents, Math.floor((baseCents * feeBps) / 10000));
    const net = baseCents - appFee;

    // Create order row
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        creator_id: creatorId,
        rate_id: null,                 // audio has no rate card
        amount_cents: baseCents,
        currency,
        status: "created",
        fee_cents: appFee,
        net_cents: net,
        platform_fee_bps: feeBps,
      })
      .select("id")
      .maybeSingle();

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Build success/cancel URLs
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (req.headers.get("origin") ?? "http://localhost:3000");

    const successUrl = `${origin}/checkout/success?order=${orderRow.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/checkout/cancel?order=${orderRow.id}`;

    // Build line item
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency,
          unit_amount: baseCents,
          product_data: {
            name: "AI voice-over",
            description: `Text-to-speech (${charCount} characters)`,
          },
        },
        quantity: 1,
      },
    ];

    // Create Checkout Session (Connect split)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: appFee,
        transfer_data: { destination: creator.stripe_account_id },
      },
      // Keep script OUT of Stripe metadata (too long / privacy). Store length only.
      metadata: {
        order_id: orderRow.id,
        creator_id: creatorId,
        kind: "audio",
        char_count: String(charCount),
        terms_accepted: String(Boolean(termsAccepted)),
      },
      customer_creation: "always",
    });

    // Save session id
    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderRow.id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[audio/checkout] error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
