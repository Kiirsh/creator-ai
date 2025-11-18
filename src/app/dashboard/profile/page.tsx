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
        // creators: details + socials + connect + add-on fields here
        const { data: c, error: cErr } = await supabase
          .from("creators")
          .select(
            "id, headline, base_rate_cents, " +
              "instagram_handle, instagram_followers, youtube_handle, youtube_followers, " +
              "tiktok_handle, tiktok_followers, sora2_handle, sora2_followers, " +
              "brand_usage_cents, post_tiktok_cents, " +
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

    // Save creator details + socials + add-on prices
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
    <main className="space-y-6">
      <div className="section-shell p-6 md:p-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Creator workspace</p>
          <h1 className="text-3xl font-semibold text-slate-900">Profile &amp; pricing</h1>
          <p className="text-sm text-muted-foreground">
            Keep your video offer up to date so brands know exactly what they’re booking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isCreator && (
            <span className="pill">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Video-first profile
            </span>
          )}
          <Button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="shadow-sm"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* LEFT: editor */}
        <section className="space-y-6">
          <form
            id="profile-form"
            onSubmit={onSave}
            className="section-shell p-6 space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Display name</label>
                <Input
                  value={profile.display_name ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, display_name: e.target.value })
                  }
                  placeholder="Your public name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Avatar</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPickAvatar}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? "Uploading…" : "Choose image"}
                  </Button>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border"
                    />
                  ) : null}
                </div>
              </div>

              {isCreator && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Headline</label>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Base rate (GBP)</label>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Brand usage add-on (GBP)</label>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Creator TikTok post (GBP)</label>
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
                </>
              )}

              {/* Socials (all bound to creator) */}
              {isCreator && (
                <div className="sm:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">Social reach</h3>
                    <span className="pill">Show on profile</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Instagram handle</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">YouTube handle</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Instagram followers</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">YouTube followers</label>
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">TikTok handle</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Sora 2 handle</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">TikTok followers</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Sora 2 followers</label>
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
              <section className="section-shell p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Rate cards</h2>
                    <p className="text-sm text-muted-foreground">Video prices shown to buyers. Audio is hidden elsewhere.</p>
                  </div>
                  <span className="pill">Video only</span>
                </div>
                <RateCardsEditor />
              </section>

              <section className="section-shell p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">My no-nos</h2>
                  <span className="pill">Buyer guidance</span>
                </div>
                <NoNosEditor />
              </section>

              {/* NEW: AI Voice preview section (private to the creator) */}
              {me && (
                <section className="section-shell p-6 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">AI Voice (preview)</h2>
                      <p className="text-sm text-muted-foreground">
                        Test your voice profiles and listen to short samples. This is private to you.
                      </p>
                    </div>
                    <span className="pill">Experimental</span>
                  </div>
                  <VoicePreview creatorId={me.id} />
                </section>
              )}
            </>
          )}

          {isCreator && me && (
            <section className="section-shell p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Get paid</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect Stripe to collect for every video booking.
                  </p>
                </div>
                <span className="pill">Payouts</span>
              </div>

              {isConnected ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>
                    Connected to Stripe (<code className="text-muted-foreground">{creator?.stripe_account_id}</code>). You’ll
                    receive payouts automatically.
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connect your Stripe account to receive payouts. You’ll be redirected to Stripe to complete onboarding.
                  </p>
                  <ConnectStripeButton creatorId={me.id} email={me.email ?? undefined} />
                </>
              )}
            </section>
          )}

          {/* Sticky bottom Save bar */}
          <div className="sticky bottom-4">
            <div className="gradient-border rounded-2xl bg-white p-3 shadow-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-700">Don’t forget to save your changes</div>
                <Button
                  type="submit"
                  form="profile-form"
                  disabled={saving}
                  className="px-5"
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: LIVE PREVIEW (single avatar — no duplicate image) */}
        <aside className="space-y-4">
          <div className="section-shell p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live preview</p>
                <h2 className="text-lg font-semibold text-slate-900">What buyers see</h2>
              </div>
              <span className="pill">Video only</span>
            </div>
            <ProfileHeader
              name={profile.display_name || "Your Name"}
              subtitle={creator?.headline || "Creator"}
              avatarUrl={profile.avatar_url || "/demo/creator.jpg"}
              verified={true}
            />
          </div>

          {/* Socials preview (from creator) */}
          <div className="section-shell p-5 space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Socials</h3>
            <div className="space-y-3 text-sm text-foreground">
              {creator?.instagram_handle ? (
                <div className="flex items-center gap-3">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">Instagram</span>
                    <div className="font-medium">{creator.instagram_handle}</div>
                    {creator.instagram_followers && (
                      <div className="text-xs text-muted-foreground">
                        {creator.instagram_followers.toLocaleString()} followers
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {creator?.youtube_handle ? (
                <div className="flex items-center gap-3">
                  <Youtube className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">YouTube</span>
                    <div className="font-medium">{creator.youtube_handle}</div>
                    {creator.youtube_followers && (
                      <div className="text-xs text-muted-foreground">
                        {creator.youtube_followers.toLocaleString()} subscribers
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {creator?.tiktok_handle ? (
                <div className="flex items-center gap-3">
                  <Music2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">TikTok</span>
                    <div className="font-medium">{creator.tiktok_handle}</div>
                    {creator.tiktok_followers && (
                      <div className="text-xs text-muted-foreground">
                        {creator.tiktok_followers.toLocaleString()} followers
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {creator?.sora2_handle ? (
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">Sora 2</span>
                    <div className="font-medium">{creator.sora2_handle}</div>
                    {creator.sora2_followers && (
                      <div className="text-xs text-muted-foreground">
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
                <div className="text-sm text-muted-foreground">No socials provided.</div>
              ) : null}
            </div>
          </div>

          {/* No-nos preview */}
          <div className="section-shell p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">My no-nos</h3>
              <span className="pill">Shared with buyers</span>
            </div>
            {noNos.length === 0 ? (
              <div className="text-sm text-muted-foreground">None selected.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {noNos.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-3 py-1.5 text-sm text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pricing preview */}
          <div className="section-shell p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Video pricing snapshot</h3>
              <span className="pill">Public</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-foreground">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Price</div>
                <div className="text-lg font-semibold">
                  {money(creator?.base_rate_cents || 0)}+
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Reviews</div>
                <div className="text-lg font-semibold">
                  <Link href="#reviews">⭐ 5.00 (170)</Link>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Availability</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Taking bookings</Badge>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
