// src/components/profile/ProfileHeader.tsx
"use client";

import { Badge } from "@/components/ui/badge";

type Props = {
  name: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
};

export function ProfileHeader({ name, subtitle, avatarUrl, verified }: Props) {
  const src =
    avatarUrl && avatarUrl.trim().length > 0 ? avatarUrl : "/demo/creator.jpg";

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900 text-white px-4 py-4 md:px-5 md:py-5">
      {/* Stack on mobile, row on md+ */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Rectangular cover-style image */}
        <div className="w-full md:w-auto">
          <img
            src={src}
            alt={name}
            className="w-full h-40 md:w-56 md:h-36 object-cover rounded-xl border border-white/15"
          />
        </div>

        {/* Text block */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* No truncation on mobile now since it’s below the image;
               keep gentle truncation on very long names */}
            <h1 className="text-xl font-semibold truncate">{name}</h1>
            {verified ? (
              <Badge className="bg-blue-500/20 text-blue-300">Verified</Badge>
            ) : null}
          </div>
          {subtitle ? (
            <p className="text-sm text-white/70">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
