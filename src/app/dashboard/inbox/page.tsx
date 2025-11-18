// src/app/dashboard/inbox/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  brand_id: string;
  creator_id: string;
  brand_name: string;
  creator_name: string;
  created_at: string;
};

export default function InboxPage() {
  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [me, setMe] = useState<{ id: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth/signin";
        return;
      }
      setMe({ id: user.id });

      const { data, error } = await supabase
        .from("my_conversations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setConvos(data as Conversation[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Inbox</h1>
        <p className="text-white/70">Loading conversations…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Inbox</h1>

      {convos.length === 0 ? (
        <p className="text-slate-100/80">No conversations yet.</p>
      ) : (
        <ul className="space-y-2">
          {convos.map((c) => {
            const otherName =
              me && me.id === c.brand_id ? c.creator_name : c.brand_name;
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.05),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(79,70,229,0.12),transparent_32%),#0f172a] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.32)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{otherName}</div>
                    <div className="text-xs text-slate-200/80">
                      Started {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/inbox/${c.id}`}
                    className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-[0_12px_25px_rgba(79,70,229,0.35)] border border-primary/60 hover:brightness-110 transition focus-ring"
                  >
                    Open
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
