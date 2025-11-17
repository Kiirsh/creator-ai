// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAudioLikeLabel } from "@/lib/rates";

/**
 * POST /api/checkout
 * body: { creatorId: string, rateId: string }
 * Returns: { url: string }
 */
export async function POST(req: Request) {
  try {
    const { creatorId, rateId } = await req.json();

    if (!creatorId || !rateId) {
      return NextResponse.json({ error: "Missing creatorId or rateId" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // 1) Fetch rate info from DB (authoritative)
    const { data: rate, error: rateErr } = await supabaseAdmin
      .from("rate_cards")
      .select("id,label,price_cents,currency,creator_id")
      .eq("id", rateId)
      .maybeSingle();

    if (rateErr || !rate || rate.creator_id !== creatorId) {
      return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
    }

    if (isAudioLikeLabel(rate.label)) {
      return NextResponse.json({ error: "Audio purchases are not available" }, { status: 400 });
    }

    // 2) Create a pending order row
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        creator_id: creatorId,
        rate_id: rate.id,
        amount_cents: rate.price_cents,
        currency: rate.currency || "gbp",
        status: "created",
      })
      .select("id")
      .single();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    const amount = rate.price_cents;
    const currency = (rate.currency || "gbp").toLowerCase();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: `Custom video — ${rate.label}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/purchase/cancel`,
      metadata: {
        order_id: orderRow.id,
        creator_id: creatorId,
        rate_id: rateId,
      },
    });

    // 4) Save the session id to our order
    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderRow.id);

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("checkout error:", e);
    console.error("Error details:", {
      message: e.message,
      type: e.type,
      statusCode: e.statusCode,
      code: e.code
    });
    return NextResponse.json({ 
      error: e.message || "Checkout failed",
      details: e.type || "Unknown error"
    }, { status: 500 });
  }
}
