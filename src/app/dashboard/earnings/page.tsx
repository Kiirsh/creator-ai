// src/app/dashboard/earnings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/currency";

type Row = {
  id: string;
  created_at: string;
  amount_cents: number;
  fee_cents: number | null;
  net_cents: number | null;
  currency: string;
  rate_id: string;
  status: string;
};

export default function EarningsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);

  const fetchEarnings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user.id);

    const { data, error } = await supabase
      .from("orders")
      .select("id, created_at, amount_cents, fee_cents, net_cents, currency, rate_id, status")
      .eq("creator_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (!error) setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += r.amount_cents || 0;
      acc.fee += r.fee_cents || 0;
      acc.net += r.net_cents || (r.amount_cents - (r.fee_cents || 0));
      return acc;
    },
    { gross: 0, fee: 0, net: 0 }
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Earnings</h1>
        <button
          onClick={() => {
            setLoading(true);
            fetchEarnings();
          }}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat title="Gross" value={money(totals.gross)} />
        <Stat title="Platform fee" value={money(totals.fee)} />
        <Stat title="Your take-home" value={money(totals.net)} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="text-lg font-semibold mb-3">Paid orders</h2>
        {loading ? (
          <div className="text-white/70 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-white/70 text-sm">No paid orders yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Rate</th>
                <th className="text-right py-2">Gross</th>
                <th className="text-right py-2">Fee</th>
                <th className="text-right py-2">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-2">{r.rate_id.slice(0, 8)}…</td>
                  <td className="py-2 text-right">{money(r.amount_cents)}</td>
                  <td className="py-2 text-right">{money(r.fee_cents || 0)}</td>
                  <td className="py-2 text-right">
                    {money(r.net_cents ?? r.amount_cents - (r.fee_cents || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <div className="text-white/60 text-sm">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
