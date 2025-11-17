import { Badge } from "@/components/ui/badge";

export function ReasonsChips({ reasons }: { reasons: string[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {reasons.map((r) => (
        <Badge
          key={r}
          className="rounded-full px-4 py-2 bg-neutral-900 text-white border border-white/10"
        >
          {r}
        </Badge>
      ))}
    </div>
  );
}
