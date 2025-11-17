"use client";

import * as React from "react";

type Voice = {
  celebrity_voice_id: string;
  display_name: string | null;
  language_code: string | null;
};

export default function VoicePreview({ creatorId }: { creatorId: string }) {
  const [voices, setVoices] = React.useState<Voice[]>([]);
  const [voiceId, setVoiceId] = React.useState<string>("");
  const [script, setScript] = React.useState(
    "Hi, this is a quick Filmee voice test."
  );
  const [loading, setLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/voices/${creatorId}`);
      const json = await res.json();
      const list: Voice[] = json?.voices ?? [];
      setVoices(list);
      if (list.length && !voiceId) setVoiceId(list[0].celebrity_voice_id);
    })();
  }, [creatorId]);

  const doPreview = async () => {
    if (!voiceId || !script.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId,
          celebrityVoiceId: voiceId,
          scriptText: script,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Synthesis failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      alert(e?.message || "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          className="w-full rounded-md border border-white/15 bg-neutral-900 px-3 py-2 text-sm"
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
        >
          {voices.map((v) => (
            <option key={v.celebrity_voice_id} value={v.celebrity_voice_id}>
              {v.display_name || v.celebrity_voice_id}
              {v.language_code ? ` · ${v.language_code}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={doPreview}
          disabled={loading || !voiceId}
          className="rounded-md bg-white text-black px-3 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Synthesizing…" : "Preview"}
        </button>
      </div>

      <textarea
        className="w-full min-h-28 rounded-md border border-white/15 bg-neutral-900 px-3 py-2 text-sm"
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />

      <audio ref={audioRef} controls className="w-full" />
    </div>
  );
}
