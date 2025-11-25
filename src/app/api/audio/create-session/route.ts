import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "AI audio purchases are currently unavailable." },
    { status: 410 }
  );
}
