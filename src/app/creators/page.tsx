// src/app/creators/page.tsx
import CreatorCard from "@/components/CreatorCard";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function CreatorsDirectoryPage() {
  // Try using public_creator_profile instead of public_creator_cards
  const { data, error } = await supabase
    .from("public_creator_profile")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) {
    console.error("Supabase error (creators):", error);
  }

  const creators = data ?? [];
  const ids = creators.map((c: any) => c.id).filter(Boolean);

  // Fetch all no-nos for these creators in a single query
  let noNosByCreator: Record<string, string[]> = {};
  if (ids.length > 0) {
    const { data: nn, error: nnErr } = await supabase
      .from("creator_no_nos")
      .select("creator_id, tag")
      .in("creator_id", ids);

    if (nnErr) {
      console.error("Supabase error (no-nos):", nnErr);
    } else {
      noNosByCreator = (nn || []).reduce((acc: Record<string, string[]>, row: any) => {
        const list = acc[row.creator_id] || [];
        list.push(row.tag);
        acc[row.creator_id] = list;
        return acc;
      }, {});
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Browse creators</h1>

      {/* Keep the 3-up grid; the bigger cards will naturally take more space */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {creators.map((c: any) => (
          <CreatorCard
            key={c.id}
            id={c.id}
            slug={c.slug || undefined}
            name={c.display_name}
            role={c.headline || "Creator"}
            avatarUrl={c.avatar_url || "/demo/creator.jpg"}
            baseRateCents={c.base_rate_cents ?? 0}
            followers={c.followers ?? undefined}
            rating={4.9}
            ratingCount={100}
            categories={c.categories ?? []}
            // socials (already in the view)
            instagramHandle={c.instagram_handle ?? undefined}
            instagramFollowers={c.instagram_followers ?? undefined}
            youtubeHandle={c.youtube_handle ?? undefined}
            youtubeFollowers={c.youtube_followers ?? undefined}
            tiktokHandle={c.tiktok_handle ?? undefined}
            tiktokFollowers={c.tiktok_followers ?? undefined}
            soraHandle={c.sora2_handle ?? undefined}
            soraFollowers={c.sora2_followers ?? undefined}
            // no-nos from the extra query
            noNos={noNosByCreator[c.id] ?? []}
          />
        ))}
      </div>
    </main>
  );
}
