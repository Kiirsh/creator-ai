"use client";

/**
 * Starts a Stripe Checkout session for a given creator + rate.
 * Expects your server route at /api/checkout/create-session to return { url }.
 */
export async function startCheckout(creatorId: string, rateId: string) {
  const res = await fetch("/api/checkout/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatorId, rateId }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "Failed to create checkout session");
    throw new Error(msg);
  }

  const { url } = (await res.json()) as { url: string };
  // Redirect the browser to Stripe Checkout
  window.location.href = url;
}
