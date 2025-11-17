// src/app/api/tts/synthesize/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs"; // ensure Node (not Edge) so we can stream binary

type Body = {
  creatorId?: string;
  celebrityVoiceId?: string; // your public-safe id
  scriptText?: string;
};

const MAX_CHARS = 3000; // keep requests sane

export async function POST(req: Request) {
  try {
    const { creatorId, celebrityVoiceId, scriptText } = (await req.json()) as Body;

    if (!creatorId || !celebrityVoiceId || !scriptText) {
      return NextResponse.json(
        { error: "creatorId, celebrityVoiceId and scriptText are required" },
        { status: 400 }
      );
    }
    if (scriptText.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `Script too long (max ${MAX_CHARS} characters)` },
        { status: 400 }
      );
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Look up the voice row and pull the *private* ElevenLabs voice id + settings
    const { data: voice, error } = await supabaseAdmin
      .from("creator_voices")
      .select(
        "eleven_voice_id, stability, similarity_boost, style, use_speaker_boost"
      )
      .eq("creator_id", creatorId)
      .eq("celebrity_voice_id", celebrityVoiceId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!voice?.eleven_voice_id) {
      return NextResponse.json(
        { error: "Voice not found for this creator" },
        { status: 404 }
      );
    }

    // Build request payload (model + settings)
    const payload = {
      text: scriptText,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: clampNum(voice.stability, 0, 1, 0.6),
        similarity_boost: clampNum(voice.similarity_boost, 0, 1, 0.85),
        style: Number.isFinite(voice.style) ? voice.style : undefined,
        use_speaker_boost: !!voice.use_speaker_boost,
      },
      // You can also pass "optimize_streaming_latency": 0|1|2 if you want
    };

    // Call ElevenLabs — request MP3 back
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.eleven_voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok || !res.body) {
      const errText = await safeText(res);
      return NextResponse.json(
        { error: `ElevenLabs error: ${res.status} ${res.statusText} ${errText}` },
        { status: 502 }
      );
    }

    // Stream MP3 back to the client
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename="voice_${celebrityVoiceId}.mp3"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

function clampNum(
  n: number | null | undefined,
  min: number,
  max: number,
  fallback: number
) {
  const v = typeof n === "number" ? n : fallback;
  return Math.max(min, Math.min(max, v));
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
