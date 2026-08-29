import { Link } from "@tanstack/react-router";
import { Menu, X, LogIn, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
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

function getInitials(email: string, displayName?: string | null): string {
  if (displayName) {
    return displayName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin, loading, signOut } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.user_metadata?.display_name;
  const initials = user ? getInitials(user.email ?? "?", displayName) : "";

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-black border-b border-border/10">
        <div className="mx-auto flex h-11 max-w-[1180px] items-center justify-between gap-4 px-5 text-[13px] lg:grid lg:grid-cols-[auto_1fr_auto]">
          <Link to="/" className="flex flex-1 lg:flex-none items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
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

          <div className="flex flex-1 lg:flex-none items-center justify-end gap-2 lg:justify-self-end">
            <Link
              to="/peta"
              className="pill hidden bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:inline-block"
            >
              Jelajahi Peta
            </Link>

            {!loading && (
              <>
                {user ? (
                  /* User Avatar + Dropdown */
                  <div ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-2 py-1 transition-colors hover:bg-secondary/60",
                        dropdownOpen && "bg-secondary/60"
                      )}
                    >
                      <div className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        isAdmin
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40"
                          : "bg-primary/10 text-primary ring-1 ring-primary/30"
                      )}>
                        {initials}
                      </div>
                      <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="rounded-2xl border border-border/30 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden p-1.5">
                          {/* User Info */}
                          <div className="px-3 py-2 mb-1">
                            <p className="text-[12px] font-medium truncate">{displayName || user.email?.split("@")[0]}</p>
                            <p className="text-[11px] text-muted-foreground/60 truncate">{user.email}</p>
                            {isAdmin && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                ✦ Admin
                              </span>
                            )}
                          </div>

                          <div className="h-px bg-border/30 mb-1" />

                          {/* Admin Dashboard Link (only for admins) */}
                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            >
                              <LayoutDashboard className="size-3.5" />
                              Dashboard Admin
                            </Link>
                          )}

                          <button
                            onClick={async () => { await signOut(); setDropdownOpen(false); }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                          >
                            <LogOut className="size-3.5" />
                            Keluar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Sign In Button */
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="hidden lg:flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <LogIn className="size-3.5" />
                    <span className="hidden sm:inline">Masuk</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground/70 hover:text-foreground transition-colors lg:hidden"
            >
              {mobileOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-border/30 bg-background px-5 py-3 lg:hidden">
            <ul className="space-y-0.5">
              {nav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    activeOptions={{ exact: item.to === "/" }}
                    className="block rounded-xl px-3 py-2.5 text-[15px] text-foreground/70 transition-colors hover:bg-secondary/60"
                    activeProps={{ className: "bg-secondary/80 !text-foreground font-medium" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-[15px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    ✦ Dashboard Admin
                  </Link>
                </li>
              )}
              {!user && !loading && (
                <li className="mt-2 border-t border-border/30 pt-2">
                  <button
                    onClick={() => { setMobileOpen(false); setAuthModalOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[15px] font-medium text-foreground/70 transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    <LogIn className="size-4" />
                    Masuk
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
