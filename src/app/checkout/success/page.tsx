// src/app/checkout/success/page.tsx
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

type SearchParams = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  const orderId = typeof sp.order === "string" ? sp.order : null;

  let order: any = null;

  if (orderId) {
    const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    order = data;
  } else if (sessionId) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    order = data;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6 text-white">
      <h1 className="text-2xl font-semibold">Payment successful 🎉</h1>
      {order ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 space-y-2">
          <div>Order ID: <span className="text-white/70">{order.id}</span></div>
          <div>
            Amount:{" "}
            <span className="text-white/70">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: (order.currency || "gbp").toUpperCase(),
              }).format((order.amount_cents || 0) / 100)}
            </span>
          </div>
          <div>Status: <span className="text-white/70">{order.status}</span></div>
        </div>
      ) : (
        <p className="text-white/70">
          Thanks! Your payment was processed. (We couldn’t find an order record to show here.)
        </p>
      )}

      <a href="/creators" className="inline-block rounded-full border px-5 py-3">
        Back to creators
      </a>
    </main>
  );
}
