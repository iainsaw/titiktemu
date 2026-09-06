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
  // Scroll-driven header depth (Apple §12: materials respond to context)
  const [scrolled, setScrolled] = useState(false);
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

  // Scroll-driven glass depth: add deeper shadow when user has scrolled
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayName = user?.user_metadata?.display_name;
  const initials = user ? getInitials(user.email ?? "?", displayName) : "";

  return (
    <>
      {/*
       * Apple §12: Translucent nav as a floating functional layer.
       * glass-nav = backdrop-filter blur + semi-transparent bg.
       * glass-nav-scrolled adds deeper shadow when content scrolls under.
       * Apple §7: Enter and exit along the same path — header is sticky,
       * so it never disappears and doesn't need an enter animation.
       */}
      <header
        className={cn(
          "sticky top-0 z-40 glass-nav",
          scrolled && "glass-nav-scrolled"
        )}
      >
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
            {/*
             * Apple §1: Respond on pointer-down.
             * active:scale-[0.97] fires on :active (pointerdown) for instant tactile feel.
             */}
            <Link
              to="/peta"
              className="pill hidden bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground [transition:transform_100ms_ease-out,opacity_100ms_ease] supports-[selector(:hover)]:hover:opacity-90 active:scale-[0.97] active:transition-none sm:inline-block"
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
                        "flex items-center gap-1.5 rounded-xl px-2 py-1 transition-colors hover:bg-secondary/60 active:scale-[0.97] active:transition-none",
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
                      {/*
                       * Apple §7: Anchor interaction to its source.
                       * ChevronDown rotates in-place — same spatial position, different state.
                       * Spring-snappy easing for fast micro-animation.
                       */}
                      <ChevronDown
                        className="size-3.5 text-muted-foreground"
                        style={{
                          transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 250ms cubic-bezier(0.34, 1.2, 0.64, 1)",
                        }}
                      />
                    </button>

                    {/*
                     * Apple §7: Popover originates from the trigger (scale from top-right).
                     * Apple §3: Always animate from the presentation value.
                     * Using CSS animate-in utilities + scale origin for spatial anchoring.
                     */}
                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-[200ms] origin-top-right"
                        style={{ animationTimingFunction: "cubic-bezier(0.34, 1.2, 0.64, 1)" }}
                      >
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
                              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors active:scale-[0.98] active:transition-none"
                            >
                              <LayoutDashboard className="size-3.5" />
                              Dashboard Admin
                            </Link>
                          )}

                          <button
                            onClick={async () => { await signOut(); setDropdownOpen(false); }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors active:scale-[0.98] active:transition-none"
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
                    className="hidden lg:flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground active:scale-[0.97] active:transition-none"
                  >
                    <LogIn className="size-3.5" />
                    <span className="hidden sm:inline">Masuk</span>
                  </button>
                )}
              </>
            )}

            {/*
             * Apple §1: Hamburger responds instantly (icon swap on press).
             * Apple §3: Interruptible — user can open/close rapidly.
             */}
            <button
              type="button"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground/70 hover:text-foreground transition-colors active:scale-[0.92] active:transition-none lg:hidden"
            >
              {/*
               * Icon cross-dissolves between states.
               * Apple §3: Interruptible — the icon swaps immediately on press.
               */}
              <span
                style={{
                  display: "block",
                  transition: "opacity 150ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
                  opacity: mobileOpen ? 0 : 1,
                  transform: mobileOpen ? "rotate(90deg) scale(0.7)" : "rotate(0deg) scale(1)",
                  position: mobileOpen ? "absolute" : "relative",
                }}
              >
                <Menu className="size-[18px]" />
              </span>
              <span
                style={{
                  display: "block",
                  transition: "opacity 150ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
                  opacity: mobileOpen ? 1 : 0,
                  transform: mobileOpen ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.7)",
                  position: mobileOpen ? "relative" : "absolute",
                }}
              >
                <X className="size-[18px]" />
              </span>
            </button>
          </div>
        </div>

        {/*
         * Apple §3: Interruptible animation — CSS max-height transition instead
         * of conditional mount/unmount. Element stays in DOM so animation can
         * reverse mid-flight (open→close→open without waiting to finish).
         * Apple §9: Rubber-band feel via spring-gentle easing.
         * data-mobile-nav: reduced-motion hook in styles.css.
         */}
        <nav
          data-mobile-nav=""
          className="border-t border-border/30 lg:hidden overflow-hidden"
          style={{
            maxHeight: mobileOpen ? "480px" : "0px",
            opacity: mobileOpen ? 1 : 0,
            /*
             * Guide §5: Use --ease-drawer for sheet/drawer-like motion (iOS-style).
             * Collapse faster than expand — physical objects fall faster than they rise.
             */
            transition: mobileOpen
              ? "max-height 380ms var(--ease-drawer), opacity 250ms var(--ease-out)"
              : "max-height 260ms cubic-bezier(0.4, 0, 1, 1), opacity 180ms ease",
          }}
        >
          <div className="bg-background px-5 py-3">
            <ul className="space-y-0.5">
              {nav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    activeOptions={{ exact: item.to === "/" }}
                    className="block rounded-xl px-3 py-2.5 text-[15px] text-foreground/70 transition-colors hover:bg-secondary/60 active:bg-secondary/80 active:scale-[0.99]"
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
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[15px] font-medium text-foreground/70 transition-colors hover:bg-secondary/60 hover:text-foreground active:scale-[0.99]"
                  >
                    <LogIn className="size-4" />
                    Masuk
                  </button>
                </li>
              )}
            </ul>
          </div>
        </nav>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
