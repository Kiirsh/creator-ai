// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ttsToMp3Bytes } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.arrayBuffer();
  const sig = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("[webhook] incoming", {
    hasSig: !!sig,
    hasSecret: !!webhookSecret,
    len: raw.byteLength,
  });

  if (!webhookSecret || !sig) {
    console.error("[webhook] missing secret or signature");
    return new NextResponse("Missing webhook secret or signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(raw), sig, webhookSecret);
    console.log("[webhook] signature ok →", event.type);
  } catch (err: any) {
    console.error("[webhook] bad signature:", err?.message);
    return new NextResponse("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = (session.metadata || {}) as Record<string, string>;
        const orderId = (meta.order_id as string) || null;

        await markOrderPaid({
          orderId,
          sessionId: session.id,
          buyerEmail: session.customer_details?.email ?? null,
        });

        // AUDIO fulfillment (idempotent)
        await maybeFulfillAudio({
          kind: meta.kind,
          orderId,
          creatorId: meta.creator_id,
          fallbackScript: meta.script_text,
          charCount: meta.char_count ? Number(meta.char_count) : null,
        });

        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = (session.metadata || {}) as Record<string, string>;
        const orderId = (meta.order_id as string) || null;

        await markOrderPaid({
          orderId,
          sessionId: session.id,
          buyerEmail: session.customer_details?.email ?? null,
        });

        // AUDIO fulfillment (idempotent)
        await maybeFulfillAudio({
          kind: meta.kind,
          orderId,
          creatorId: meta.creator_id,
          fallbackScript: meta.script_text,
          charCount: meta.char_count ? Number(meta.char_count) : null,
        });

        break;
      }

      // Optional: only if you ever attach order_id to the PI metadata.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = (pi.metadata?.order_id as string) || null;
        if (orderId) {
          await markOrderPaid({
            orderId,
            sessionId: (pi.metadata?.checkout_session_id as string) || null,
            buyerEmail: null,
          });

          // AUDIO fulfillment (idempotent), if PI also carries metadata
          await maybeFulfillAudio({
            kind: pi.metadata?.kind as string | undefined,
            orderId,
            creatorId: pi.metadata?.creator_id as string | undefined,
            fallbackScript: pi.metadata?.script_text as string | undefined,
            charCount: pi.metadata?.char_count ? Number(pi.metadata.char_count) : null,
          });
        }
        break;
      }

      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        await upsertAccountStatus(acct);
        break;
      }

      case "v2.core.account.updated" as any:
      case "v2.core.account.requirements.updated" as any: {
        // @ts-ignore v2 payloads aren't fully typed in the v1 SDK.
        const acct = event.data.object as any;
        const normalized = {
          id: acct.id as string,
          capabilities: acct.configuration?.recipient?.capabilities ?? acct.capabilities ?? {},
          requirements:
            acct.requirements ??
            acct.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.requirements ??
            {},
        };
        await upsertAccountStatus(normalized);
        break;
      }

      default:
        break;
    }

    return new NextResponse("ok", { status: 200 });
  } catch (e: any) {
    console.error("[webhook] handler error:", e?.message || e);
    return new NextResponse("error", { status: 500 });
  }
}

/** Mark order as paid (what you already had) */
async function markOrderPaid(args: {
  orderId: string | null;
  sessionId: string | null;
  buyerEmail: string | null;
}) {
  const { orderId, sessionId, buyerEmail } = args;
  const paidFields = { status: "paid", buyer_email: buyerEmail, paid_at: new Date().toISOString() };

  if (orderId) {
    console.log("[orders] updating by order id", { orderId });
    const { error } = await supabaseAdmin.from("orders").update(paidFields).eq("id", orderId);
    if (error) console.error("[orders] update by id failed:", error.message);
    else console.log("[orders] update by id ok");
    return;
  }

  if (sessionId) {
    console.log("[orders] updating by session id", { sessionId });
    const { error } = await supabaseAdmin
      .from("orders")
      .update(paidFields)
      .eq("stripe_session_id", sessionId);
    if (error) console.error("[orders] update by session id failed:", error.message);
    else console.log("[orders] update by session id ok");
  }
}

/** Only fulfill audio orders; do nothing for video. Idempotent (skips if already delivered). */
async function maybeFulfillAudio(opts: {
  kind?: string;
  orderId: string | null;
  creatorId?: string | null;
  fallbackScript?: string | null;
  charCount?: number | null;
}) {
  if (opts.kind !== "audio") return;
  if (!opts.orderId) return;

  // skip if already delivered
  const { data: existing } = await supabaseAdmin
    .from("audio_deliveries")
    .select("order_id")
    .eq("order_id", opts.orderId)
    .maybeSingle();

  if (existing?.order_id) {
    console.log("[audio] already delivered, skipping", { orderId: opts.orderId });
    return;
  }

  try {
    await handleAudioFulfillment({
      orderId: opts.orderId,
      creatorId: opts.creatorId ?? null,
      fallbackScript: opts.fallbackScript ?? null,
      charCount: opts.charCount ?? null,
    });
  } catch (e: any) {
    // don't fail the webhook — just log; you can add a retry job later
    console.error("[audio] fulfillment error:", e?.message || e);
  }
}

/**
 * AUDIO fulfillment:
 * - Fetch script (from audio_scripts; fallback to metadata supplied script)
 * - Fetch creator's ElevenLabs voice/settings
 * - Generate MP3 via ElevenLabs
 * - Upload to Supabase Storage bucket "audio"
 * - Record in audio_deliveries (and optionally mark delivered_at on orders)
 */
async function handleAudioFulfillment(opts: {
  orderId: string;
  creatorId: string | null;
  fallbackScript: string | null;
  charCount: number | null;
}) {
  const { orderId, creatorId, fallbackScript, charCount } = opts;
  if (!orderId) throw new Error("Missing orderId");
  if (!creatorId) throw new Error("Missing creatorId for audio order");

  // 1) Load script from DB (preferred)
  const { data: scriptRow, error: scriptErr } = await supabaseAdmin
    .from("audio_scripts")
    .select("script_text, char_count")
    .eq("order_id", orderId)
    .maybeSingle();

  if (scriptErr) {
    console.warn("[audio] audio_scripts lookup failed (continuing):", scriptErr.message);
  }

  const script = scriptRow?.script_text || fallbackScript || "";
  const chars = scriptRow?.char_count || charCount || script.length;

  if (!script || !chars) {
    throw new Error("No script found for this audio order");
  }

  // 2) Creator's voice (assume single voice per creator)
  type VoiceRow = {
    eleven_voice_id: string;
    stability: number | null;
    similarity_boost: number | null;
    style: number | null;
    use_speaker_boost: boolean | null;
    language_code: string | null;
  };

  const { data: voice, error: voiceErr } = await supabaseAdmin
    .from("creator_voices")
    .select(
      "eleven_voice_id, stability, similarity_boost, style, use_speaker_boost, language_code"
    )
    .eq("creator_id", creatorId)
    .limit(1)
    .maybeSingle<VoiceRow>();

  if (voiceErr) {
    throw new Error(`Voice lookup failed: ${voiceErr.message}`);
  }
  if (!voice?.eleven_voice_id) {
    throw new Error("Creator has no ElevenLabs voice configured");
  }

  // 3) Generate MP3
  const mp3Bytes = await ttsToMp3Bytes({
    voiceId: voice.eleven_voice_id,
    text: script,
    modelId: "eleven_multilingual_v2",
    settings: {
      stability: voice.stability ?? undefined,
      similarity_boost: voice.similarity_boost ?? undefined,
      style: voice.style ?? undefined,
      use_speaker_boost: voice.use_speaker_boost ?? true,
    },
  });

  // 4) Upload to Supabase Storage (bucket "audio" must exist)
  const path = `orders/${orderId}.mp3`;
  const upload = await supabaseAdmin.storage
    .from("audio")
    .upload(path, mp3Bytes, {
      upsert: true,
      contentType: "audio/mpeg",
      cacheControl: "3600",
    });

  if (upload.error) {
    throw new Error(`Upload failed: ${upload.error.message}`);
  }

  const { data: pub } = supabaseAdmin.storage.from("audio").getPublicUrl(path);
  const publicUrl = pub?.publicUrl || null;

  // 5) Record delivery
  const { error: deliveryErr } = await supabaseAdmin
    .from("audio_deliveries")
    .upsert({ order_id: orderId, audio_url: publicUrl || path }, { onConflict: "order_id" });

  if (deliveryErr) {
    console.warn("[audio] upsert audio_deliveries failed (table missing?)", deliveryErr.message);
  }

  // Optional: mark order as delivered
  try {
    await supabaseAdmin.from("orders").update({ delivered_at: new Date().toISOString() }).eq("id", orderId);
  } catch {
    /* orders may not have delivered_at; ignore */
  }

  console.log("[audio] delivered:", { orderId, url: publicUrl || path });
}

async function upsertAccountStatus(acct: {
  id: string;
  capabilities?: any;
  requirements?: any;
}) {
  const { data: creator } = await supabaseAdmin
    .from("creators")
    .select("id")
    .eq("stripe_account_id", acct.id)
    .maybeSingle();

  if (!creator?.id) return;

  const transfersActive =
    acct.capabilities?.transfers === "active" ||
    acct.capabilities?.stripe_balance?.stripe_transfers?.status === "active";

  const pastDue =
    acct.requirements?.past_due?.length > 0 ||
    acct.capabilities?.stripe_balance?.stripe_transfers?.status_details?.code === "requirements_past_due";

  await supabaseAdmin
    .from("creators")
    .update({
      // onboarding_status: transfersActive ? "active" : pastDue ? "requirements_past_due" : "pending",
      // requirements_json: acct.requirements,
    })
    .eq("id", creator.id);

  console.log("[creators] account status noted", {
    creatorId: creator.id,
    transfersActive,
    pastDue,
  });
}
