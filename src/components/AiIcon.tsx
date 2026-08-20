const aiStar = { url: "/titik-temu-ai-star.png" };
import { cn } from "@/lib/utils";

/** Ikon AI resmi Titik Temu — dipakai untuk semua fitur AI. */
export function AiIcon({ className }: { className?: string }) {
  return (
    <img
      src={aiStar.url}
      alt=""
      aria-hidden
      className={cn("size-4 shrink-0 object-contain", className)}
    />
  );
}
