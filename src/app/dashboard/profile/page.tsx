// src/app/dashboard/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RateCardsEditor from "@/components/profile/RateCardsEditor";
import NoNosEditor from "@/components/profile/NoNosEditor";
import { toast } from "sonner";
import ConnectStripeButton from "@/components/payments/ConnectStripeButton";
import VoicePreview from "@/components/voice/VoicePreview";

// Preview pieces
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/currency";
import { Instagram, Youtube, Music2, Sparkles, CheckCircle2 } from "lucide-react";

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "brand" | "creator" | null;
};

type CreatorRow = {
  id: string;
  headline: string | null;
  base_rate_cents: number | null;

  // socials
  instagram_handle: string | null;
  instagram_followers: number | null;
  youtube_handle: string | null;
  youtube_followers: number | null;
  tiktok_handle: string | null;
  tiktok_followers: number | null;
  sora2_handle: string | null;
  sora2_followers: number | null;

  // add-on pricing (GBP, stored as cents)
  brand_usage_cents: number | null;
  post_tiktok_cents: number | null;

  // AI audio per-character price (GBP, stored as cents)
  audio_char_rate_cents: number | null;

  // connect
  stripe_account_id?: string | null;
};

// Exact projection we select from the DB
type CreatorSelect = Pick<
  CreatorRow,
  | "id"
  | "headline"
  | "base_rate_cents"
  | "instagram_handle"
  | "instagram_followers"
  | "youtube_handle"
  | "youtube_followers"
  | "tiktok_handle"
  | "tiktok_followers"
  | "sora2_handle"
  | "sora2_followers"
  | "brand_usage_cents"
  | "post_tiktok_cents"
  | "audio_char_rate_cents"
  | "stripe_account_id"
>;

export default function ProfileSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<{ id: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [creator, setCreator] = useState<CreatorRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [noNos, setNoNos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Load current user + profile + creator + no-nos
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/signin");
        return;
      }
      setMe({ id: user.id, email: user.email });

      // profiles: only basic public fields
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role")
        .eq("id", user.id)
        .maybeSingle();
      if (pErr) {
        toast.error("Couldn’t load profile", { description: pErr.message });
        return;
      }
      const prof = (p as ProfileRow) || null;
      setProfile(prof);

      if (prof?.role === "creator") {
        // creators: details + socials + connect + add-on + audio fields here
        const { data: c, error: cErr } = await supabase
          .from("creators")
          .select(
            "id, headline, base_rate_cents, " +
              "instagram_handle, instagram_followers, youtube_handle, youtube_followers, " +
              "tiktok_handle, tiktok_followers, sora2_handle, sora2_followers, " +
              "brand_usage_cents, post_tiktok_cents, audio_char_rate_cents, " +
              "stripe_account_id"
          )
          .eq("id", user.id)
          .maybeSingle<CreatorSelect>();
        if (cErr) {
          toast.error("Couldn’t load creator settings", {
            description: cErr.message,
          });
          return;
        }

        // Build a full CreatorRow from the partial selection (with sensible fallbacks)
        const row: CreatorRow = {
          id: user.id,
          headline: c?.headline ?? "",
          base_rate_cents: c?.base_rate_cents ?? 0,
          instagram_handle: c?.instagram_handle ?? null,
          instagram_followers: c?.instagram_followers ?? 0,
          youtube_handle: c?.youtube_handle ?? null,
          youtube_followers: c?.youtube_followers ?? 0,
          tiktok_handle: c?.tiktok_handle ?? null,
          tiktok_followers: c?.tiktok_followers ?? 0,
          sora2_handle: c?.sora2_handle ?? null,
          sora2_followers: c?.sora2_followers ?? 0,
          brand_usage_cents: c?.brand_usage_cents ?? null,
          post_tiktok_cents: c?.post_tiktok_cents ?? null,
          audio_char_rate_cents: c?.audio_char_rate_cents ?? null,
          stripe_account_id: c?.stripe_account_id ?? null,
        };
        setCreator(row);

        const { data: nn } = await supabase
          .from("creator_no_nos")
          .select("tag")
          .eq("creator_id", user.id)
          .order("tag");
        setNoNos(((nn as any) || []).map((r: any) => r.tag));
      } else {
        setCreator(null);
        setNoNos([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // If returning from Stripe onboarding (?onboarding=return), refresh creator + show toast
  useEffect(() => {
    const onboardReturn = searchParams.get("onboarding");
    if (!onboardReturn || onboardReturn !== "return") return;

    (async () => {
      if (!me) return;

      type CreatorStripeBits = Pick<CreatorRow, "id" | "stripe_account_id">;

      const { data: c } = await supabase
        .from("creators")
        .select("id, stripe_account_id")
        .eq("id", me.id)
        .maybeSingle<CreatorStripeBits>();

      if (c) {
        setCreator((prev) =>
          prev ? { ...prev, stripe_account_id: c.stripe_account_id ?? null } : prev
        );
      }
      toast.success("Stripe onboarding complete", {
        description: c?.stripe_account_id
          ? "Your account is connected. You can now receive payouts."
          : "If you didn’t finish, you can resume Stripe onboarding anytime.",
      });

      // Clean the URL
      const clean = new URL(window.location.href);
      clean.searchParams.delete("onboarding");
      window.history.replaceState({}, "", clean.toString());
    })();
  }, [searchParams, me]);

  // Keep preview no-nos live
  useEffect(() => {
    const ch = supabase
      .channel("profile-no-nos", { config: { broadcast: { self: true } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "creator_no_nos" },
        async () => {
          if (!me) return;
          const { data: nn } = await supabase
            .from("creator_no_nos")
            .select("tag")
            .eq("creator_id", me.id)
            .order("tag");
          setNoNos(((nn as any) || []).map((r: any) => r.tag));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me?.id]);

  async function onSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!me || !profile) return;
    setSaving(true);

    // Save profile basics
    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      })
      .eq("id", me.id);
    if (pErr) {
      toast.error("Couldn’t save profile", { description: pErr.message });
      setSaving(false);
      return;
    }

    // Save creator details + socials + add-on + audio prices
    if (creator) {
      const {
        headline,
        base_rate_cents,
        instagram_handle,
        instagram_followers,
        youtube_handle,
        youtube_followers,
        tiktok_handle,
        tiktok_followers,
        sora2_handle,
        sora2_followers,
        brand_usage_cents,
        post_tiktok_cents,
        audio_char_rate_cents,
      } = creator;

      const { error: cErr } = await supabase
        .from("creators")
        .update({
          headline,
          base_rate_cents: base_rate_cents ?? 0,
          instagram_handle,
          instagram_followers: instagram_followers ?? 0,
          youtube_handle,
          youtube_followers: youtube_followers ?? 0,
          tiktok_handle,
          tiktok_followers: tiktok_followers ?? 0,
          sora2_handle,
          sora2_followers: sora2_followers ?? 0,
          brand_usage_cents: brand_usage_cents ?? null,
          post_tiktok_cents: post_tiktok_cents ?? null,
          audio_char_rate_cents: audio_char_rate_cents ?? null,
        })
        .eq("id", me.id);

      if (cErr) {
        toast.error("Couldn’t save creator details", {
          description: cErr.message,
        });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success("Saved!", { description: "Your profile was updated." });
  }

  async function onPickAvatar() {
    if (!fileRef.current?.files?.[0] || !me) return;
    const file = fileRef.current.files[0];
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${me.id}/avatar.${ext}`;

    setAvatarUploading(true);
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });
    if (upErr) {
      toast.error("Upload failed", { description: upErr.message });
      setAvatarUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    const url = publicUrl.publicUrl;

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", me.id);

    if (!pErr) {
      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
      toast.success("Avatar updated");
    } else {
      toast.error("Couldn’t save avatar URL", { description: pErr.message });
    }
    setAvatarUploading(false);
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p className="text-white/70">Loading…</p>
      </main>
    );
  }

  const isCreator = profile.role === "creator";
  const isConnected = Boolean(creator?.stripe_account_id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* LEFT: editor */}
      <section className="space-y-8">
        <h1 className="text-2xl font-semibold">Profile</h1>

        <form
          id="profile-form"
          onSubmit={onSave}
          className="rounded-2xl border border-white/10 p-4 space-y-4 bg-neutral-900"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Display name</label>
              <Input
                value={profile.display_name ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, display_name: e.target.value })
                }
                placeholder="Your public name"
              />
            </div>

            <div>
              <label className="text-sm">Avatar</label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickAvatar}
                />
                <Button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? "Uploading…" : "Upload image"}
                </Button>
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="h-10 w-10 rounded-full object-cover border border-white/10"
                  />
                ) : null}
              </div>
            </div>

            {isCreator && (
              <>
                <div>
                  <label className="text-sm">Headline</label>
                  <Input
                    value={creator?.headline ?? ""}
                    onChange={(e) =>
                      setCreator((c) =>
                        c ? { ...c, headline: e.target.value } : c
                      )
                    }
                    placeholder="e.g. UGC creator • Lifestyle"
                  />
                </div>
                <div>
                  <label className="text-sm">Base rate (GBP)</label>
                  <Input
                    type="number"
                    min={0}
                    value={(creator?.base_rate_cents ?? 0) / 100}
                    onChange={(e) => {
                      const pounds = Number(e.target.value) || 0;
                      setCreator((c) =>
                        c
                          ? { ...c, base_rate_cents: Math.round(pounds * 100) }
                          : c
                      );
                    }}
                  />
                </div>

                {/* NEW: Add-on prices (GBP) */}
                <div>
                  <label className="text-sm">Brand usage add-on (GBP)</label>
                  <Input
                    type="number"
                    min={0}
                    value={
                      creator?.brand_usage_cents == null
                        ? ""
                        : (creator.brand_usage_cents || 0) / 100
                    }
                    onChange={(e) => {
                      const pounds = Number(e.target.value);
                      setCreator((c) =>
                        c
                          ? {
                              ...c,
                              brand_usage_cents: isNaN(pounds)
                                ? null
                                : Math.max(0, Math.round(pounds * 100)),
                            }
                          : c
                      );
                    }}
                    placeholder="e.g. 200"
                  />
                </div>
                <div>
                  <label className="text-sm">Creator TikTok post (GBP)</label>
                  <Input
                    type="number"
                    min={0}
                    value={
                      creator?.post_tiktok_cents == null
                        ? ""
                        : (creator.post_tiktok_cents || 0) / 100
                    }
                    onChange={(e) => {
                      const pounds = Number(e.target.value);
                      setCreator((c) =>
                        c
                          ? {
                              ...c,
                              post_tiktok_cents: isNaN(pounds)
                                ? null
                                : Math.max(0, Math.round(pounds * 100)),
                            }
                          : c
                      );
                    }}
                    placeholder="e.g. 150"
                  />
                </div>

                {/* NEW: AI Audio price (per character, GBP) */}
                <div>
                  <label className="text-sm">AI Audio price (per character, GBP)</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      creator?.audio_char_rate_cents == null
                        ? ""
                        : (creator.audio_char_rate_cents || 0) / 100
                    }
                    onChange={(e) => {
                      const pounds = Number(e.target.value);
                      setCreator((c) =>
                        c
                          ? {
                              ...c,
                              audio_char_rate_cents: isNaN(pounds)
                                ? null
                                : Math.max(0, Math.round(pounds * 100)),
                            }
                          : c
                      );
                    }}
                    placeholder="e.g. 0.05 (i.e. 5p per char)"
                  />
                </div>
              </>
            )}

            {/* Socials (all bound to creator) */}
            {isCreator && (
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Instagram handle</label>
                    <Input
                      placeholder="@handle"
                      value={creator?.instagram_handle ?? ""}
                      onChange={(e) =>
                        setCreator((c) =>
                          c ? { ...c, instagram_handle: e.target.value } : c
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">YouTube handle</label>
                    <Input
                      placeholder="@channel"
                      value={creator?.youtube_handle ?? ""}
                      onChange={(e) =>
                        setCreator((c) =>
                          c ? { ...c, youtube_handle: e.target.value } : c
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">Instagram followers</label>
                    <Input
                      type="number"
                      min={0}
                      value={creator?.instagram_followers ?? 0}
                      onChange={(e) =>
                        setCreator((c) =>
                          c
                            ? {
                                ...c,
                                instagram_followers:
                                  Number(e.target.value) || 0,
                              }
                            : c
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">YouTube followers</label>
                    <Input
                      type="number"
                      min={0}
                      value={creator?.youtube_followers ?? 0}
                      onChange={(e) =>
                        setCreator((c) =>
                          c
                            ? {
                                ...c,
                                youtube_followers: Number(e.target.value) || 0,
                              }
                            : c
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm">TikTok handle</label>
                    <Input
                      placeholder="@yourtiktok"
                      value={creator?.tiktok_handle ?? ""}
                      onChange={(e) =>
                        setCreator((c) =>
                          c ? { ...c, tiktok_handle: e.target.value } : c
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">Sora 2 handle</label>
                    <Input
                      placeholder="@sora2"
                      value={creator?.sora2_handle ?? ""}
                      onChange={(e) =>
                        setCreator((c) =>
                          c ? { ...c, sora2_handle: e.target.value } : c
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">TikTok followers</label>
                    <Input
                      type="number"
                      min={0}
                      value={creator?.tiktok_followers ?? 0}
                      onChange={(e) =>
                        setCreator((c) =>
                          c
                            ? {
                                ...c,
                                tiktok_followers: Number(e.target.value) || 0,
                              }
                            : c
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">Sora 2 followers</label>
                    <Input
                      type="number"
                      min={0}
                      value={creator?.sora2_followers ?? 0}
                      onChange={(e) =>
                        setCreator((c) =>
                          c
                            ? {
                                ...c,
                                sora2_followers: Number(e.target.value) || 0,
                              }
                            : c
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Creator-only editors below the main form */}
        {isCreator && (
          <>
            <section className="rounded-2xl border border-white/10 p-4 bg-neutral-900">
              <h2 className="text-lg font-semibold mb-3">Rate cards</h2>
              <RateCardsEditor />
            </section>

            <section className="rounded-2xl border border-white/10 p-4 bg-neutral-900">
              <h2 className="text-lg font-semibold mb-3">My no-nos</h2>
              <NoNosEditor />
            </section>

            {/* NEW: AI Voice preview section (private to the creator) */}
            {me && (
              <section className="rounded-2xl border border-white/10 p-4 bg-neutral-900">
                <h2 className="text-lg font-semibold mb-2">AI Voice (preview)</h2>
                <p className="text-sm text-white/70 mb-3">
                  Test your voice profiles and listen to short samples. This is private to you.
                </p>
                <VoicePreview creatorId={me.id} />
              </section>
            )}
          </>
        )}

        {isCreator && me && (
          <section className="rounded-2xl border border-white/10 p-4 bg-neutral-900">
            <h2 className="text-lg font-semibold mb-2">Get paid</h2>

            {isConnected ? (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span>
                  Connected to Stripe (<code className="text-white/60">{creator?.stripe_account_id}</code>). You’ll
                  receive payouts automatically.
                </span>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/70 mb-3">
                  Connect your Stripe account to receive payouts. You’ll be redirected to Stripe to complete onboarding.
                </p>
                <ConnectStripeButton creatorId={me.id} email={me.email ?? undefined} />
              </>
            )}
          </section>
        )}

        {/* Sticky bottom Save bar */}
        <div className="sticky bottom-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-pink-600 to-fuchsia-600 shadow-xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-white/90 text-sm">
                Don’t forget to save your changes
              </div>
              <Button
                type="submit"
                form="profile-form"
                disabled={saving}
                className="bg-white text-black hover:bg-white/90"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT: LIVE PREVIEW (single avatar — no duplicate image) */}
      <aside className="space-y-4">
        <h2 className="text-lg font-semibold">Live preview</h2>

        <ProfileHeader
          name={profile.display_name || "Your Name"}
          subtitle={creator?.headline || "Creator"}
          avatarUrl={profile.avatar_url || "/demo/creator.jpg"}
          verified={true}
        />

        {/* Socials preview (from creator) */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
          <h3 className="font-medium mb-3">Socials</h3>
          <div className="space-y-3 text-sm text-white/80">
            {creator?.instagram_handle ? (
              <div className="flex items-center gap-3">
                <Instagram className="h-4 w-4 text-white/80" />
                <div>
                  <span className="text-white/60 text-xs">Instagram</span>
                  <div className="font-medium">{creator.instagram_handle}</div>
                  {creator.instagram_followers && (
                    <div className="text-white/60 text-xs">
                      {creator.instagram_followers.toLocaleString()} followers
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {creator?.youtube_handle ? (
              <div className="flex items-center gap-3">
                <Youtube className="h-4 w-4 text-white/80" />
                <div>
                  <span className="text-white/60 text-xs">YouTube</span>
                  <div className="font-medium">{creator.youtube_handle}</div>
                  {creator.youtube_followers && (
                    <div className="text-white/60 text-xs">
                      {creator.youtube_followers.toLocaleString()} subscribers
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {creator?.tiktok_handle ? (
              <div className="flex items-center gap-3">
                <Music2 className="h-4 w-4 text-white/80" />
                <div>
                  <span className="text-white/60 text-xs">TikTok</span>
                  <div className="font-medium">{creator.tiktok_handle}</div>
                  {creator.tiktok_followers && (
                    <div className="text-white/60 text-xs">
                      {creator.tiktok_followers.toLocaleString()} followers
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {creator?.sora2_handle ? (
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-white/80" />
                <div>
                  <span className="text-white/60 text-xs">Sora 2</span>
                  <div className="font-medium">{creator.sora2_handle}</div>
                  {creator.sora2_followers && (
                    <div className="text-white/60 text-xs">
                      {creator.sora2_followers.toLocaleString()} followers
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {!creator?.instagram_handle &&
            !creator?.youtube_handle &&
            !creator?.tiktok_handle &&
            !creator?.sora2_handle ? (
              <div className="text-white/60 text-sm">No socials provided.</div>
            ) : null}
          </div>
        </div>

        {/* No-nos preview */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
          <div className="text-sm font-medium mb-2">My no-nos</div>
          {noNos.length === 0 ? (
            <div className="text-sm text-white/60">None selected.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {noNos.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1.5 text-sm border bg-neutral-900 text-white/80 border-white/15"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pricing preview */}
        <div className="rounded-3xl bg-neutral-900 text-white p-5 md:p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/90">
            <div>
              <div className="text-xs uppercase text-white/50">Price</div>
              <div className="text-lg font-semibold">
                {money(creator?.base_rate_cents || 0)}+
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-white/50">Reviews</div>
              <div className="text-lg font-semibold">
                <Link href="#reviews">⭐ 5.00 (170)</Link>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-white/50">Availability</div>
              <div className="text-lg font-semibold">
                <Badge className="bg-green-400/20 text-green-300 mr-2">
                  Taking bookings
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
