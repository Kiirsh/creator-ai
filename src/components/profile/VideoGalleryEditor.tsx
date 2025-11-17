// src/components/profile/VideoGalleryEditor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Row = {
  id: string;
  creator_id: string;
  title: string | null;
  video_url: string;
  thumb_url: string | null;
};

const MAX_MB = 50; // guard: skip files that exceed ~50MB
const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export default function VideoGalleryEditor() {
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const posterRef = useRef<HTMLInputElement | null>(null);
  const [debugUid, setDebugUid] = useState<{ client?: string | null; db?: string | null }>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);
      setDebugUid((d) => ({ ...d, client: user.id }));

      // whoami() — confirms Postgres sees same uid
      try {
        const { data: who } = await supabase.rpc("whoami");
        setDebugUid((d) => ({ ...d, db: (who as string) || null }));
        console.log("whoami():", who, "client uid:", user.id);
      } catch (e) {
        console.warn("whoami() RPC failed", e);
      }

      // Make sure creators row exists (FK)
      await ensureCreatorRow(user.id);

      await loadRows(user.id);
    })();
  }, []);

  async function ensureCreatorRow(userId: string) {
    const { data: existing, error: readErr } = await supabase
      .from("creators")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (readErr) {
      toast.error("Couldn’t check creator profile", { description: readErr.message });
      return;
    }
    if (!existing) {
      const { error } = await supabase.from("creators").insert({ id: userId });
      if (error) {
        toast.error("Couldn’t prepare your creator profile", { description: error.message });
      }
    }
  }

  async function loadRows(creatorId: string) {
    const { data, error } = await supabase
      .from("creator_videos")
      .select("*")
      .eq("creator_id", creatorId)
      .order("inserted_at", { ascending: false });
    if (error) {
      toast.error("Couldn’t load videos", { description: error.message });
      return;
    }
    setRows((data as Row[]) || []);
  }

  function validateFile(file: File, label: string) {
    // size
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_MB) {
      throw new Error(`${label} is ${mb.toFixed(1)}MB. Max allowed is ${MAX_MB}MB.`);
    }
    // mime
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error(`${label} type ${file.type || "(unknown)"} not allowed.`);
    }
  }

  async function onUpload() {
    if (!me) return;
    const videoFile = fileRef.current?.files?.[0];
    const posterFile = posterRef.current?.files?.[0] || null;

    if (!videoFile) {
      toast.message("Pick a video first");
      return;
    }

    try {
      validateFile(videoFile, "Video");
      if (posterFile) validateFile(posterFile, "Poster");
    } catch (err: any) {
      toast.error("Invalid file", { description: err.message });
      return;
    }

    setUploading(true);
    console.time("upload-total");
    try {
      // 1) Upload video
      const videoPath = `${me}/${crypto.randomUUID()}_${videoFile.name}`;
      console.time("upload-video");
      const upVid = await supabase.storage
        .from("creator_videos")
        .upload(videoPath, videoFile, {
          upsert: false,
          cacheControl: "3600",
          contentType: videoFile.type,
        });
      console.timeEnd("upload-video");
      console.log("upload video result:", upVid);

      if (upVid.error) throw upVid.error;
      if (!upVid.data?.path) throw new Error("Upload returned no path (video).");

      const videoUrl = supabase.storage.from("creator_videos").getPublicUrl(videoPath).data.publicUrl;
      if (!videoUrl) throw new Error("Couldn’t resolve public URL (video).");

      // 2) Upload poster (optional)
      let thumbUrl: string | null = null;
      if (posterFile) {
        const posterPath = `${me}/${crypto.randomUUID()}_${posterFile.name}`;
        console.time("upload-poster");
        const upPoster = await supabase.storage
          .from("creator_videos")
          .upload(posterPath, posterFile, {
            upsert: false,
            cacheControl: "3600",
            contentType: posterFile.type,
          });
        console.timeEnd("upload-poster");
        console.log("upload poster result:", upPoster);

        if (upPoster.error) throw upPoster.error;
        if (!upPoster.data?.path) throw new Error("Upload returned no path (poster).");

        thumbUrl = supabase.storage.from("creator_videos").getPublicUrl(posterPath).data.publicUrl;
        if (!thumbUrl) throw new Error("Couldn’t resolve public URL (poster).");
      }

      // 3) Refresh session just in case
      await supabase.auth.refreshSession();

      // 4) Insert DB row (RLS requires auth.uid() = creator_id)
      const payload = {
        creator_id: me,
        title: title || null,
        video_url: videoUrl,
        thumb_url: thumbUrl,
      };
      console.log("DB insert payload:", payload);
      const { error: insErr } = await supabase.from("creator_videos").insert(payload);
      if (insErr) throw insErr;

      // Reset
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      if (posterRef.current) posterRef.current.value = "";

      await loadRows(me);
      toast.success("Video added to your profile");
    } catch (e: any) {
      console.error("Upload error:", e);
      toast.error("Upload failed", { description: e?.message || String(e) });
    } finally {
      console.timeEnd("upload-total");
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this video from your profile?")) return;
    const { error } = await supabase.from("creator_videos").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
      return;
    }
    if (me) await loadRows(me);
    toast.message("Video removed");
  }

  const remaining = Math.max(0, 3 - rows.length);

  return (
    <div className="space-y-4">
      {(debugUid.client || debugUid.db) && (
        <div className="text-xs text-white/50">
          uid (client): {debugUid.client || "—"} &nbsp;|&nbsp; uid (db): {debugUid.db || "—"}
        </div>
      )}

      <div className="text-sm text-white/80">
        Upload up to <strong>3</strong> short preview videos (MP4/WebM). Max {MAX_MB}MB per file.
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl overflow-hidden border border-white/10 bg-neutral-900">
            <video
              controls
              preload="metadata"
              poster={r.thumb_url || undefined}
              className="w-full aspect-[4/5] object-cover bg-black"
              src={r.video_url}
            />
            <div className="p-3 flex items-center justify-between">
              <div className="truncate text-sm">{r.title || "Untitled"}</div>
              <Button variant="ghost" onClick={() => onDelete(r.id)} className="text-red-300 hover:text-red-200">
                Delete
              </Button>
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <div className="rounded-xl border border-dashed border-white/15 p-3 bg-neutral-900">
            <div className="space-y-2">
              <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input ref={fileRef} type="file" accept="video/mp4,video/webm" />
              <input ref={posterRef} type="file" accept="image/*" />
              <div className="text-xs text-white/50">Slots remaining: {remaining}</div>
              <Button onClick={onUpload} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload video"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
