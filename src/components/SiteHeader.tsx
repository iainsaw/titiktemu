import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
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

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto grid h-11 max-w-[1180px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 text-[13px]">
        <Link to="/" className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
          <img src={logoMark.url} alt="Logo Titik Temu" className="size-6 shrink-0" />
          <span className="hidden sm:inline">Titik Temu</span>
        </Link>

        <nav className="hidden items-center justify-center gap-5 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap text-foreground/55 transition-colors hover:text-foreground/90"
              activeProps={{ className: "!text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <Link
            to="/peta"
            className="pill hidden bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:inline-block"
          >
            Jelajahi Peta
          </Link>
          <button
            type="button"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground/70 hover:text-foreground transition-colors lg:hidden"
          >
            {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/30 bg-background/80 backdrop-blur-2xl px-5 py-3 lg:hidden">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: item.to === "/" }}
                  className="block rounded-xl px-3 py-2.5 text-[15px] text-foreground/70 transition-colors hover:bg-secondary/60"
                  activeProps={{ className: "bg-secondary/80 !text-foreground font-medium" }}
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
