// src/app/api/debug/orders/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const creatorId = url.searchParams.get("creatorId");
    
    if (!creatorId) {
      return NextResponse.json({ error: "Missing creatorId query parameter" }, { status: 400 });
    }

    // Get all orders for this creator
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
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

    return NextResponse.json({
      creatorId,
      creator: creator || null,
      orders: orders || [],
      summary: {
        total: orders?.length || 0,
        paid: orders?.filter(o => o.status === "paid").length || 0,
        created: orders?.filter(o => o.status === "created").length || 0,
        other: orders?.filter(o => o.status !== "paid" && o.status !== "created").length || 0
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
