"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

const OPTIONS = ["Politics","Adult","Mean stuff","Sports","News"] as const;
type NoNo = typeof OPTIONS[number];

export default function NoNosEditor() {
  const [me, setMe] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<NoNo>>(new Set());
  const [saving, setSaving] = useState(false);

  // load current user + selected tags
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);
      const { data } = await supabase
        .from("creator_no_nos")
        .select("tag")
        .eq("creator_id", user.id);
      const tags = new Set<NoNo>((data || []).map((r: any) => r.tag));
      setSelected(tags);
    })();
  }, []);

  const toggle = async (tag: NoNo) => {
    if (!me) return;
    setSaving(true);
    const currentlyOn = selected.has(tag);
    if (currentlyOn) {
      const { error } = await supabase
        .from("creator_no_nos")
        .delete()
        .eq("creator_id", me)
        .eq("tag", tag);
      if (!error) {
        const copy = new Set(selected);
        copy.delete(tag);
        setSelected(copy);
      } else {
        alert(error.message);
      }
    } else {
      const { error } = await supabase
        .from("creator_no_nos")
        .insert({ creator_id: me, tag });
      if (!error) {
        const copy = new Set(selected);
        copy.add(tag);
        setSelected(copy);
      } else {
        alert(error.message);
      }
    }
    setSaving(false);
  };

  const pills = useMemo(() => OPTIONS.map((opt) => {
    const on = selected.has(opt as NoNo);
    return (
      <button
        key={opt}
        type="button"
        onClick={() => toggle(opt as NoNo)}
        className={[
          "rounded-full px-3 py-1.5 text-sm border",
          on ? "bg-rose-600 text-white border-rose-500" : "bg-neutral-900 text-white/80 border-white/15 hover:border-white/30"
        ].join(" ")}
        disabled={saving}
        aria-pressed={on}
      >
        {opt}
      </button>
    );
  }), [selected, saving]);

  return (
    <div className="space-y-2">
      <div className="text-sm text-white/80">Pick what you won’t do:</div>
      <div className="flex flex-wrap gap-2">
        {pills}
      </div>
      {saving && <div className="text-xs text-white/50">Saving…</div>}
      <div className="text-xs text-white/50">
        These appear on your public profile under “My no-nos”.
      </div>
    </div>
  );
}
