// src/lib/elevenlabs.ts
// Small server-only helper for ElevenLabs TTS.

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY || "";
if (!ELEVEN_API_KEY) {
  // don't throw at import time; we may not call TTS on every request
  console.warn("[elevenlabs] ELEVENLABS_API_KEY is not set");
}

export type VoiceSettings = {
  stability?: number;
  similarity_boost?: number;
  style?: number | null;
  use_speaker_boost?: boolean;
};

/**
 * Generate MP3 bytes from ElevenLabs TTS.
 */
export async function ttsToMp3Bytes(opts: {
  voiceId: string;
  text: string;
  modelId?: string; // default: eleven_multilingual_v2
  settings?: VoiceSettings;
}): Promise<Uint8Array> {
  const { voiceId, text, settings, modelId = "eleven_multilingual_v2" } = opts;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: settings?.stability ?? 0.6,
          similarity_boost: settings?.similarity_boost ?? 0.9,
          style: settings?.style ?? null,
          use_speaker_boost: settings?.use_speaker_boost ?? true,
        },
      }),
    }
  );

  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(
      `ElevenLabs TTS failed (${res.status}): ${msg || res.statusText}`
    );
  }

  const arrayBuf = await res.arrayBuffer();
  return new Uint8Array(arrayBuf);
}

async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
