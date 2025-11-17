// src/components/CreatorCard.tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Instagram, Youtube, Music2, Sparkles } from "lucide-react";
import { money } from "@/lib/currency";

export type CreatorCardProps = {
  id: string;
  slug?: string | null;

  name: string;
  role?: string | null;
  avatarUrl?: string | null;

  baseRateCents?: number | null;
  followers?: number | null;

  rating?: number;
  ratingCount?: number;

  categories?: string[] | null;

  // Socials (all optional)
  instagramHandle?: string | null;
  instagramFollowers?: number | null;

  youtubeHandle?: string | null;
  youtubeFollowers?: number | null;

  tiktokHandle?: string | null;
  tiktokFollowers?: number | null;

  soraHandle?: string | null;
  soraFollowers?: number | null;

  // No-nos (chips)
  noNos?: string[]; // e.g. ["Politics", "Adult"]
};

function SocialRow({
  icon,
  label,
  handle,
  followers,
}: {
  icon: ReactNode;
  label: string;
  handle?: string | null;
  followers?: number | null;
}) {
  if (!handle) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-white/80">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{handle}</span>
      {typeof followers === "number" && followers > 0 && (
        <span className="text-white/50">· {followers.toLocaleString()}</span>
      )}
    </div>
  );
}

export default function CreatorCard(props: CreatorCardProps) {
  const {
    id,
    slug,
    name,
    role,
    avatarUrl,
    baseRateCents,
    followers,
    rating,
    ratingCount,
    categories,
    instagramHandle,
    instagramFollowers,
    youtubeHandle,
    youtubeFollowers,
    tiktokHandle,
    tiktokFollowers,
    soraHandle,
    soraFollowers,
    noNos = [],
  } = props;

  const href = `/creator/${slug || id}`;
  const src = avatarUrl?.trim() ? avatarUrl! : "/demo/creator.jpg";

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-neutral-900 hover:border-white/20 transition-colors p-4"
    >
      {/* Top: avatar + name */}
      <div className="flex items-center gap-3">
        {/* Using <img> instead of next/image to avoid domain config issues */}
        <img
          src={src}
          alt={name}
          width={64}
          height={64}
          className="h-16 w-16 rounded-xl object-cover border border-white/10"
          style={{ width: 64, height: 64 }}
        />
        <div className="min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-sm text-white/60 truncate">
            {role || "Creator"}
          </div>
        </div>
      </div>

      {/* Price / stats */}
      <div className="mt-4 text-sm text-white/80">
        <div className="font-medium">
          From {money(baseRateCents || 0)}
        </div>
        {typeof followers === "number" && followers > 0 && (
          <div className="text-white/50">{followers.toLocaleString()} followers</div>
        )}
      </div>

      {/* Socials */}
      {(instagramHandle ||
        youtubeHandle ||
        tiktokHandle ||
        soraHandle) && (
        <div className="mt-4 space-y-1.5">
          <SocialRow
            icon={<Instagram className="h-3.5 w-3.5" />}
            label="Instagram"
            handle={instagramHandle}
            followers={instagramFollowers ?? undefined}
          />
          <SocialRow
            icon={<Youtube className="h-3.5 w-3.5" />}
            label="YouTube"
            handle={youtubeHandle}
            followers={youtubeFollowers ?? undefined}
          />
          <SocialRow
            icon={<Music2 className="h-3.5 w-3.5" />}
            label="TikTok"
            handle={tiktokHandle}
            followers={tiktokFollowers ?? undefined}
          />
          <SocialRow
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Sora 2"
            handle={soraHandle}
            followers={soraFollowers ?? undefined}
          />
        </div>
      )}

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="text-[11px] rounded-full border border-white/10 px-2 py-0.5 text-white/70"
            >
              #{cat}
            </span>
          ))}
        </div>
      )}

      {/* No-nos */}
{noNos && noNos.length > 0 && (
  <div className="mt-3 flex items-start gap-2">
    <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/50 pt-1">
      No-nos
    </span>
    <div className="flex flex-wrap gap-1.5">
      {noNos.slice(0, 4).map((tag) => (
        <span
          key={tag}
          className="text-[11px] rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-white/70"
        >
          {tag}
        </span>
      ))}
    </div>
  </div>
)}


      {/* Rating (optional) */}
      {typeof rating === "number" && ratingCount ? (
        <div className="mt-3 text-xs text-white/60">⭐ {rating.toFixed(1)} ({ratingCount})</div>
      ) : null}
    </Link>
  );
}
