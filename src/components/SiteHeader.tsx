// src/components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SignOutButton from "@/components/auth/SignOutButton";
import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
});

type Me = { id: string; role?: "brand" | "creator" | null };

export default function SiteHeader() {
  const [me, setMe] = useState<Me | null>(null);
  const [unreadTotal, setUnreadTotal] = useState<number>(0);
  const pathname = usePathname();

  // auth + role
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setMe(null);
        setUnreadTotal(0);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      setMe({ id: user.id, role: (profile?.role as any) ?? null });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      if (!sess?.user) {
        setMe(null);
        setUnreadTotal(0);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", sess.user.id)
        .maybeSingle();
      setMe({ id: sess.user.id, role: (profile?.role as any) ?? null });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // unread count via RPC + live updates + focus refresh
  useEffect(() => {
    let cancelled = false;

    async function refreshUnread() {
      const { data, error } = await supabase.rpc("unread_total");
      if (error) {
        // console.warn("unread_total RPC error", error);
        return;
      }
      if (!cancelled) setUnreadTotal(Number(data || 0));
    }

    // initial + poll every 10s
    refreshUnread();
    const poll = setInterval(refreshUnread, 10000);

    // live update on new messages (could create unread)
    const msgChannel = supabase
      .channel("header-unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => refreshUnread()
      )
      .subscribe();

    // live update on read state changes (should clear unread immediately)
    const readsChannel = supabase
      .channel("header-unread-reads")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_reads" },
        () => refreshUnread()
      )
      .subscribe();

    // UI broadcast from the thread page after marking read
    const uiChannel = supabase
      .channel("ui-read-refresh", { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "read-update" }, () => refreshUnread())
      .subscribe();

    // refresh when tab becomes active again
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(readsChannel);
      supabase.removeChannel(uiChannel);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/80 backdrop-blur border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="inline-flex items-center gap-2" aria-label="filmee home">
          <span
            className={cn(
              poppins.className,
              "text-4xl font-bold bg-clip-text text-transparent text-brand-gradient"
            )}
          >
            filmee
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-3">
          <Link
            href="/creators"
            className={cn(
              "rounded-full px-3 py-1.5 text-sm border border-white/10 text-white/80 hover:text-white hover:bg-white/5",
              pathname.startsWith("/creators") && "bg-white text-black border-white"
            )}
          >
            Browse
          </Link>

          {me ? (
            <>
              {me.role === "creator" && (
                <>
                  <Link
                    href="/dashboard/profile"
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm border border-white/10 text-white/80 hover:text-white hover:bg-white/5",
                      pathname.startsWith("/dashboard/profile") && "bg-white text-black border-white"
                    )}
                  >
                    Profile
                  </Link>

                  <Link
                    href="/dashboard/earnings"
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm border border-white/10 text-white/80 hover:text-white hover:bg-white/5",
                      pathname.startsWith("/dashboard/earnings") && "bg-white text-black border-white"
                    )}
                  >
                    Earnings
                  </Link>
                </>
              )}

              <Link
                href="/dashboard/inbox"
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-sm border border-white/10 text-white/80 hover:text-white hover:bg-white/5",
                  pathname.startsWith("/dashboard/inbox") && "bg-white text-black border-white"
                )}
              >
                Inbox
                {unreadTotal > 0 && (
                  <span className="absolute -top-2 -right-3 rounded-full bg-pink-500 text-white text-[10px] px-1.5 py-0.5">
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </Link>

              <SignOutButton />
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-full border px-4 py-2 text-sm hover:bg-white/5 border-white/10 text-white/80 hover:text-white"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
