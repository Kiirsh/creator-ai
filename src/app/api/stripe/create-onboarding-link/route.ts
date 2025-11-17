// src/app/api/stripe/create-onboarding-link/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST { creatorId: string, returnUrl?: string }
 * Returns { url } for onboarding.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { creatorId, returnUrl } = body;
    
    if (!creatorId) {
      return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });
    }

    const finalReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/profile`;

    // Load or create creator
    let { data: creator, error: creatorErr } = await supabaseAdmin
      .from("creators")
      .select("id, stripe_account_id")
      .eq("id", creatorId)
      .maybeSingle();

    if (creatorErr) {
      return NextResponse.json({ error: creatorErr.message }, { status: 500 });
    }

    if (!creator) {
      // Create creator row
      const { data: newCreator, error: insertErr } = await supabaseAdmin
        .from("creators")
        .insert({ id: creatorId })
        .select("id, stripe_account_id")
        .single();
      
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      creator = newCreator;
    }

    let accountId = creator.stripe_account_id;

    // If we have an account ID, verify it's valid before using it
    if (accountId) {
      try {
        console.log("Verifying existing account:", accountId);
        await stripe.accounts.retrieve(accountId);
        console.log("Existing account is valid");
      } catch (verifyErr: any) {
        console.log("Existing account is invalid, will create new one:", verifyErr.message);
        // Clear the invalid account ID from database
        await supabaseAdmin
          .from("creators")
          .update({ stripe_account_id: null })
          .eq("id", creatorId);
        accountId = null; // Force creation of new account
      }
    }

    if (!accountId) {
      // Create Express account
      console.log("Creating new Stripe Express account for creator:", creatorId);
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: { 
          card_payments: { requested: true }, 
          transfers: { requested: true } 
        },
        settings: {
          payouts: { 
            schedule: { 
              interval: "monthly",
              monthly_anchor: 1 // Payout on the 1st of each month
            } 
          },
        },
      });
      accountId = account.id;
      console.log("Created Stripe account:", accountId);

      // Update creator with account ID
      const { error: updateErr } = await supabaseAdmin
        .from("creators")
        .update({ stripe_account_id: accountId })
        .eq("id", creatorId);

      if (updateErr) {
        console.error("Failed to update creator with account ID:", updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      console.log("Updated creator with account ID:", accountId);
    } else {
      console.log("Using existing Stripe account:", accountId);
    }

    // Verify the account exists and is accessible
    try {
      console.log("Verifying account exists:", accountId);
      const account = await stripe.accounts.retrieve(accountId);
      console.log("Account verified:", account.id, "Type:", account.type);
    } catch (verifyErr: any) {
      console.error("Account verification failed:", verifyErr.message);
      return NextResponse.json({ 
        error: `Account verification failed: ${verifyErr.message}` 
      }, { status: 400 });
    }

    // Create onboarding link
    console.log("Creating account link for account:", accountId);
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: finalReturnUrl,
      return_url: finalReturnUrl,
      type: "account_onboarding",
    });

    console.log("Account link created successfully");
    return NextResponse.json({ url: link.url });
  } catch (e: any) {
    console.error("Onboarding link creation error:", e);
    return NextResponse.json({ error: e.message || "Failed to create onboarding link" }, { status: 500 });
  }
}
