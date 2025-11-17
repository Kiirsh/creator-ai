"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Card = {
  id: string;
  label: string;
  price_cents: number;
  currency: string | null;
};

export default function RateCardsEditor() {
  const [me, setMe] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);
      const { data } = await supabase
        .from("rate_cards")
        .select("id,label,price_cents,currency")
        .eq("creator_id", user.id)
        .order("price_cents", { ascending: true });
      setCards((data as Card[]) || []);
    })();
  }, []);

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !label.trim() || !price || Number(price) <= 0) return;
    setSaving(true);
    const price_cents = Math.round(Number(price) * 100);
    const { data, error } = await supabase
      .from("rate_cards")
      .insert({ creator_id: me, label: label.trim(), price_cents, currency: "GBP" })
      .select("id,label,price_cents,currency")
      .single();
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setCards((prev) => [...prev, data as Card].sort((a,b)=>a.price_cents-b.price_cents));
    setLabel("");
    setPrice("");
  }

  async function deleteCard(id: string) {
    const ok = confirm("Delete this rate?");
    if (!ok) return;
    const { error } = await supabase.from("rate_cards").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addCard} className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px] gap-2">
        <Input
          placeholder="e.g. 30s UGC video"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input
          placeholder="Price (GBP)"
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add rate"}
        </Button>
      </form>

      {cards.length === 0 ? (
        <p className="text-white/60 text-sm">No rate cards yet.</p>
      ) : (
        <ul className="divide-y divide-white/10 border border-white/10 rounded-xl">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-3">
              <div className="space-y-0.5">
                <div className="font-medium">{c.label}</div>
                <div className="text-white/60 text-sm">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: c.currency || "GBP" })
                    .format(c.price_cents / 100)}
                </div>
              </div>
              <Button variant="secondary" onClick={() => deleteCard(c.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
