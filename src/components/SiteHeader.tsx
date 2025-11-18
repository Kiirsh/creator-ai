// src/components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SignOutButton from "@/components/auth/SignOutButton";
import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";
import { Button } from "@/components/ui/button";

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
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-white/70 backdrop-blur dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link href="/" className="inline-flex items-center gap-2" aria-label="filmee home">
          <span
            className={cn(
              poppins.className,
              "text-3xl font-semibold tracking-tight text-slate-900 dark:text-white"
            )}
          >
            filmee
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            Creator Studio
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-2 text-sm">
          <Link
            href="/creators"
            className={cn(
              "rounded-lg px-3 py-2 text-muted-foreground transition hover:text-foreground hover:bg-muted",
              pathname.startsWith("/creators") && "bg-primary/10 text-primary"
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
                      "rounded-lg px-3 py-2 text-muted-foreground transition hover:text-foreground hover:bg-muted",
                      pathname.startsWith("/dashboard/profile") && "bg-primary/10 text-primary"
                    )}
                  >
                    Profile
                  </Link>

                  <Link
                    href="/dashboard/earnings"
                    className={cn(
                      "rounded-lg px-3 py-2 text-muted-foreground transition hover:text-foreground hover:bg-muted",
                      pathname.startsWith("/dashboard/earnings") && "bg-primary/10 text-primary"
                    )}
                  >
                    Earnings
                  </Link>
                </>
              )}

              <Link
                href="/dashboard/inbox"
                className={cn(
                  "relative rounded-lg px-3 py-2 text-muted-foreground transition hover:text-foreground hover:bg-muted",
                  pathname.startsWith("/dashboard/inbox") && "bg-primary/10 text-primary"
                )}
              >
                Inbox
                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </Link>

              <SignOutButton />
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {me ? (
            <Link
              href="/dashboard/inbox"
              className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
            >
              Inbox
            </Link>
          ) : (
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
