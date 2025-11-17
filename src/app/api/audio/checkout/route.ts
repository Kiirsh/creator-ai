import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "AI audio checkout is currently disabled." },
    { status: 410 }
  );
}
