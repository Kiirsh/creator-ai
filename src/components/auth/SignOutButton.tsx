"use client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/"); // send them home
      }}
    >
      Sign out
    </Button>
  );
}
