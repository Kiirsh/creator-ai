// src/app/api/stripe/debug/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const creatorId = url.searchParams.get("creatorId");
    
    if (!creatorId) {
      return NextResponse.json({ error: "Missing creatorId query parameter" }, { status: 400 });
    }

    // Get creator info
    const { data: creator, error: creatorErr } = await supabaseAdmin
      .from("creators")
      .select("id, stripe_account_id")
      .eq("id", creatorId)
      .maybeSingle();

    if (creatorErr) {
      return NextResponse.json({ error: creatorErr.message }, { status: 500 });
    }

    const result: any = {
      creatorId,
      creator: creator || null,
      stripeConfig: {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) + "...",
        apiVersion: "2025-09-30.clover"
      }
    };

    // If we have a Stripe account ID, try to retrieve it
    if (creator?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(creator.stripe_account_id);
        result.stripeAccount = {
          id: account.id,
          type: account.type,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          capabilities: account.capabilities
        };
      } catch (accountErr: any) {
        result.stripeAccountError = accountErr.message;
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
