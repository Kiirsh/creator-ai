export function isAudioLikeLabel(label: string | null | undefined) {
  const l = String(label || "").toLowerCase();
  const blockers = ["audio", "voice", "voiceover", "voice-over", "voice over"];
  return blockers.some((word) => l.includes(word));
}

