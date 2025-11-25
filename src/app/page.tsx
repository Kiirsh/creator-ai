// src/app/page.tsx
import Link from "next/link";
import CreatorCard from "@/components/CreatorCard";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function Page() {
  const { data, error } = await supabase
    .from("public_creator_profile")
    .select("*")
    .limit(6);

  if (error) {
    console.error("Supabase error (landing):", error);
  }

  const creators = data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-neutral-950 text-white">
        <div className="absolute inset-x-0 -top-1 h-2 bg-brand-gradient" />
        <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <span className="text-brand-gradient">AI avatars</span> of your favourite stars
        </h1>

        <p className="mt-4 text-white/80 max-w-2xl">
          Create AI videos of public figures with their permission. Perfect for brand campaigns or just
          for fun. Book through filmee to unlock their permission on the Sora app
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/creators"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-indigo-500/35 focus-ring"
          >
            Browse creators
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-indigo-500/35 focus-ring"
          >
            Creators: create your profile
          </Link>
        </div>
      </section>

      {/* Promo videos (portrait 9:16 like mobile) */}
      <section className="mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <figure
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black mx-auto"
              style={{ width: 280 }}
            >
              <video
                className="w-full object-cover"
                style={{ aspectRatio: "9 / 16" }}
                src={`/clip${i}.mp4`}
                poster={`/clip${i}.jpg`}
                playsInline
                muted
                loop
                autoPlay
                preload="metadata"
              >
                <source src={`/clip${i}.mp4`} type="video/mp4" />
              </video>

              <figcaption className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded bg-black/50 text-white/80 opacity-0 group-hover:opacity-100 transition">
                Example collab #{i}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Featured grid */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">
          <span className="text-brand-gradient">Featured</span> creators
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {creators.map((c: any) => (
            <CreatorCard
              key={c.id}
              id={c.id}
              slug={c.slug}
              name={c.display_name}
              role={c.headline || "Creator"}
              avatarUrl={c.avatar_url || "/demo/creator.jpg"}
              baseRateCents={c.base_rate_cents || 0}
              followers={c.followers || 0}
              categories={c.categories || []}
              // Social media data
              instagramHandle={c.instagram_handle ?? undefined}
              instagramFollowers={c.instagram_followers ?? undefined}
              youtubeHandle={c.youtube_handle ?? undefined}
              youtubeFollowers={c.youtube_followers ?? undefined}
              tiktokHandle={c.tiktok_handle ?? undefined}
              tiktokFollowers={c.tiktok_followers ?? undefined}
              soraHandle={c.sora2_handle ?? undefined}
              soraFollowers={c.sora2_followers ?? undefined}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
