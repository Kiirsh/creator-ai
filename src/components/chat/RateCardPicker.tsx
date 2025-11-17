"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { SelectHTMLAttributes } from "react";

type Card = { id: string; label: string; price_cents: number; currency: string };

export default function RateCardPicker({
  creatorId,
  conversationId,
  className,
}: {
  creatorId: string;
  conversationId: string;
  className?: string;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("rate_cards")
        .select("id,label,price_cents,currency")
        .eq("creator_id", creatorId)
        .order("price_cents", { ascending: true });
      if (!error && data) {
        setCards(data as any);
        if (data.length > 0) setSelected(data[0].id);
      }
    })();
  }, [creatorId]);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selected) || null,
    [cards, selected]
  );

  async function checkout() {
    if (!selectedCard) return;
    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        amount_cents: selectedCard.price_cents,
        currency: selectedCard.currency || "GBP",
        creator_id: creatorId,
        conversation_id: conversationId,
        description: selectedCard.label,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    setLoading(false);
    if (json.url) {
      window.location.href = json.url;
    } else {
      alert(json.error || "Could not start checkout");
    }
  }

  return (
    <div className={className}>
      <div className="text-sm font-medium mb-2">Book this creator</div>
      {cards.length === 0 ? (
        <div className="text-sm text-white/60">No rate cards yet.</div>
      ) : (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg bg-neutral-900 border border-white/10 p-2 text-sm mb-2"
          >
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} — {new Intl.NumberFormat(undefined, { style: "currency", currency: c.currency || "GBP" }).format(c.price_cents / 100)}
              </option>
            ))}
          </select>
          <Button onClick={checkout} disabled={loading} className="w-full">
            {loading ? "Starting checkout…" : "Pay to book"}
          </Button>
        </>
      )}
    </div>
  );
}
