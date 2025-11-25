"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, MessageCircle, CreditCard, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  { href: "/dashboard/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/dashboard/earnings", label: "Earnings", icon: CreditCard },
  { href: "/creators", label: "Browse creators", icon: Users },
  { href: "/", label: "Home", icon: LayoutDashboard },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-64 shrink-0 border-r bg-sidebar px-4 py-6 text-sidebar-foreground">
      <div className="rounded-2xl border bg-gradient-to-b from-white/80 via-secondary/20 to-white/70 p-4 shadow-sm">
        <div className="px-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Navigation</p>
          <p className="text-sm text-muted-foreground mt-1">Quick access to your workspace</p>
        </div>
        <nav className="mt-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className="block">
                <Button
                  variant={active ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm",
                    active
                      ? "shadow-sm"
                      : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
