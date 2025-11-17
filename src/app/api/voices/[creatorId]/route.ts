// src/app/api/voices/[creatorId]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { creatorId: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const resolvedParams = await params;
    const creatorId = resolvedParams?.creatorId;
    
    if (!creatorId) {
      console.error("Missing creatorId in params:", resolvedParams);
      return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });
    }

    // Public fields only – do NOT return eleven_voice_id
    const { data, error } = await supabaseAdmin
      .from("creator_voices")
      .select(
        "celebrity_voice_id, display_name, language_code, stability, similarity_boost, style, use_speaker_boost"
      )
      .eq("creator_id", creatorId)
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ voices: data ?? [] });
  } catch (e: any) {
    console.error("Error in /api/voices/[creatorId]:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error", details: process.env.NODE_ENV === "development" ? String(e) : undefined },
      { status: 500 }
    );
  }
}
