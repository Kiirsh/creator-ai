// src/components/profile/MediaTray.tsx
"use client";
import Image from "next/image";

type Tile = { id: string; thumb: string; label: string };

export function MediaTray({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div
          key={t.id}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-800"
        >
          <Image
            src={t.thumb}
            alt={t.label}
            fill
            // 👇 tell Next how wide images will render at different breakpoints
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 33vw"
            className="object-cover"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}
