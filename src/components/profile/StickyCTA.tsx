// src/components/profile/StickyCTA.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import StartConversationButton from "@/components/chat/StartConversationButton";

export function StickyCTA({ creatorId }: { creatorId: string }) {
  const router = useRouter();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-neutral-950/70 backdrop-blur border-t border-white/10 p-3 md:hidden">
      <div className="mx-auto max-w-screen-sm grid grid-cols-2 gap-2">
        <StartConversationButton creatorId={creatorId} className="bg-neutral-800 text-white">
          Message
        </StartConversationButton>
        <Button
          onClick={() => router.push(`/purchase/${creatorId}`)}
          className="bg-black text-white"
        >
          Buy video
        </Button>
      </div>
    </div>
  );
}
