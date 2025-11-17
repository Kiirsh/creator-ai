// src/app/dashboard/inbox/[conversationId]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Conversation = {
  id: string;
  brand_id: string;
  creator_id: string;
  brand_name: string;
  creator_name: string;
  created_at: string;
};

export default function ThreadPage() {
  const params = useParams<{ conversationId: string }>();
  const convoId = params.conversationId;
  const router = useRouter();

  const [me, setMe] = useState<{ id: string; role?: "brand" | "creator" | null } | null>(null);
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typingPeers, setTypingPeers] = useState<string[]>([]);
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null); // for "Seen"

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherUserId = useMemo(() => {
    if (!me || !convo) return null;
    return me.id === convo.brand_id ? convo.creator_id : convo.brand_id;
  }, [me, convo]);

  const otherName = useMemo(() => {
    if (!me || !convo) return "";
    return me.id === convo.brand_id ? convo.creator_name : convo.brand_name;
  }, [me, convo]);

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  async function markReadAndBroadcast() {
    // Use server-time RPC to avoid clock skew
    await supabase.rpc("mark_conversation_read", { _conversation_id: convoId });
    // Tell header to refresh immediately
    const ui = supabase.channel("ui-read-refresh", { config: { broadcast: { self: true } } });
    await ui.send({ type: "broadcast", event: "read-update", payload: { conversation_id: convoId } });
    supabase.removeChannel(ui);
  }

  // Load auth, conversation meta, messages
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/signin");
        return;
      }

      // fetch my role for colors
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setMe({ id: user.id, role: (profile?.role as any) ?? null });

      // load convo (with names)
      const { data: convData } = await supabase
        .from("my_conversations")
        .select("*")
        .eq("id", convoId)
        .maybeSingle();

      setConvo(convData as any);

      // messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true });

      setMessages((msgs as any) || []);
      setTimeout(scrollToBottom, 0);

      // mark read now (server time) and broadcast
      await markReadAndBroadcast();

      // fetch other's last_read for "Seen" indicator
      if (convData) {
        const otherId =
          user.id === (convData as any).brand_id
            ? (convData as any).creator_id
            : (convData as any).brand_id;
        const { data: r } = await supabase
          .from("conversation_reads")
          .select("last_read_at")
          .eq("conversation_id", convoId)
          .eq("user_id", otherId)
          .maybeSingle();
        setOtherLastRead(r?.last_read_at ?? null);
      }
    })();
  }, [convoId, router]);

  // Update my last_read periodically while viewing (server time) and broadcast
  useEffect(() => {
    let interval: any;
    interval = setInterval(async () => {
      await markReadAndBroadcast();
    }, 5000);
    return () => interval && clearInterval(interval);
  }, [convoId]);

  // Also mark read when window gains focus (instant clear)
  useEffect(() => {
    const onFocus = async () => {
      await markReadAndBroadcast();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [convoId]);

  // Subscribe to new messages + other user's read updates
  useEffect(() => {
    const msgChannel = supabase
      .channel(`messages:convo:${convoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convoId}` },
        async (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(scrollToBottom, 50);

          // If the new message is from the other user and I'm active, mark as read quickly (server time)
          const m = payload.new as Message;
          const focused = document.visibilityState === "visible";
          if (focused && me?.id && m.sender_id !== me.id) {
            await markReadAndBroadcast();
          }
        }
      )
      // other user's last_read changes -> "Seen" indicator
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_reads", filter: `conversation_id=eq.${convoId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id && row.user_id !== me?.id) {
            setOtherLastRead(row.last_read_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [convoId, me?.id]);

  // Presence for typing indicator
  useEffect(() => {
    const channel = supabase.channel(`presence:convo:${convoId}`, {
      config: { presence: { key: me?.id || "anon" } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const typingIds: string[] = [];
      Object.values(state).forEach((arr: any) => {
        arr.forEach((meta: any) => {
          if (meta.user_id !== me?.id && meta.typing) typingIds.push(meta.user_id);
        });
      });
      setTypingPeers(typingIds);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: me?.id || "anon", typing: false });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [convoId, me?.id]);

  // Set typing true/false with debounce
  useEffect(() => {
    const channel = supabase.channel(`presence:convo:${convoId}`, {
      config: { presence: { key: me?.id || "anon" } },
    });

    const setTyping = async (value: boolean) => {
      await channel.track({ user_id: me?.id || "anon", typing: value });
    };

    const input = inputRef.current;
    if (!input) return;

    const onChange = () => {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 1200);
    };

    input.addEventListener("input", onChange);
    return () => {
      input.removeEventListener("input", onChange);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [convoId, me?.id]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !text.trim()) return;
    const body = text.trim();
    setText("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: convoId,
      sender_id: me.id,
      body,
    });

    if (error) alert(error.message);
  }

  // Compute "Seen" for the last message I sent
  const seen = useMemo(() => {
    if (!otherLastRead || !me) return false;
    const myLast = [...messages].reverse().find((m) => m.sender_id === me.id);
    if (!myLast) return false;
    return new Date(otherLastRead).getTime() >= new Date(myLast.created_at).getTime();
  }, [messages, otherLastRead, me]);

  // Bubble color based on my role (mine: blue for Brand, green for Creator; other: gray)
  const myBubbleClass =
    me?.role === "brand"
      ? "ml-auto bg-blue-600 text-white"
      : "ml-auto bg-emerald-600 text-white";
  const otherBubbleClass = "bg-neutral-800 text-white";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 h-[calc(100vh-5rem)]">
      {/* Left: thread */}
      <div className="flex flex-col h-full">
        <h1 className="text-xl font-semibold mb-2">Conversation</h1>
        {otherName ? <p className="text-white/60 mb-3">{otherName}</p> : null}

        {typingPeers.length > 0 && (
          <div className="mb-2 text-sm text-white/70">{otherName || "They"} is typing…</div>
        )}

        <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900 p-4 space-y-3">
          {messages.map((m) => {
            const mine = me && m.sender_id === me.id;
            return (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? myBubbleClass : otherBubbleClass}`}
                title={new Date(m.created_at).toLocaleString()}
              >
                {m.body}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Seen indicator */}
        <div className="h-5 text-right text-xs text-white/50 mt-1">
          {seen ? "Seen" : ""}
        </div>

        <form onSubmit={sendMessage} className="mt-2 flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit">Send</Button>
        </form>
      </div>

      {/* Right: booking sidebar (brand only) */}
      <aside className="hidden md:block">
        {me && convo && me.id === convo.brand_id && (
          <div className="rounded-xl border border-white/10 bg-neutral-900 p-4 sticky top-20">
            {/* Keep your RateCardPicker here if you added it earlier */}
            {/* <RateCardPicker creatorId={convo.creator_id} conversationId={convo.id} /> */}
          </div>
        )}
      </aside>
    </main>
  );
}
