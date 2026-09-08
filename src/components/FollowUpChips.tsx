import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowUpChipsProps {
  chips: string[];
  onSelect: (chip: string) => void;
  loading?: boolean;
  className?: string;
}

/**
 * Menampilkan 2–3 pertanyaan follow-up di bawah respons AI.
 * Tampilan minimal: plain text, tanpa pill/border/icon.
 */
export function FollowUpChips({
  chips,
  onSelect,
  loading = false,
  className,
}: FollowUpChipsProps) {
  if (loading) {
    return (
      <div className={cn("mt-3 flex flex-col gap-1.5", className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-muted/50"
            style={{ width: `${140 + i * 40}px` }}
          />
        ))}
      </div>
    );
  }

  if (chips.length === 0) return null;

  return (
    <div className={cn("mt-3 flex flex-col gap-1", className)}>
      {chips.map((chip, i) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="w-fit text-left text-[13px] text-muted-foreground underline-offset-2 transition-colors duration-150 hover:text-primary active:opacity-60 active:transition-none"
        >
          ↳ {chip}
        </button>
      ))}
    </div>
  );
}
