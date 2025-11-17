// src/app/api/audio/create-session/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type Stripe from "stripe";

export const runtime = "nodejs";

type Body = {
  creatorId?: string;
  script_text?: string;
  // client hint (optional; server re-prices)
  client_amount_cents?: number;
  termsAccepted?: boolean;
};

export async function POST(req: Request) {
  try {
    const { creatorId, script_text, client_amount_cents, termsAccepted } =
      (await req.json()) as Body;

    // Basic validation
    if (!creatorId) {
      return NextResponse.json({ error: "creatorId is required" }, { status: 400 });
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: "Please accept the purchase terms" }, { status: 400 });
    }
    const script = (script_text ?? "").trim();
    if (!script) {
      return NextResponse.json({ error: "script_text is required" }, { status: 400 });
    }

    // Compute character count (unicode-safe)
    const chars = [...script].length;
    if (chars <= 0) {
      return NextResponse.json({ error: "Script is empty" }, { status: 400 });
    }
    const MAX_CHARS = 20000;
    if (chars > MAX_CHARS) {
      return NextResponse.json(
        { error: `Script too long (max ${MAX_CHARS} characters)` },
        { status: 400 }
      );
    }

    // 1) Get authoritative pricing + connect details
    const { data: creator, error: cErr } = await supabaseAdmin
      .from("creators")
      .select("id, stripe_account_id, platform_fee_bps, audio_char_rate_cents")
      .eq("id", creatorId)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    if (!creator.stripe_account_id) {
      return NextResponse.json(
        { error: "Creator not onboarded to Stripe Connect" },
        { status: 400 }
      );
    }

    const unitCents = Math.max(0, Number(creator.audio_char_rate_cents || 0));
    if (unitCents === 0) {
      return NextResponse.json(
        { error: "This creator has not set an AI audio rate yet" },
        { status: 400 }
      );
    }

    const currency = "gbp";
    const totalCents = unitCents * chars;

    // 2) Platform fee
    const feeBps =
      typeof creator.platform_fee_bps === "number" ? creator.platform_fee_bps : 2500; // default 25%
    const applicationFee = Math.min(totalCents, Math.floor((totalCents * feeBps) / 10000));
    const net = totalCents - applicationFee;

    // 3) Create order (rate_id is null for audio)
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        creator_id: creatorId,
        rate_id: null,
        amount_cents: totalCents,
        currency,
        status: "created",
        fee_cents: applicationFee,
        net_cents: net,
        platform_fee_bps: feeBps,
        kind: "audio", // optional column but recommended
      })
      .select("id")
      .maybeSingle();

    if (orderErr || !orderRow) {
      return NextResponse.json(
        { error: orderErr?.message || "Failed to create order" },
        { status: 500 }
      );
    }

    // 4) Best-effort: store script server-side (optional table)
    try {
      await supabaseAdmin.from("audio_scripts").insert({
        order_id: orderRow.id,
        creator_id: creatorId,
        char_count: chars,
        script_text: script,
      });
    } catch (e) {
      // Non-fatal; script is still included in Stripe metadata below
      console.warn("[audio_scripts] insert warning:", (e as any)?.message);
    }

    // 5) Success/cancel URLs
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || (req.headers.get("origin") ?? "http://localhost:3000");
    const successUrl = `${origin}/checkout/success?order=${orderRow.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/checkout/cancel?order=${orderRow.id}`;

    // 6) Line item (single item = total)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency,
          unit_amount: totalCents,
          product_data: {
            name: "AI Audio (voice-over)",
            description: `${chars.toLocaleString()} chars × ${(unitCents / 100).toFixed(
              2
            )} GBP/char`,
          },
        },
        quantity: 1,
      },
    ];

    // 7) Create Stripe Checkout with Connect split
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: creator.stripe_account_id },
      },
      metadata: {
        order_id: orderRow.id,
        creator_id: creatorId,
        kind: "audio",
        char_count: String(chars),
        unit_cents: String(unitCents),
        total_cents: String(totalCents),
        script_text: script, // consider hashing if scripts get very large
        client_amount_cents: client_amount_cents ? String(client_amount_cents) : "",
        terms_accepted: "true",
      },
      customer_creation: "always",
    });

    // 8) Persist session id on the order
    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderRow.id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("audio create-session error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
