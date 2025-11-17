// src/app/api/test-webhook/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    env: {
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      secretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + "..."
    }
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  
  return NextResponse.json({
    message: "Webhook test received",
    timestamp: new Date().toISOString(),
    bodyLength: body.length,
    hasSignature: !!headers['stripe-signature'],
    signature: headers['stripe-signature']?.substring(0, 20) + "...",
    allHeaders: headers
  });
}
