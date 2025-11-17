// src/app/purchase/success/page.tsx
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // Optional: display order summary by session id
  let order: any = null;
  if (session_id) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session_id)
      .maybeSingle();
    order = data;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white">Thanks—payment received!</h1>
        
        {order ? (
          <p className="text-white/70 text-lg">
            We've logged your order (<code className="text-white/90 bg-white/10 px-2 py-1 rounded">{order.id}</code>) for{" "}
            <strong>{(order.amount_cents / 100).toLocaleString(undefined, { style: "currency", currency: (order.currency || "gbp").toUpperCase() })}</strong>.
            We'll message you in your inbox shortly.
          </p>
        ) : (
          <p className="text-white/70 text-lg">
            You can view your order in your inbox once it's processed.
          </p>
        )}
        
        <div className="space-y-3 pt-4">
          <Link 
            href="/creators"
            className="inline-block rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/90 transition-colors"
          >
            Browse More Creators
          </Link>
          
          <div>
            <Link 
              href="/dashboard"
              className="text-white/60 hover:text-white transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
