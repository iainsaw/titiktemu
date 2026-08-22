import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
const logoMark = { url: "/titik-temu-mark-v2.png" };

const nav = [
  { to: "/", label: "Beranda" },
  { to: "/peta", label: "Peta Interaktif" },
  { to: "/analisis", label: "Analisis & Perbandingan" },
  { to: "/survei", label: "Survei Lapangan" },
  { to: "/temudata", label: "TemuData AI" },
  { to: "/metodologi", label: "Metodologi" },
  { to: "/tim", label: "Tentang Tim" },
] as const;

export function SiteHeader({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("glass-nav sticky top-0 z-40 border-b border-border/60", variant === "sidebar" && "bg-transparent backdrop-blur-none border-border/30")}>
      <div className={cn(
        "mx-auto grid items-center gap-3 px-4 text-[12px] sm:px-5",
        variant === "sidebar" ? "h-14 grid-cols-[auto_1fr_auto]" : "h-16 max-w-[1180px] grid-cols-[minmax(0,auto)_1fr_auto] sm:h-14 lg:h-12"
      )}>
        <Link to="/" className="flex min-w-0 items-center gap-2 font-display text-[15px] font-semibold tracking-tight sm:text-[13px]">
          <img src={logoMark.url} alt="Logo Titik Temu" className="size-7 shrink-0 sm:size-5" />
          <span className="truncate">Titik Temu</span>
        </Link>


        <nav className={cn("hidden flex-1 items-center justify-center gap-5", variant === "sidebar" ? "hidden" : "lg:flex")}>
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap text-foreground/75 transition-opacity hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <Link
            to="/peta"
            className="pill hidden bg-primary px-3.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:inline-block"
          >
            Jelajahi Peta
          </Link>
          <button
            type="button"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 shrink-0 place-items-center rounded-md text-foreground sm:size-8 lg:hidden"
          >
            {open ? <X className="size-5 sm:size-4" /> : <Menu className="size-5 sm:size-4" />}
          </button>
        </div>

      </div>

      {open && (
        <nav className="border-t border-border/60 bg-background/95 px-5 py-3 lg:hidden">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: item.to === "/" }}
                  className="block rounded-md px-2 py-2 text-[14px] text-foreground/80 hover:bg-secondary"
                  activeProps={{ className: "bg-secondary text-foreground font-medium" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
